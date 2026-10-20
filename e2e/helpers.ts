import type { Page } from "@playwright/test";

/** Signs in through the E2E credentials provider (only registered when E2E_AUTH=1 outside production). */
export async function signInAsE2EUser(page: Page) {
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  const res = await page.request.post("/api/auth/callback/e2e", {
    form: { csrfToken, callbackUrl: "/dashboard" },
  });
  if (!res.ok()) throw new Error(`E2E sign-in failed: ${res.status()}`);
}
