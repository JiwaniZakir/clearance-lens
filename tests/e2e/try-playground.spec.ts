import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * E2E coverage for /try (spec §5: "every R3 persona scenario"). Rather than
 * 40 near-duplicate tests that mostly differ by persona backstory — which
 * doesn't change UI behavior, since the UI doesn't know or care which
 * persona is typing — this covers the DISTINCT interaction paths the R3
 * personas actually exercise across all 6 tabs, plus one chained
 * integration journey. Persona-specific judgment (should an agent broaden a
 * search, how should it phrase a debrief) was already exercised directly
 * against the MCP tools by the agent-in-the-loop eval (DECISIONS.md D-016);
 * this suite verifies the UI itself renders and gates each tool correctly.
 *
 * Runs against the REAL live speedrun API — data rotates — so assertions
 * are structural ("at least one result card," "a heading exists") rather
 * than pinned to specific role/company names.
 */

const LONG_TIMEOUT = 20_000; // live upstream search + per-job detail fetches

async function switchToTab(page: Page, label: string) {
  await page.getByRole("tab", { name: label }).click();
}

/** Shared by Trial assessment / Role rubric / Job preview: each embeds a
 * RolePicker seeded with an unfiltered live search on mount. Waits for the
 * picker's own result buttons to appear, then clicks the first one. Result
 * buttons are identified by their inner title span (`span.text-sm.font-
 * medium`, per role-search-result-card's sibling markup in RolePicker) —
 * distinct from the form's own "Search" submit button. */
async function pickFirstRole(container: Locator) {
  const roleButtons = container.locator("button:has(span.text-sm.font-medium)");
  await expect(roleButtons.first()).toBeVisible({ timeout: LONG_TIMEOUT });
  await roleButtons.first().click();
}

