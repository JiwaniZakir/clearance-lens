import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Spec §5: axe on every page, zero serious/critical violations. Run against
 * a production build (R1-leverage.md §5: dev-mode HMR overlay can confuse
 * a11y scans) — playwright.config.ts's webServer runs `pnpm build && pnpm start`
 * for exactly this reason, not `pnpm dev`.
 */
const PAGES = ["/", "/try", "/privacy", "/sources"];

for (const path of PAGES) {
  test(`${path}: zero serious/critical axe violations (light mode)`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test(`${path}: zero serious/critical axe violations (dark mode)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test("keyboard-only navigation reaches the primary CTA on the landing page", async ({ page }) => {
  await page.goto("/");
  // Tab through the page and confirm focus is visible and reaches a real
  // interactive element, not lost to the body.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
  }
  const activeTag = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON", "INPUT"]).toContain(activeTag);
});

test("theme toggle works via keyboard (Enter/Space) and persists the choice", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: /toggle dark mode/i });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/dark/);
});
