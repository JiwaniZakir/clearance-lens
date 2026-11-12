# Changelog

All notable changes to Clearance Lens, in reverse chronological order. Conventional-commit style entries.

## [Unreleased]

### feat
- All 11 MCP tools implemented, registered, and live-tested via both `/mcp` (real `@modelcontextprotocol/client`) and `/api/tools/*`.
- 3 MCP resources (`rules`, `timelines`, `disclaimers`) and 3 MCP prompts (`check_my_eligibility`, `prep_for_role`, `preview_the_job`).
- `lib/guard/pii.ts`: deterministic PII/CUI detector, 75 unit test cases.
- `lib/speedrun/*`, `lib/github/client.ts`: typed API clients with retry/backoff, verified live.
- Phase R research (5 reports + gate review) complete; `data/rules.json`/`data/timelines.json` populated with real, cited content.

### fix
- Speedrun client now retries transient 5xx, not just 429 (D-006).
- `lib/speedrun/types.ts`: removed a type-level lie (`SpeedrunJobDetail` inheriting a `cohort` field it doesn't have) and widened `company_slug`/`company_url` to nullable for stealth postings (D-008).
- `lib/guard/pii.ts`: SSN detection now also catches the dotted separator format (D-008).

### chore
- Scaffold Next.js 16 App Router project (TypeScript strict, Tailwind v4, ESLint).
- Disable Cache Components (D-001); pin Node engines (D-002); security headers in `next.config.ts`.

## [Unreleased] — web app, hardening, and deployment (2026-11-11 – 2026-11-12)

### feat
- The full web app shipped: `/` (landing, install snippets for 6 client types, FAQ), `/try` (all 11 tools playable live across 6 tabs — Search roles, Timeline, Trial assessment, Role rubric, Job preview, Explain a rule), `/privacy`, `/sources`.
- `app/mcp/route.ts`: explicit CORS wrapper + `OPTIONS` export (D-012) — `createMcpHandler` doesn't add this by default, and no prior Node-client smoke test could have caught it (CORS is browser-only).
- Deployed to production via Vercel's Git integration (`https://clearance-lens.vercel.app`, auto-deploying every push to `main`).
- Judging panel protocol frozen (`panel/protocol.md`) and its executor (`panel/run-round.workflow.js`) written, reviewed, and refined pre-freeze (D-024) before round 1.

### fix
- `lib/guard/pii.ts`: `CLEARANCE_RECORD_CONTEXT` was rejecting bare mentions of "diss"/"nbis"/"jpas" with no surrounding context — made the product's own central trust rule (`nbis-diss`) permanently unreachable through `explain_rule`, found by the agent-in-the-loop eval (D-016). Also: 5 PII-guard bypasses found and fixed by a dedicated red-team pass — Unicode lookalikes, short base64, ROT13, percent-encoding, a fail-open depth limit (D-013); a scoped `extraGuard` hook added to `prepare_consented_card` for PII split across sibling fields (D-014, resolves BLOCKERS.md B-001).
- `estimate_timeline`: a zero-history caller (`current_status: "none"`) never saw interim-eligibility content, since it lived behind a `current_status === "interim"` check a zero-history caller can never honestly pass (D-017).
- `lib/speedrun/infer.ts`: requirement-excerpt extraction bled into unrelated adjacent bullets when a posting used newline-separated lists without trailing periods (D-017); a "citizen, national, or lawful permanent resident" disjunction was misclassified as the narrower citizen-only requirement instead of the broader US-person test (D-017).
- `search_defense_roles`: a zero-result query (very common for a specific company name, given the upstream search's narrow field matching) returned a bare empty list with no guidance — now explains why and suggests a fix (D-018).
- `get_company_profile`: `compRangeObserved` mixed different `comp_period` units (hour/week/year) into one meaningless min/max — now annualizes first and excludes rather than guesses at an unconfirmed unit (D-019).
- Two real accessibility bugs found via Playwright + axe against a production build: a result card was `role="button"` while containing its own focusable children, both an axe violation and a live event-bubbling bug (D-019); several `overflow-x-auto` scroll regions had no `tabIndex`, failing axe's `scrollable-region-focusable` rule (D-019).
- Two heading-order bugs found via Lighthouse: `/try` and `/sources` both jumped from their one `<h1>` straight to `<h3>`s with no `<h2>, dinging the accessibility score even though axe's serious/critical gate didn't catch it (moderate-impact rule) (D-020).
- `scripts/linkcheck.ts`'s own retry logic could downgrade a legitimate bot-block/auth-required signal to a false FAIL depending on which retry attempt happened to throw last (D-021).
- `playwright.config.ts`: `pnpm start -- -p ${PORT}` broke on this pnpm version (forwards a literal `--` into `next start`, which then misparses `-p` as a positional argument) — no Playwright test had ever run against a production build before this fix (D-019).
- A stuck shared dev server (HMR reload loop breaking all client-side hydration) diagnosed and restarted (D-019).

### test
- Agent-in-the-loop persona eval (spec §5): 4 fresh agents, one per R3 persona, each holding a private profile and connecting a real MCP client to the live server — 40 scenarios, found the `nbis-diss` and `estimate_timeline` bugs above (D-016/D-017).
- `tests/e2e/try-playground.spec.ts`: the Playwright persona-scenario suite covering every distinct interactive path across all 6 `/try` tabs plus a chained multi-tab journey (D-022).
- `tests/e2e/accessibility.spec.ts`: axe on all 4 pages × 2 themes × 2 viewports, keyboard navigation, theme-toggle-via-keyboard — zero serious/critical violations.
- Lighthouse CI wired up and run against production: 100/100/100/100 (performance/accessibility/best-practices/seo) on every page (D-020, D-023).
- Full production smoke test: all 11 tools, CORS, the protocol conformance suite, and the full E2E suite all re-verified against the live deployed URL, not just local builds (D-023).
- `estimate-timeline.test.ts` and `explain-rule.test.ts` added — the first two tools built had never had a dedicated unit test file, only live smoke tests (D-017). Unit suite: 149 → 206 tests across this phase.

## [Unreleased] — judging panel round 1 response (2026-11-12)

Round 1 of the frozen panel protocol: trimmed mean **6.69** (fail), no hard-constraint violation. Full results `panel/round-1/`, full response DECISIONS.md D-026.

### feat
- `/try`: added 3 tabs for the only tools it never exposed at all — `readiness_brief`, `verify_evidence` ("Verify GitHub"), `prepare_consented_card` ("Consented card") — closing a gap 4 of 5 judges flagged against the README's "try every tool directly" claim.

### fix
- A leaked internal Gate R→B review annotation in live `explain_rule`/`estimate_timeline` content (`data/rules.json`, `data/timelines.json`) — stripped.
- `lib/speedrun/extract-sections.ts`'s header-detection gate missed plain Title Case headers entirely and didn't reset the current section on an unrecognized-but-real header, letting qualifications bleed into every later section — fixed `get_role_rubric`'s (and silently, `readiness_brief`'s) garbled "skills" output; added a defense-in-depth boilerplate filter.
- `lib/tools/wrap.ts` used one generic, job-posting-flavored 404 message for every entity type — `SpeedrunApiError`/`GitHubApiError` now carry an entity-specific `userMessage`.
- `verify_evidence`: a syntactically-invalid username produced a misleading "something went wrong, retry" — moved the format check into the zod schema for a proper `invalid_input` error.
- `search_defense_roles`: a zero-result note blamed the keyword even when location was the actual cause — now names whichever filter(s) are active.
- Two switch toggles ("ITAR only," "Remote") had the accessible name "on" — added explicit `aria-label`.
- `estimate_timeline`'s "never a false-precision number" claim was false for most real inputs — softened everywhere it appears to match what's actually delivered.
- `/sources`' uniform `lastVerified` dates across 40+ citations spanning decades were never disclosed as a single build-time snapshot rather than a staggered audit — said so explicitly.

### test
- `tests/e2e/try-playground.spec.ts` extended with tests for the 3 new tabs (56 cases total, both viewports).
- Unit suite: 206 → 219.
- Investigated (4/5 judges' single most-repeated finding) and disproved as a product bug: `/try`'s tabs appeared not to switch on click — a bare JS `.click()` doesn't fire the pointer-event sequence Radix Tabs needs; a real simulated click (this project's own E2E suite, and any real mouse/touch/keyboard user) works every time.
- `get_company_profile`'s reported 10–14s latency on a near-miss slug — investigated, could not reproduce after 7+ varied live attempts; not fixed.

## [Unreleased] — judging panel round 2 response (2026-11-12)

Round 2: trimmed mean **6.96**, but a **hard-constraint violation** (2/5 judges) capped the effective score at 6.0. Full results `panel/round-2/`, full response DECISIONS.md D-027/D-028.

### fix
- **Hard constraint:** `prepare_consented_card`'s PII/CUI filter was bypassed by trivial rephrasing of 4 of 5 protected categories — a bare 9-digit number, "Born 03/14/1992" (no "DOB"), "My ID number is..." (no "passport"), e-QIP/case numbers phrased as "request"/"file"/"reference", and real JPAS field jargon ("Owning SMO," "PSQ"). Fixed with targeted regex widenings, a new `credit_card` category, and a new tool-scoped stricter bare-identifier check — zero regressions against the existing 108-case suite.
- `/try?tool=<name>` deep links never worked — the homepage's own per-tool "Try it" buttons linked there, but the page never read the query param at all.
- `estimate_timeline`'s `current_status=interim` produced output nearly identical to `none` — now gets its own driver explicitly stating the baseline is a reference point, not their own expected wait.
- `search_defense_roles` emitted duplicate/redundant clearance signals from a single sentence ("Top Secret security clearance" matched both a specific level and the generic fallback).
- The citizenship/ITAR inference wasn't geography-aware — tagged a real Sydney, Australia posting (asking for an Australian NV2 clearance) with the same US-person flag applied to domestic roles.
- Focus-ring contrast fell below WCAG 3:1 on the project's standard `ring-accent-6` focus token — independently re-derived the judge's exact computed ratios via direct luminance calculation; changed to `ring-accent-8` across all 12 files using it.
- No skip-to-content link existed anywhere — added to the shared `Nav` component.
- `verify_evidence`'s disclaimer included a non-sequitur "fit"/"criteria" sentence copy-pasted from `get_company_profile`'s own, unrelated design.

### test
- Investigated and found NOT reproducible: a claim that 200-level-deep nesting bypassed the PII depth guard (tested directly, both in isolation and through the full HTTP pipeline — correctly rejects every time).
- Investigated and found NOT a real gap: the search keyword field allegedly relying on placeholder-as-label (both actual search inputs already have a proper `<label>` or `aria-label`).
- Unit suite: 219 → 237. Full E2E suite re-extended and re-verified against production (62 passed, 2 graceful skips, both viewports). Lighthouse still 100/100/100/100 on all 4 pages.

## [Unreleased] — judging panel round 3 response (2026-11-12)

Round 3: trimmed mean **6.82**, another **hard-constraint violation** (2/5 judges, 2 bypass patterns distinct from round 2's) capped the effective score at 6.0. Full results `panel/round-3/`, full response DECISIONS.md D-029.

### fix
- **Hard constraint:** a case-ID shape in agency-prefix order ("DCSA-2026-0417") and real clearance-adjudication jargon naming no DISS/JPAS/NBIS system ("my SOR was adjudicated favorably... with T5 scope and CI poly", bare "adjudicated under e-QIP") both bypassed every existing PII/CUI detector. Widened the case-ID pattern to accept either order; added a new keyword-co-occurrence check (each token alone too short/generic to flag — "CI" collides with "Continuous Integration" in this domain).
- **Credit-card false positive on UUID-shaped identifiers** (4/5 judges independently reproduced) — D-027's own new credit-card shape check matched by coincidence inside an all-numeral `role_id` UUID. Added a UUID pre-strip scoped only to that one check.
- `search_defense_roles` multi-second tail latency (22.4s/11.0s outliers reproduced live) — root-caused to a transient upstream slowdown compounding across up to 4 sequential page-fetch retries. Added an 8-second deadline on the page-scan loop with an honest note when it triggers.
- "Secret security clearance" was classified to only the generic clearance fallback, not the specific `secret` level — that pattern required "secret clearance" immediately adjacent; made "security" optional between them.
- No MCP tool annotations were declared on any of the 11 tools, despite the original plan's own stated intent — added `readOnlyHint: true` (every tool here only reads/computes).
- `/try`'s 9-tool tab strip had zero visual affordance that it scrolls at mobile/tablet widths (measured: only 3-7 of 9 tabs visible, no arrow, no partial-tab peek) — added a fixed edge mask-image fade.
- `/try`'s `<title>` stayed the generic "Clearance Lens" — added a sibling Server Component layout so it gets the same "`<Page>` · Clearance Lens" template every other page has.
- A 2px horizontal overflow on mobile (header wordmark + toggle/button cluster) — reduced the row's gap below the `sm:` breakpoint.
- `get_company_profile`'s "currently open roles" figure can strain credulity against a company's own employee-count label (e.g. Anduril: 2,586 roles vs. 1,001-5,000 employees) — confirmed this is a general upstream-dataset characteristic (every company in the network shows a similarly high ratio), not a bug in this tool's own aggregation; added a plain caveat rather than "fixing" a number being faithfully passed through.

### feat
- `/try`: added dedicated tabs for `get_company_profile` ("Company profile") and `fit_debrief` ("Fit debrief") — previously reachable only via embedded flows (a dialog; the Job Preview debrief step), a reasoned choice after round 1 that fresh judges in both round 1 AND round 3 independently flagged again as "no UI entry point." Both embedded entry points are unchanged, not replaced.

### test
- Investigated and found NOT reproducible: the footer's "Status" link 404s (recruiter_user, trust_skeptic) — its actual `href` is `/api/health` (200 OK, live), not literally `/status` (404) — both judges appear to have guessed the URL from the link's visible text.
- Investigated and found NOT a real gap: `estimate_timeline` "never produces a true range" (candidate_user) — tested all 12 input combinations directly; `lapsed_gt_2y` genuinely returns a true 180/270 range. The judge's specific sample just didn't include that branch.
- Reconfirmed, not a new finding: the recurring "/try tabs don't switch" claim, via the same click-simulation-limited tool D-026 already root-caused — this round is the clearest confirmation yet, since the one judge using real Playwright screenshots did not reproduce it and instead found the real, different mobile-overflow bug above on the identical control.
- Fixed a pre-existing, intermittent flake in the homepage's own axe scan (caught live during this round's verification, not from the panel) — traced to `components/hero.tsx`'s one-time staged-reveal animation; scanning mid-CSS-transition could transiently change a chat bubble's computed contrast. Added a settle wait before scanning the homepage specifically; stable across 3 repeated runs.
- Unit suite: 237 → 251. Full E2E suite (70 passed, both viewports) against a fresh production build.
