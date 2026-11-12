# Judging panel — round 6 (2026-11-12)

**Result: FAIL, but the first round with zero hard-constraint findings.** Trimmed mean **7.65**, uncapped — every prior round (2 through 5) was capped at an effective 6.0 by at least one hard-constraint violation. Persona assigned: persona B.

| Judge | Overall |
|---|---|
| product_designer | 7.75 |
| candidate_user | 7.75 |
| recruiter_user | 7.45 |
| trust_skeptic | unrecoverable* |
| function_engineer | unrecoverable* |

\* **Data-recovery note:** this round's full result was read and acted on live, in-session, but a context-window compaction occurred before it was persisted to this directory. The verbatim raw report for 3 of 5 judges (product_designer, candidate_user, recruiter_user) was recovered intact from the conversation transcript and is reproduced faithfully in [`judges.json`](./judges.json); trust_skeptic's and function_engineer's raw reports did not survive and are **not** reconstructed or guessed at — `judges.json` says so explicitly rather than fabricating plausible-looking content. The `trimmedMean`/`effectiveScore` of **7.65** and "zero hard-constraint findings" are carried forward from what was genuinely computed and acted on live before compaction, not re-derived from only the 3 recovered judges. Full details and provenance: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-033 for the full response. Summary:

- **New rule entry `laa-non-citizen`** (candidate_user): no tool explained that DoD clearance *eligibility* for a non-citizen (a Limited Access Authorization, 32 CFR § 117.10) is a separate, much stricter regime than ITAR's "U.S. person" test — capped at SECRET, granted only in "rare circumstances," scoped to one contract, never automatic. Researched against the primary source before writing any content; cross-linked both directions with `itar-us-person`.
- **`explain_rule` keyword gap** (candidate_user): "green_card"/"lpr"/"permanent resident clearance" all missed `itar-us-person` despite that rule directly answering them.
- **CORS/actual-method inconsistency on `/mcp`**: the preflight advertised `GET` as an allowed method, but a real `GET /mcp` always 405s in this stateless deployment. Narrowed to `POST, OPTIONS`.
- Added `app/robots.ts`/`app/sitemap.ts` — previously missing entirely.
- **`search_defense_roles`' detail-check gap disclosed only in prose** (candidate_user, directly reproduced): `rolesScanned` counts every posting matching the search terms (up to 200), but only the first 25 ever get a detail fetch and requirement-signal check. Added `requirementSignalsCheckedCount` as its own output field so a calling agent can detect the gap without depending on prose.
- **`build_trial_assessment` never disclosed verbatim-typo quoting** (recruiter_user, directly reproduced against the judge's exact example — a real typo, "Mange the Anduril Group 5 Mission Autonomy Systems Engineering homeroom," copied verbatim into a rubric criterion): the judge explicitly called the verbatim quoting itself "a defensible anti-fabrication design choice" — the gap was the product never saying so. Added a sentence to the existing `rubricRefinementNote`.
- **Self-inflicted regression, found while verifying the above, not from any judge**: a new tool added just before this round (`prepare_signed_attestation`, Clearance Lens v2) was never added to the homepage's tool-card blurb map, so its card fell back to a code-snippet-bearing description that overflowed the page at mobile widths. Fixed the instance and the class of bug (`break-words` on the card description).
- **Investigated, not reproducible** (product_designer): a claimed 3.36:1 dark-mode button contrast failure — actual computed color is the `on-solid-dark` design token (`rgb(13,16,20)`), not white; hand-computed contrast ≈5.66:1, passes AA. Judge measurement error.

Fix commits: see the commit immediately following this round's persisted results.

Post-fix verification (same day): unit suite 276→301 (new/extended test files for the LAA/keyword regression, `requirementSignalsCheckedCount`, and the verbatim-typo disclosure, plus Clearance Lens v2's own new tests), full `pnpm verify` green, protocol suite 14/14, full E2E suite (77 passed, 1 pre-existing skip) against a fresh production build, `linkcheck` 130 passed/0 failed (both new LAA source URLs resolve), Lighthouse all 4 categories ≥95 on `/` and `/try` (desktop preset) — every fix independently re-verified live against a running build with either a real MCP client, a real browser, or `curl`, not just unit-tested.
