import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@lacasastudio.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL("/");
  });

  const pages = [
    ["/planner", "Planner"],
    ["/storyboard", "Storyboard"],
    ["/research", "Inteligência"],
    ["/pipeline", "Pipeline"],
    ["/roteiro", "Roteiro"],
    ["/thumbs", "Thumbnail"],
    ["/hooks", "Hooks"],
    ["/seo", "SEO"],
    ["/analytics", "Analytics"],
    ["/preditor", "Preditor"],
    ["/monetizar", "Monetização"],
    ["/repurpose", "Repurpose"],
    ["/shorts", "Shorts"],
    ["/analyzer", "Analisador"],
    ["/ideas", "Ideias"],
    ["/settings", "Configurações"],
  ];

  for (const [path, text] of pages) {
    test(`should navigate to ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText("Algo deu errado");
    });
  }
});
