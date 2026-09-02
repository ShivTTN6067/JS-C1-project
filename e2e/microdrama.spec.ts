import { test, expect } from "@playwright/test";

test.describe("Micro Drama web experience", () => {
  test("shows the hybrid experience picker then Micro Drama home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Choose your experience" })).toBeVisible();
    await page.getByRole("button", { name: /Micro Drama/i }).click();
    await expect(page).toHaveURL(/\/md/);
    await expect(page.getByText(/Trending Micro Dramas|Romance|Continue Watching/)).toBeVisible();
  });

  test("sends guests to login when they open a series", async ({ page }) => {
    await page.goto("/md");
    await page.getByText("Midnight Alley").first().click();
    await expect(page.getByRole("heading", { name: "Log in to watch" })).toBeVisible();
    await page.getByRole("link", { name: /Log in \/ Register/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
