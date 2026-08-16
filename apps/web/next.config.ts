import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // ADR-0022: the app ships as a container to Fly. Standalone traces the module graph and emits a
  // server carrying only what it reaches, so the runtime image needs no install and no package
  // manager. Without this the Dockerfile has nothing to copy.
  output: "standalone",
};

export default nextConfig;
