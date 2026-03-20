import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=LaCasaStudio")).toBeVisible();
  });

  test("should login with credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@lacasastudio.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should reject wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "wrong@test.com");
    await page.fill('input[type="password"]', "wrong");
    await page.click('button:has-text("Entrar")');
    await expect(page.locator("text=Credenciais inválidas")).toBeVisible();
  });
});
