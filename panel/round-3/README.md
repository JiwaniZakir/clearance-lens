# Judging panel — round 3 (2026-11-12)

**Result: FAIL.** Trimmed mean **6.82**, median 6.80 — another hard-constraint violation (confirmed independently by 2 of 5 judges, 2 bypass patterns distinct from round 2's) caps the effective score at **6.0** regardless. Persona assigned to judge 3: persona C.

| Judge | Overall |
|---|---|
| function_engineer | 6.65 |
| product_designer | 7.35 |
| candidate_user | 6.50 |
| recruiter_user | 6.80 |
| trust_skeptic | 7.80 (dropped) |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-029 for the full response. Summary:

- **Hard-constraint violation (top priority): two new PII/CUI bypass patterns**, distinct from everything round 2 fixed. A case-ID shape in agency-prefix order ("DCSA-2026-0417") and real clearance-adjudication jargon naming no DISS/JPAS/NBIS system ("my SOR was adjudicated favorably... with T5 scope and CI poly", bare "adjudicated under e-QIP"). Fixed with a widened case-ID pattern plus a new keyword-co-occurrence check.
- **Same priority: a credit-card false positive on UUID-shaped role IDs**, reproduced independently by 4 of 5 judges — round 2's own new credit-card detector matched by coincidence inside an all-numeral UUID. Fixed with a UUID pre-strip scoped only to that check.
- **9 more real findings fixed:** `search_defense_roles` multi-second tail latency (root-caused to a transient upstream slowdown compounding across sequential page-fetch retries, bounded with a deadline); "Secret security clearance" misclassified to the generic fallback; missing MCP tool annotations; `/try`'s tab strip having zero scroll affordance on mobile/tablet; `/try`'s generic page title; a 2px mobile horizontal overflow; `get_company_profile`'s open-roles-vs-headcount ratio (confirmed a general upstream-dataset characteristic, caveated rather than "fixed").
- **Scope decision:** added dedicated `/try` tabs for `get_company_profile` and `fit_debrief` — both tools were deliberately embedded-only after round 1, but fresh judges in rounds 1 AND 3, independently, flagged the same "no UI entry point" gap. Closed for good rather than left for a future round to rediscover.
- **Investigated, found NOT reproducible:** the footer's "Status" link (it points to `/api/health`, 200 OK — judges appear to have guessed the URL from the link's visible text, not its href).
- **Investigated, found NOT a real gap:** `estimate_timeline`'s "never a true range" claim (`lapsed_gt_2y` genuinely returns a true 180/270-day range; the judge's sample of inputs didn't include that branch).
- **Reconfirmed, not new:** the recurring "/try tabs don't switch" claim, via the same click-simulation-limited browser tool D-026 already root-caused. This round is the clearest confirmation yet — the one judge who used real Playwright screenshots (product_designer) did NOT reproduce it, and instead found the real, different mobile-overflow-affordance bug on the identical control.

Also fixed, found while verifying this batch (not from the panel): a pre-existing intermittent flake in the homepage's own axe accessibility scan, traced to the hero's reveal animation and stabilized.

Fix commit: `612b2b0`.

Post-fix verification (same day): unit suite 237→251, full `pnpm verify` green, protocol suite 14/14, full E2E suite (70 passed, both viewports) against a fresh production build, Lighthouse 100/100/100/100/100 (new "agentic-browsing" category) on all 4 pages — all re-checked against live production after the fix deploy, including the two new tabs, the deep links, the mask-image affordance, and the mobile-overflow fix, each confirmed with a real browser directly against the live URL.
