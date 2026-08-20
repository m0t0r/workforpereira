"use client";

import { createAuthClient } from "better-auth/react";

/**
 * The browser half of Better Auth — sign-in, password reset, sign-out.
 *
 * **Signup does not go through this.** ADR-0007's ordering writes `persons` and its `consents` rows
 * before the `users` row, in one transaction, and that ordering is only observable server-side. A
 * client calling `signUp.email()` directly would create the account first, which is the precise
 * art. 9 failure the whole design exists to prevent. `/signup` posts to a Server Action instead, and
 * this file deliberately does not re-export `signUp`.
 *
 * No `baseURL`: the client defaults to the current origin, which is right in every environment and
 * cannot be wrong the way a build-time constant can. The *server* sets its base URL explicitly
 * (`appUrl()`), because that one is what an emailed link points back at.
 */
export const authClient = createAuthClient();
