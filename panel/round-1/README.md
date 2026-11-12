# Judging panel — round 1 (2026-11-12)

**Result: FAIL.** Trimmed mean **6.69** (dropped highest: product_designer 7.5), median 6.75, no hard-constraint violation, all 5 judges valid. Persona assigned to judge 3: persona A (new grad, US citizen, no clearance history).

| Judge | Overall |
|---|---|
| function_engineer | 6.95 |
| product_designer | 7.50 (dropped) |
| candidate_user | 6.75 |
| recruiter_user | 6.35 |
| trust_skeptic | 6.70 |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-026 for the full response. Summary:

- **The single most-repeated finding (4/5 judges): `/try`'s tabs appeared not to switch panels on click.** Investigated directly and disproven as a product bug — it's a browser-automation-tool click-simulation fidelity limitation (a bare JS `.click()` doesn't fire the pointer-event sequence Radix Tabs needs; a real simulated click, which is what this project's own Playwright E2E suite and any real mouse/touch/keyboard user produces, works every time). No code change.
- **9 real, verified findings fixed** with regression tests: a leaked internal review annotation in live `explain_rule` content; a `get_role_rubric` extraction bug dumping benefits/ADA boilerplate as "skills"; a shared, wrong "not found" error message across unrelated entity types; a misleading "internal error, retry" for syntactically-invalid `verify_evidence` input; `search_defense_roles`' zero-result note misattributing the cause between keyword and location; two unlabeled switch toggles; `estimate_timeline`'s overclaiming "never a false-precision number" copy; and `/sources`' uniform-date framing not disclosing this was a one-session build.
- **One finding investigated but not fixed:** `get_company_profile`'s reported 10–14s latency on a near-miss slug — could not reproduce after 7+ varied live attempts.
- **Scope decision:** added full UI for the 3 tools `/try` never exposed (`readiness_brief`, `verify_evidence`, `prepare_consented_card`), completing the 11-tool vision rather than only softening the README's claim.

Fix commit: `7c388bb` — "fix: respond to judging panel round 1 (trimmed mean 6.69) -- 9 real bugs fixed, 3 missing tools added to /try (D-026)".

Post-fix verification (same day): full `pnpm verify` green, unit suite 206→219, E2E suite extended (56 cases, both viewports) and passing, protocol suite 14/14 against production, Lighthouse 100/100/100/100 on all 4 pages — all re-checked against the live production URL after the fix deploy, not just locally.
