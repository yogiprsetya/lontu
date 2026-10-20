import { expect, test } from "@playwright/test";
import { signInAsE2EUser } from "./helpers";

test("redirects to /login without a session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Masuk dengan Google" })).toBeVisible();
});

test("signed-in user sees the shell and can log out", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile";
  await signInAsE2EUser(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

  const bottomNav = page.locator("nav.fixed");
  const sidebar = page.locator("aside");
  if (isMobile) {
    await expect(bottomNav).toBeVisible();
    await expect(sidebar).toBeHidden();
    for (const slot of await bottomNav.locator("a, button").all()) {
      const box = await slot.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  } else {
    await expect(sidebar).toBeVisible();
    await expect(bottomNav).toBeHidden();
  }

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);

  await page.getByRole("button", { name: "Tambah transaksi" }).click();
  await page.getByRole("menuitem", { name: "Expense" }).click();
  await expect(page).toHaveURL(/\/add\/expense$/);
  await expect(page.getByRole("heading", { name: "Tambah Expense", level: 1 })).toBeVisible();

  if (isMobile) {
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
  } else {
    await page.getByRole("button", { name: "Logout" }).click();
  }
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
