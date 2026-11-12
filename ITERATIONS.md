# Iterations

One entry per build loop (spec §4). Goal → what shipped → test result → panel result (if run).

## Iteration 0 — Scaffold + Research kickoff (2026-11-11)
**Goal:** Working Next.js skeleton, repo + Vercel project linked, Phase R research running.
**Status:** done. Repo live at github.com/JiwaniZakir/clearance-lens, Vercel project `clearance-lens` linked, Phase R workflow launched (5 research agents + gate review).

## Iteration 1 — Core: MCP server, all 11 tools, Gate R→B applied (2026-11-11)
**Goal:** Every MCP tool built, registered, and live-tested through both the real MCP transport and the /try API route; Phase R's output integrated.
**Shipped:**
- `lib/tools/wrap.ts`'s `callTool` pipeline (size limit → PII/CUI guard → zod input → handler → zod output → structured error), proven with a toy tool before any real one was built.
- All 11 tools: `search_defense_roles`, `get_role_rubric`, `estimate_timeline`, `readiness_brief`, `build_trial_assessment`, `explain_rule`, `verify_evidence`, `run_job_preview`, `fit_debrief`, `get_company_profile`, `prepare_consented_card`.
- `app/mcp/route.ts`: all 11 tools + 3 resources (`rules`, `timelines`, `disclaimers`) + 3 prompts (`check_my_eligibility`, `prep_for_role`, `preview_the_job`).
- Phase R's 5 research reports + gate review landed, were read, and were applied: `data/rules.json`/`timelines.json` corrected (D-007), 4 concrete backlog fixes applied (D-008).
- Two real live bugs found and fixed during build, not left for the panel: a transient Speedrun 5xx not being retried (D-006), a nullable-field type lie in `lib/speedrun/types.ts` (D-008).
**Test result:** 149 unit tests passing, typecheck clean, lint clean. Full MCP-transport smoke test (handshake, tools/list, resources/list, prompts/list, every tool called) passing against local dev.
**Not yet done:** the entire web app (`/`, `/try`, `/privacy`, `/sources` are still the default scaffold — by far the largest remaining item per PLAN.md), protocol/e2e/a11y/perf/red-team/agent-eval/link-check tests, deployment, judging panel.

