import { test, expect } from "@playwright/test";

test("public landing page is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /know exactly what is still blocking delivery/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /start workspace/i })).toBeVisible();
});
