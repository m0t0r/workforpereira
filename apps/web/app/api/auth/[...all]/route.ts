import { getAuth } from "@/src/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth's own endpoints: `/api/auth/sign-in/email`, `/api/auth/verify-email`,
 * `/api/auth/request-password-reset`, and the rest.
 *
 * **Not a seam** (ADR-0017): it imports `next/*` and it is adaptation over a library. What is tested
 * is what sits underneath — the `signUp` use case, and the module functions it calls.
 *
 * `getAuth()` is called **per request** rather than at module scope, so the instance stays lazily
 * built. That is not fussiness: `getAuth()` reads `BETTER_AUTH_SECRET` and throws when it is unset,
 * and `next build` loads every route's module graph to prerender — so a module-scope call would fail
 * a CI build that has no secrets, over a route nobody prerenders. The instance is cached, so the
 * second request onward pays nothing.
 */
export function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}
