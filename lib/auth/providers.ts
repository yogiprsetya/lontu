import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

type Env = { E2E_AUTH?: string; NODE_ENV?: string };

export const E2E_USER = { id: "test-e2e", email: "e2e@example.test", name: "E2E" } as const;

export function isE2EAuthEnabled(env: Env): boolean {
  return env.E2E_AUTH === "1" && env.NODE_ENV !== "production";
}

/** Google only, plus a credential-less test login for Playwright when E2E auth is enabled outside production. */
export function buildProviders(env: Env): Provider[] {
  const providers: Provider[] = [Google];
  if (isE2EAuthEnabled(env)) {
    providers.push(
      Credentials({
        id: "e2e",
        name: "E2E",
        credentials: {},
        authorize: () => ({ ...E2E_USER }),
      }),
    );
  }
  return providers;
}
