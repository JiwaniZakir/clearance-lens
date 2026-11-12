# Judging panel — round 7 (2026-11-12)

**Result: FAIL.** Trimmed mean **7.49**, median 7.65 — a genuine, clean 5/5-valid-judge round (the first attempt at round 7 was voided for cross-contamination, see DECISIONS.md D-036, and re-run once clear of that side-conversation) — but a **hard-constraint violation** (1 of 5 judges, independently reproduced 4 times across 3 different tools) caps the effective score at **6.0**. Persona assigned: persona C.

| Judge | Overall |
|---|---|
| function_engineer | 7.55 |
| product_designer | 7.85 (dropped) |
| candidate_user | 7.65 |
| recruiter_user | 7.05 |
| trust_skeptic | 7.70 |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-039 for the full response. Summary:

- **Hard-constraint violation: the PII/CUI guard had no detector at all for email addresses or phone numbers** (function_engineer, reproduced 4 times across `search_defense_roles`, `explain_rule`, and `prepare_consented_card`) — every other documented category (SSN/DOB/passport/credit-card/classification-marking) was correctly caught in the same fields; contact info specifically sailed through. Added `email`/`phone` categories to `lib/guard/pii.ts`.
- **`/try` had no UI for 3 of 14 tools** (product_designer, candidate_user, trust_skeptic, independently): `prepare_signed_attestation`, `contribute_anonymous_signal`, `get_aggregated_signal`. Added all 3 as full, working tabs — the attestation tab does real Ed25519 keypair generation and signing in-browser via the Web Crypto API, since that tool's whole design assumes the caller's own agent does this locally.
- **"Stateless by design" / "What we store: Nothing" were no longer accurate** (trust_skeptic, recruiter_user, candidate_user, independently) now that the anonymous-signal tools genuinely persist anonymous aggregate state. Updated README.md and `/privacy` to say so honestly, with the exact scope of the one exception.
- **No anti-fabrication protection on `contribute_anonymous_signal`** (recruiter_user, directly demonstrated: 0→10 fake contributions to a real Anduril posting in under 2 seconds with zero auth). Added a short per-role cooldown that directly defeats that exact burst pattern — explicitly not a complete fix for a more patient adversary, which the tool's own disclaimer now says plainly.
- Missing CSP header (product_designer) — added, scoped to what the app actually needs (checked first: self-hosted fonts, no external images, no client-side cross-origin fetches, next-themes' one inline script).
- A borderline WCAG contrast ratio with "no safety margin" (product_designer, precisely verified: 4.584:1, just above the 4.5 AA floor) — widened in both themes.
- `explain_rule` still missed "permanent_resident"/"permanent resident" (trust_skeptic) — added to `itar-us-person`'s keywords.
- A company-profile staleness caveat gap (candidate_user) — the existing "not independently sourced" caveat was scoped to hiring criteria, not to profile fields like `stage` themselves; added a dedicated caveat.
- **Investigated, not reproducible:** a claimed "binary data" mislabel for 61+ repeated characters (function_engineer) — tried across 7 different characters, 3 different tools, and the exact described length boundary; never reproduced.
- **Investigated, no action needed:** `/try`'s raw (pre-hydration) HTML having no interactive elements (recruiter_user) — expected behavior for a `'use client'` page; this project's own extensive real-browser E2E suite (86 tests) confirms it becomes fully interactive once JS runs.

Fix commits: see the commits immediately following this round's persisted results.

Post-fix verification (same day): unit suite 299→365, full `pnpm verify` green, protocol suite 14/14, full E2E suite (85 passed, 1 pre-existing live-data-dependent skip, including new dedicated coverage for all 3 newly-added tabs and a real end-to-end Ed25519 sign/verify round trip in a real browser), zero CSP violations across every page, `linkcheck` clean, Lighthouse clean on `/` and `/try` — every fix independently re-verified live against a running build or production with a real browser/MCP client/curl, not just unit-tested.
