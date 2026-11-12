# Judging panel — round 4 (2026-11-12)

**Result: FAIL.** Trimmed mean **7.49** (up from 6.82 — real, substantial progress), median **7.90** — but a hard-constraint flag from 1 of 5 judges still caps the effective score at **6.0**. Persona assigned to judge 3: persona D.

| Judge | Overall |
|---|---|
| function_engineer | 6.65 |
| product_designer | 8.00 |
| candidate_user | 8.05 (dropped) |
| recruiter_user | 7.90 |
| trust_skeptic | 7.40 |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-030 for the full response. Summary:

- **Architectural fix for the recurring "/try tabs don't switch" finding** — this has now cost the hard-constraint cap in rounds 1, 3, and 4, each time via the same tell: judges who drove the page with real Playwright never reproduced it, judges using a lesser browser-automation tool sometimes did. Rather than keep re-investigating the same artifact every round, fixed it architecturally: `/try`'s tab switching is now robust to a bare `click` event (no preceding pointerdown/mousedown), verified via a direct reproduction of the exact case that originally root-caused this in round 1.
- **Self-inflicted regression, same priority:** D-029's own "secret security clearance" fix made that pattern also match inside "Top Secret security clearance," double-counting one phrase as two signals. Fixed with a negative lookbehind.
- **2 more PII/CUI bypasses**, neither overlapping prior rounds' fixes: "DCSA case 2024-0045678" (bare "case" directly followed by a digit); a fully spelled-out date ("born march second nineteen ninety two") with no digits at all.
- **5 more real findings fixed:** `explain_rule`'s own description names 2 example keywords that didn't resolve; a 320px/375px homepage horizontal-overflow bug; a focus ring that was correctly defined but animated in over 150ms (removed from the Button component's transitioned properties); two tools' unhelpful generic validation message on an invalid `minutes` value.
- **Investigated, found NOT reproducible:** a validation-vs-PII-scan ordering claim, directly disproven against production.
- **Confirmed as deliberate, reasoned pre-existing design choices, not new bugs:** a bare-9-digit detection scoping decision (D-027), and `prepare_consented_card`'s own deliberate `.strict()` schema.

Fix commit: `d27a897`.

Post-fix verification (same day): unit suite 251→260, full `pnpm verify` green, protocol suite 14/14, full E2E suite (78 passed, both viewports) against a fresh production build, Lighthouse 100/100/100/100/100 on all 4 pages — every fix independently re-verified live against production with a real browser (not just unit-tested), including the bare-click tab fix, the 320px/375px overflow fix, and the instant focus ring.
