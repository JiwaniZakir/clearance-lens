# Judging panel — round 9 (2026-11-12)

**Result: FAIL**, and the most useful round so far. Four of five judges completed; the fifth (function_engineer) was retried four times and never returned before the session ended, so the workflow produced no aggregation of its own — the figures below apply the frozen script's formula by hand. Trimmed mean **5.42**, median **5.75**. All four judges reported a hard-constraint violation. Persona assigned: persona A (new grad).

| Judge | Overall |
|---|---|
| trust_skeptic | 6.05 (dropped) |
| product_designer | 5.75 |
| candidate_user | 5.75 |
| recruiter_user | 4.75 |
| function_engineer | — (no response) |

Scores fell from round 8's 7.61 because these judges found things earlier rounds hadn't looked for, not because the product regressed. Raw reports: [`judges.json`](./judges.json). Aggregation: [`aggregation.json`](./aggregation.json).

## What they found, and the response

- **Wrong legal guidance on the flagship example (4 of 4).** The product told green card holders that the non-citizen clearance rule didn't apply to them, and the homepage answered "Yes" to a green card holder asking about a role whose postings all require a clearance. Verified against eCFR and the Federal Register, then corrected everywhere — D-046.
- **The PII/CUI guard let through 38 of 80 refuse-list payloads on the intro card**, plus unguarded prompts, keys, and error messages. The card no longer receives values at all; every MCP request is pre-scanned; about 40 payload shapes closed — D-047.
- **The one write tool was labeled read-only; exact counts leaked below the 5-person floor; "no database" copy was untrue** — D-048.
- **Timeline figures:** three day-ranges turned out to be in no cited source, one figure was from the wrong quarter, one rule was attributed to the wrong document — D-049.
- **Requirement quotes cut off at "U.S." (34%)**, and clearance signals lost the "eligible to obtain" qualifier — D-046.
- **Interview questions and trial rubrics built from eligibility lines; a software standup for a manufacturing role** — D-050.
- **`/try` on phones:** filters scrolled off-screen, Enter didn't submit, the page overflowed at 320px, evidence chips couldn't be opened by touch, raw markdown and enum values shown to people, an unbranded 404 — D-051.

**Not changed, with reasoning:** the anonymous pool's integrity still rests on a per-role cooldown rather than identity (disclosed in the tool's own output; fixing it properly needs accounts, which the planned two-sided rebuild introduces); `search_defense_roles` still checks requirement signals on the first 25 postings per call (disclosed in its note and now counted accurately); one Cosign lookup took 8.3s (bounded and disclosed, D-042).

Post-fix verification: unit suite 536 → 670; protocol 14/14; E2E 96 passed / 2 skipped (the same live-data-dependent test on both viewports); link check 0 failed.