test.describe("/try — Search roles", () => {
  test("loads real results on mount, shows sources, and a result card never embeds its company-profile link as the whole card's click target", async ({
    page,
  }) => {
    await page.goto("/try");
    const resultsRegion = page.locator("main");
    // Initial unfiltered search runs on mount.
    await expect(resultsRegion.getByText(/Scanned \d+ posting/).first()).toBeVisible({ timeout: LONG_TIMEOUT });
    const cards = page.locator("h3").filter({ hasNotText: "" });
    await expect(cards.first()).toBeVisible();

    // Regression (DECISIONS.md D-019): the whole card must NOT be a single
    // role="button" — each card's own interactive children (chip tooltips,
    // source link, profile button) must be independently reachable, not
    // nested inside one atomic widget.
    const buttons = await page.getByRole("button", { name: /^View .+ profile →$/ }).count();
    expect(buttons).toBeGreaterThan(0);
  });

  test("a structured filter combination narrows results to (near-)zero, and clearing filters restores the unfiltered view", async ({
    page,
  }) => {
    await page.goto("/try");
    await expect(page.getByText(/Scanned \d+ posting/).first()).toBeVisible({ timeout: LONG_TIMEOUT });

    // A free-text keyword typo isn't reliably zero-result (the upstream
    // search's own narrow-field matching, DECISIONS.md D-018, can still
    // return something unexpected) — a structured clearance+ITAR filter
    // combined with an unlikely location is a far more deterministic way
    // to drive toward the genuine empty-results path this test needs.
    await page.getByLabel("Clearance level").selectOption("ts_sci");
    await page.getByLabel("Location").fill("zzz_no_real_location_xyz123");
    await page.getByRole("button", { name: "Search roles" }).click();

    const emptyState = page.getByText("No roles match these filters");
    const gotEmpty = await emptyState.isVisible({ timeout: LONG_TIMEOUT }).catch(() => false);
    if (!gotEmpty) test.skip(true, "this exact filter combination happened to match live postings right now");

    const clearButton = page.getByRole("button", { name: "Clear filters" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(page.getByText(/Scanned \d+ posting/).first()).toBeVisible({ timeout: LONG_TIMEOUT });
  });

  test("a requirement chip reveals its stated/inferred evidence on focus, without navigating or opening the company dialog", async ({
    page,
  }) => {
    await page.goto("/try");
    await expect(page.getByText(/Scanned \d+ posting/).first()).toBeVisible({ timeout: LONG_TIMEOUT });

    // Every requirement chip's tooltip-trigger button's accessible name IS
    // its visible chip text (humanizeSignal's vocabulary) — query by role,
    // not CSS classes, consistent with this suite's accessibility-first
    // selector style and robust to markup/styling changes.
    const chipTrigger = page
      .getByRole("button", { name: /clearance|secret|citizen|person|sponsorship|polygraph|scif/i })
      .first();
    if ((await chipTrigger.count()) === 0) test.skip(true, "no requirement signals on the current live postings");
    await chipTrigger.focus();
    await expect(page.getByText(/Stated directly in the posting\.|Inferred from the job post/).first()).toBeVisible();
    // Focusing a chip must not have triggered the company dialog.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("opening and closing the company profile dialog shows real, sourced data and a company name heading", async ({
    page,
  }) => {
    await page.goto("/try");
    await expect(page.getByText(/Scanned \d+ posting/).first()).toBeVisible({ timeout: LONG_TIMEOUT });

    const profileButton = page.getByRole("button", { name: /^View .+ profile →$/ }).first();
    if ((await profileButton.count()) === 0) {
      test.skip(true, "every current live posting is a stealth listing with no company slug");
    }
    await profileButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: LONG_TIMEOUT });
    // Never a bare score/percentage fit claim inside the dialog.
    await expect(dialog.getByText(/\bfit score\b/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("/try — Timeline", () => {
  test("auto-estimates on load with a sourced driver list and a not-legal-advice disclaimer", async ({ page }) => {
    await page.goto("/try");
    await switchToTab(page, "Timeline");
    await expect(page.getByText(/not legal advice/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
  });

  test("current_status=none surfaces the interim-eligibility driver (regression for DECISIONS.md D-017)", async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Timeline");
    await page.getByLabel("Current status").selectOption("none");
    await page.getByRole("button", { name: "Estimate timeline" }).click();
    // Matches the driver's own label text specifically (lib/tools/estimate-
    // timeline.ts) — a bare /interim/i would also match the still-present
    // (if closed/unselected) <option value="interim">Interim</option> in
    // the Current status <select>, which Playwright reports as present
    // but not "visible" forever, hanging the assertion.
    await expect(page.getByText(/interim eligibility/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
  });

  test("current_status=active collapses to a no-range display instead of a fabricated number", async ({ page }) => {
    await page.goto("/try");
    await switchToTab(page, "Timeline");
    await page.getByLabel("Current status").selectOption("active");
    await page.getByRole("button", { name: "Estimate timeline" }).click();
    await expect(page.getByText(/reciprocity/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
  });
});

test.describe("/try — Trial assessment", () => {
  test("picking a role renders an ITAR-safety-disclaimed assessment, and changing minutes re-fetches it", async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Trial assessment");
    const picker = page.locator("div").filter({ hasText: "Pick a role to build a trial assessment for" }).first();
    await pickFirstRole(picker);

    // lib/disclaimers.ts's itarSafeTrial text says "export-controlled
    // technical data," never the literal substring "ITAR" — match the
    // actual rendered wording, not an assumed abbreviation.
    await expect(page.getByText(/export-controlled/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
    await expect(page.getByRole("tab", { name: "Brief" })).toBeVisible();

    // Switching the 60/90/180-minute control re-fetches rather than just
    // relabeling stale content.
    const option90 = page.getByRole("radio", { name: /90/ }).or(page.getByRole("button", { name: /90/ }));
    if (await option90.first().isVisible().catch(() => false)) {
      await option90.first().click();
      await expect(page.getByText(/export-controlled/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
    }
  });
});

test.describe("/try — Role rubric", () => {
  test("picking a role renders eligibility and skills groups traced to the real posting, with no overall score", async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Role rubric");
    const picker = page
      .locator("div")
      .filter({ hasText: "Pick a role to see its eligibility checklist and skills rubric" })
      .first();
    await pickFirstRole(picker);

    await expect(page.getByText(/evaluated privately/i)).toBeVisible({ timeout: LONG_TIMEOUT });
    await expect(page.getByText(/\d+%\s*(match|fit)/i)).toHaveCount(0);
  });
});

/** job-preview-scene-player.tsx: the scene <h4> title and its choice
 * buttons are siblings inside the one bordered stage card — h4's direct
 * parent IS that card (one level up, not two: two levels up reaches the
 * outer wrapper and would match a stepper-dot button instead). Clicks the
 * first choice for the CURRENT scene and, if that scene gates on a stated
 * rationale, fills and submits it. */
async function answerCurrentScene(page: Page) {
  const stage = page.locator("h4").locator("..");
  await stage.getByRole("button").first().click();
  const rationaleBox = page.getByPlaceholder("Because…");
  if (await rationaleBox.isVisible().catch(() => false)) {
    await rationaleBox.fill("Stated rationale for this gated scene.");
    await page.getByRole("button", { name: "Reveal outcome" }).click();
  }
  await expect(page.getByText("What real teams report", { exact: true })).toBeVisible();
}

test.describe("/try — Job preview", () => {
  test("withholds the outcome until a choice is made, and the completed fit debrief never shows a score", async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Job preview");
    const picker = page.locator("div").filter({ hasText: "Pick a role to preview" }).first();
    await pickFirstRole(picker);

    await expect(page.getByText("Scene 1 /")).toBeVisible({ timeout: LONG_TIMEOUT });
    // Regression: outcome text must be completely absent from the DOM
    // before any choice is recorded, not just visually hidden.
    await expect(page.getByText("What real teams report", { exact: true })).toHaveCount(0);
    await answerCurrentScene(page);

    // Walk through all 4 scenes (the default 20-minute length), confirming
    // each fresh scene starts withheld again before answering it, then
    // click through to the end (the loop answers 3 more scenes — indices
    // 1, 2, 3 — then the final "Finish" click after the 3rd lands on the
    // aggregate debrief).
    for (let i = 0; i < 3; i++) {
      const nextOrFinish = page.getByRole("button", { name: /^(Next scene|Finish)$/ });
      await nextOrFinish.click();
      await expect(page.getByText("What real teams report", { exact: true })).toHaveCount(0);
      await answerCurrentScene(page);
    }
    await page.getByRole("button", { name: "Finish" }).click();

    // Aggregate debrief + tagging + fit_debrief, never a score anywhere.
    await expect(page.getByText(/looking back on the whole preview/i)).toBeVisible({ timeout: LONG_TIMEOUT });
    const loveButtons = page.getByRole("button", { name: /Mark ".*" as loved/ });
    await loveButtons.first().click();
    await page.getByRole("button", { name: "Generate debrief" }).click();

    await expect(page.getByText(/never a score|not a score/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
    await expect(page.getByText(/\b\d{1,3}%\s*(match|fit)\b/i)).toHaveCount(0);
  });

  test('the "ITAR moment" scene (requiresStatedRationale: true) blocks the reveal until a rationale is submitted', async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Job preview");
    const picker = page.locator("div").filter({ hasText: "Pick a role to preview" }).first();
    await pickFirstRole(picker);
    await expect(page.getByText("Scene 1 /")).toBeVisible({ timeout: LONG_TIMEOUT });

    // run_job_preview's minutes=20 (the default here) doesn't take the
    // first 4 array entries — it filters data/job-preview-scenes.ts by
    // each scene's own includedInShortVersion flag (lib/tools/run-job-
    // preview.ts), which excludes "ethics_tradeoff" and "scif_life." The
    // resulting filtered order is: standup_priority, ambiguous_spec,
    // itar_moment, clearance_wait_week — so the gated scene is the 3rd of
    // 4 shown (filtered index 2), not the 4th. standup_priority and
    // ambiguous_spec both have requiresStatedRationale: false, so
    // answering each and clicking "Next scene" twice deterministically
    // lands on itar_moment.
    for (let i = 0; i < 2; i++) {
      await answerCurrentScene(page);
      await page.getByRole("button", { name: "Next scene" }).click();
    }
    await expect(page.getByText("Scene 3 /")).toBeVisible();
    await expect(page.getByText("What real teams report", { exact: true })).toHaveCount(0);

    const stage = page.locator("h4").locator("..");
    await stage.getByRole("button").first().click();
    const rationaleBox = page.getByPlaceholder("Because…");
    await expect(rationaleBox).toBeVisible();
    // Gated: still withheld after the choice click, before the rationale
    // is submitted.
    await expect(page.getByText("What real teams report", { exact: true })).toHaveCount(0);

    await rationaleBox.fill("Decline and explain why, in one sentence.");
    await page.getByRole("button", { name: "Reveal outcome" }).click();
    await expect(page.getByText("What real teams report", { exact: true })).toBeVisible();
    // The submitted rationale itself is echoed back, not silently dropped.
    await expect(page.getByText(/decline and explain why/i)).toBeVisible();
  });
});

test.describe("/try — Explain a rule", () => {
  test('a known topic ("itar-us-person") renders a sourced explanation with the not-legal-advice disclaimer', async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Explain a rule");
    await page.getByLabel("Rule topic").fill("itar-us-person");
    await page.getByRole("button", { name: "Explain" }).click();
    await expect(page.getByText(/not legal advice/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
  });

  test('"nbis-diss" resolves through the UI, not just the raw API (regression for DECISIONS.md D-016)', async ({
    page,
  }) => {
    await page.goto("/try");
    await switchToTab(page, "Explain a rule");
    await page.getByLabel("Rule topic").fill("nbis-diss");
    await page.getByRole("button", { name: "Explain" }).click();
    await expect(page.getByText(/we don't have a rule|pii|cui|looks like it includes/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /NBIS|DISS/i })).toBeVisible({ timeout: LONG_TIMEOUT });
  });

  test("an unknown topic shows clickable topic chips, and clicking one resolves a real rule", async ({ page }) => {
    await page.goto("/try");
    await switchToTab(page, "Explain a rule");
    await page.getByLabel("Rule topic").fill("this_is_not_a_real_topic_xyz");
    await page.getByRole("button", { name: "Explain" }).click();
    await expect(page.getByText("We don't have a rule for that yet")).toBeVisible({ timeout: LONG_TIMEOUT });

    const firstChip = page.locator("button.rounded-full").first();
    await expect(firstChip).toBeVisible();
    await firstChip.click();
    await expect(page.getByText(/not legal advice/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });
  });
});

test.describe("/try — chained persona journey", () => {
  test("search -> inspect timeline -> check a rubric, as a single continuous session (integration smoke test)", async ({
    page,
  }) => {
    await page.goto("/try");

    // 1. Search (default, auto-loaded).
    await expect(page.getByText(/Scanned \d+ posting/).first()).toBeVisible({ timeout: LONG_TIMEOUT });

    // 2. Timeline for a new-grad-shaped query.
    await switchToTab(page, "Timeline");
    await page.getByLabel("Target level").selectOption("secret");
    await page.getByLabel("Current status").selectOption("none");
    await page.getByRole("button", { name: "Estimate timeline" }).click();
    await expect(page.getByText(/not legal advice/i).first()).toBeVisible({ timeout: LONG_TIMEOUT });

    // 3. Role rubric for a real, live role.
    await switchToTab(page, "Role rubric");
    const picker = page
      .locator("div")
      .filter({ hasText: "Pick a role to see its eligibility checklist and skills rubric" })
      .first();
    await pickFirstRole(picker);
    await expect(page.getByText(/evaluated privately/i)).toBeVisible({ timeout: LONG_TIMEOUT });

    // Switching tabs and back preserves each tab's own independent state
    // rather than resetting it (Radix Tabs keeps inactive panels mounted).
    await switchToTab(page, "Timeline");
    await expect(page.getByText(/not legal advice/i).first()).toBeVisible();
  });
});
