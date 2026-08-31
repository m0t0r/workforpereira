# syntax=docker/dockerfile:1

# Debian slim, not Alpine. `docker-compose.yml` already rejected musl for Postgres on locale
# grounds; for Node the reason differs but points the same way — Next.js ships native SWC binaries
# built against glibc, and the musl variants are the less-travelled path.
#
# Pinned by digest as well as version, matching how `docker-compose.yml` pins Postgres to an exact
# patch. A floating `node:24-slim` would make "one artifact, promoted" false at the layer that
# carries the whole runtime OS: the same commit would build a different image tomorrow, and no
# record would say which base a given release shipped — which is the question a CVE forces.
FROM node:24.20.0-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Non-interactive pnpm. Without it, `pnpm install` stops on the "modules directories will be removed
# and reinstalled" confirmation, which auto-answers in a non-TTY and then exits having installed
# nothing — leaving `turbo` missing a layer later, with no error.
ENV CI=true
# pnpm's store defaults to ~/.local/share/pnpm/store, not $PNPM_HOME. Naming it explicitly is what
# lets the BuildKit cache mount below actually hit it.
ENV npm_config_store_dir="/pnpm/store"
RUN corepack enable

# ---- builder ------------------------------------------------------------------------------------
# One stage, and a cache mount rather than a separate fetch stage. The pnpm-recommended
# `pnpm fetch` + `--offline` split needs the store to survive between two stages, which a BuildKit
# cache mount does not reliably do; the mount alone keeps the expensive part — the downloads —
# warm across builds, which is the benefit that was actually wanted.
FROM base AS builder
WORKDIR /repo

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# No DATABASE_URL, deliberately. `packages/db/src/client.ts` builds its pool lazily precisely so a
# build that never queries succeeds without one — which is what keeps a database credential out of
# the image build entirely.
RUN pnpm exec turbo run build --filter=web

# ---- runner -------------------------------------------------------------------------------------
# **From the base image, not from `base`.** Extending `base` would replay `corepack enable` and ship
# pnpm's shims in the runtime image, which is the opposite of what the traced standalone output is
# for: an RCE in the Next server would find a working package manager and a network fetch path
# waiting for it. The package managers Node's own image bundles are removed for the same reason —
# `server.js` needs the runtime, never the installer.
FROM node:24.20.0-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runner
WORKDIR /app

# yarn is removed alongside npm because Node's Debian image installs it separately, under /opt with
# symlinks in /usr/local/bin — so removing the npm tree alone leaves a working package manager
# behind and makes the claim above false.
RUN rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v* \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  /usr/local/bin/yarn /usr/local/bin/yarnpkg

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Bind all interfaces: Fly routes to the machine's private address, and Next's default of localhost
# would answer only itself.
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` emits a server carrying only the modules the build traced, so nothing is
# installed here. In a workspace it preserves the repo layout, which is why the entrypoint is nested
# under `apps/web`.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
