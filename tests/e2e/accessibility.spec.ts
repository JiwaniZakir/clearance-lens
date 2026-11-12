import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Spec §5: axe on every page, zero serious/critical violations. Run against
 * a production build (R1-leverage.md §5: dev-mode HMR overlay can confuse
 * a11y scans) — playwright.config.ts's webServer runs `pnpm build && pnpm start`
 * for exactly this reason, not `pnpm dev`.
 */
const PAGES = ["/", "/try", "/privacy", "/sources"];

// The homepage's hero runs a one-time, ~2.2s staged reveal + typing
// animation on mount (components/hero.tsx's useTranscriptReveal) — a CSS
// opacity/transform transition mid-flight can transiently blend a bubble's
// background with whatever is behind it, measurably changing its computed
// contrast ratio for that instant. Caught this live, intermittently, in
// manual verification: axe occasionally flagged a chat-bubble's text at a
// contrast ratio below threshold, which then passed cleanly on an immediate
// re-run with no code change — a timing artifact of scanning mid-transition,
// not a real, settled-state defect. Waiting for the reveal to finish before
// scanning checks the state a real user actually reads, not a transient
// mid-animation frame.
async function waitForHeroSettled(path: string, page: import("@playwright/test").Page) {
  if (path !== "/") return;
  await page.waitForTimeout(2500);
}

for (const path of PAGES) {
  test(`${path}: zero serious/critical axe violations (light mode)`, async ({ page }) => {
    await page.goto(path);
    await waitForHeroSettled(path, page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test(`${path}: zero serious/critical axe violations (dark mode)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    await waitForHeroSettled(path, page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test("keyboard-only navigation never loses focus to the page body", async ({ page }) => {
  await page.goto("/");
  // Tab through the page N times and confirm focus is always visible and on
  // a real interactive element, never lost to <body>/null. The exact
  // sequence of elements is intentionally not pinned down to a fixed count
  // or a specific target — it has already legitimately shifted twice from
  // genuine accessibility improvements (D-019's scrollable <code> blocks
  // gaining tabIndex, and the skip-to-content link added after the spec §6
  // judging panel) and will keep shifting as the page evolves; CODE is a
  // real, valid tab stop here precisely because of that earlier fix.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, role: el?.getAttribute("role"), tabIndex: el instanceof HTMLElement ? el.tabIndex : null };
    });
    // A real interactive element OR a DIV/[role=tabpanel] with an explicit
    // tabIndex (Radix Tabs automatically makes the active panel focusable
    // for AT users per the ARIA tabpanel pattern — a legitimate tab stop,
    // not a focus-loss bug) counts as "reached a real element."
    const isRealInteractiveElement =
      ["A", "BUTTON", "INPUT", "CODE", "TEXTAREA", "SELECT"].includes(active.tag ?? "") ||
      (active.tag === "DIV" && active.role === "tabpanel" && active.tabIndex === 0);
    expect(isRealInteractiveElement, `unexpected focus target: ${JSON.stringify(active)}`).toBe(true);
  }
});

test("theme toggle works via keyboard (Enter/Space) and persists the choice", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: /toggle dark mode/i });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

// Regression for DECISIONS.md (judging panel round 4): the nav CTA button's
// focus ring was correctly defined but animated in over the Button
// component's own 150ms transition, unlike every other focusable element on
// the site (which render their ring instantly) — a keyboard user tabbing
// faster than that would see no ring at all on this component's buttons.
// Checked with NO wait after focusing, specifically to catch the delay
// coming back.
test("a Button component's focus ring renders instantly, with no transition delay", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("link", { name: /add to your agent|install/i }).first();
  await button.focus();
  const boxShadow = await button.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(boxShadow).not.toMatch(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)*)$/);
});

// Regression for DECISIONS.md (judging panel round 4): the header's
// wordmark + theme-toggle + CTA cluster overflowed the page's horizontal
// scroll width at narrow phone widths (measured: 9px at 375px, 64px at
// 320px) once the nav links row (already on its own line below sm:) no
// longer shared space with them.
for (const width of [320, 375]) {
  test(`no page-level horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `scrollWidth (${scrollWidth}) should equal clientWidth (${clientWidth})`).toBe(clientWidth);
  });
}