## Iteration 2 — Web app, protocol/red-team/agent-eval tests, deployment (2026-11-11 – 2026-11-12)
**Goal:** Ship `/`, `/try`, `/privacy`, `/sources`; run the full spec §5 test battery; deploy to production.
**Shipped:**
- All 4 pages built in parallel by scoped subagents (landing / `/try` / privacy+sources), each with a strict file-ownership boundary to avoid conflicts; design tokens/components from R2.
- `app/mcp/route.ts`'s CORS gap fixed (D-012) — found via direct `curl` with an `Origin` header, invisible to every prior Node-client smoke test.
- Red-team pass (D-013): 5 confirmed PII-guard bypasses (Unicode lookalikes, short base64, ROT13, percent-encoding, a fail-open depth limit), all fixed with regression tests. BLOCKERS.md B-001 (cross-field PII evasion) resolved with a scoped `extraGuard` hook, not a global fix (D-014).
- Agent-in-the-loop persona eval (spec §5): 4 fresh agents role-playing R3's personas against the live MCP server, 40 scenarios, 34/40 passing on first read — found and fixed the `nbis-diss` guard bug (D-016) and the `estimate_timeline` interim-eligibility gap (D-017), both reproducible, both central to real user journeys.
- Deployed to production via Vercel's Git integration; verified live (D-023).
**Test result:** unit suite grew to 206 (PII guard, estimate_timeline/explain_rule's first-ever dedicated tests, get_company_profile's comp-normalization regression, search_defense_roles's zero-result guidance). Protocol suite 14/14 against both local and production MCP endpoints.
**Not yet done at the end of this iteration:** Playwright E2E beyond a skeleton accessibility spec, Lighthouse CI never run, judging panel never executed.

## Iteration 3 — Accessibility/Lighthouse hardening, E2E suite, judging panel (2026-11-12)
**Goal:** Close the remaining spec §5 gaps (full a11y/Lighthouse/E2E verification) and run the judging panel (spec §6).
**Shipped:**
- Diagnosed and fixed a shared dev server stuck in an HMR reload loop that was silently breaking client-side hydration for every agent using it (D-019); fixed a pnpm/Playwright config bug that meant no test had ever actually run against a production build before (D-019).
- 2 real accessibility bugs found via Playwright + axe against a production build (a card nesting focusable children inside `role="button"`; several scrollable regions with no `tabIndex`) and 2 heading-order bugs found via Lighthouse — all fixed (D-019, D-020). Lighthouse CI wired up and run: **100/100/100/100 on every page**, both locally and on production.
- `tests/e2e/try-playground.spec.ts`: the full Playwright persona-scenario suite across all 6 `/try` tabs plus a chained integration journey (D-022).
- `scripts/linkcheck.ts`'s own retry-logic bug fixed (D-021) — it could silently downgrade a legitimate bot-block signal to a false FAIL.
- 3 real gaps closed in the judging-panel aggregator before round 1 ever ran: missing-evidence discarding, score-range bounds, and a minimum-valid-judges safety floor (D-024).
- Full production smoke test: all 11 tools, CORS, protocol suite, and E2E suite re-verified against the live deployed URL (D-023).
**Test result:** unit suite 206/206, protocol 14/14 (local + production), E2E 49/50 (1 gracefully self-skipping on an inherently live-data-dependent case), Lighthouse 100/100/100/100 all 4 pages, linkcheck 128 passed/44 warned/0 failed, `tsc --noEmit` and `eslint .` clean.
**Panel result — round 1 (2026-11-12): FAIL.** Trimmed mean **6.69**, median 6.75, no hard-constraint violation, 5/5 valid judges. Full reports: `panel/round-1/`. 9 real findings fixed (D-026) — a leaked internal annotation in live content, a requirement-extraction bug, a shared wrong error message across entity types, a misleading-retry error for bad GitHub input, a search-guidance misattribution bug, 2 unlabeled switches, an overclaiming tool description, and an undisclosed single-build-date framing on `/sources` — plus 3 missing tools added to `/try` (`readiness_brief`, `verify_evidence`, `prepare_consented_card`). One most-repeated finding (4/5 judges: `/try` tabs not switching) was investigated and disproven as a real bug — a browser-automation click-simulation limitation, not a product defect. Post-fix: unit suite 206→219, full `pnpm verify` green, E2E extended to 56 cases (56 passing/2 graceful skips across both viewports) and re-verified against production, Lighthouse still 100/100/100/100 on all 4 pages.

**Panel result — round 2 (2026-11-12): FAIL.** Trimmed mean **6.96**, median 7.00, but a **hard-constraint violation** (2/5 judges independently) caps the effective score at 6.0. Full reports: `panel/round-2/`. Hard-constraint fix (D-027): `prepare_consented_card`'s PII filter was bypassed by trivial rephrasing (a bare 9-digit number, "Born 03/14/1992" instead of "DOB", real JPAS field jargon, e-QIP/case numbers phrased as "request"/"file"/"reference") — fixed with targeted widenings plus one new tool-scoped stricter check, zero regressions against the existing 108-case suite. 7 more real findings fixed (D-028): `/try?tool=<name>` deep links never worked (a genuine missing feature — the homepage's own "Try it" buttons linked there but the page never read the param); `estimate_timeline`'s `current_status=interim` nearly identical to `none`; duplicate clearance signals from one sentence; a non-geography-aware ITAR inference (tagged a Sydney, Australia role); focus-ring contrast below WCAG 3:1 (independently re-derived the judge's exact numbers via direct luminance calculation, fixed globally across 12 files); a missing skip-to-content link; a non-sequitur disclaimer sentence. Two findings investigated and found not real (200-level nesting rejection works correctly; the search field already has a proper label). Post-fix: unit suite 219→237, full E2E suite re-verified against production (62 passed, 2 graceful skips), Lighthouse still 100/100/100/100 on all 4 pages. Round 3 next.
