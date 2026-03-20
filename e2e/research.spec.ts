import { test, expect } from "@playwright/test";

test.describe("Research / Intelligence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@lacasastudio.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Entrar")');
  });

  test("should search channels", async ({ page }) => {
    await page.goto("/research");
    await page.fill('input[placeholder*="nicho"]', "dark history");
    await page.click('button:has-text("🔍")');
    await page.waitForTimeout(5000);
  });

  test("should load niches tab", async ({ page }) => {
    await page.goto("/research");
    await page.click('button:has-text("Nichos")');
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).not.toContainText("Algo deu errado");
  });

  test("should open pipeline", async ({ page }) => {
    await page.goto("/pipeline");
    await expect(page.locator("text=Pipeline")).toBeVisible();
    await expect(page.locator("text=Nicho & Estilo")).toBeVisible();
  });
});
