# Judging panel — round 8 (2026-11-12)

**Result: FAIL.** Trimmed mean **7.61**, median **7.90** — the highest median of any round so far, 5/5 valid judges, checked for cross-contamination (a user message arrived mid-round; no judge showed any sign of it) — but a **hard-constraint violation** from 1 of 5 judges caps the effective score at **6.0**. Persona assigned: persona D.

| Judge | Overall |
|---|---|
| function_engineer | 7.40 |
| product_designer | 8.20 (dropped) |
| candidate_user | 7.95 |
| recruiter_user | 7.90 |
| trust_skeptic | 7.20 |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-042 for the full response. Summary:

- **Hard constraint #1 — bare numeric birthdates passed the PII guard** (trust_skeptic, reproduced 3 times): "01/15/1990" or "1990-01-15" with no "DOB"/"born" keyword was accepted everywhere and echoed into a shareable card. Now any day-precise date at least 16 years in the past is caught — legitimate dates in this product (availability, start, posting dates) are near-future or recent.
- **Hard constraint #2 — an SSN split across two card fields with filler text between the digit groups** passed the cross-field check. Now any explicit SSN reference plus 9+ digits anywhere in the shareable card is rejected — a rule decoy digits can't defeat (verified).
- **`search_defense_roles` discarded every result when one later page failed** (function_engineer, root-caused against the upstream, which intermittently returns HTTP 500 "query failed" on individual pages). Now earlier pages' results survive with a note, and later pages skip the retry backoff that pushed a failing call to 26 seconds.
- **The shareable signed credential wasn't independently verifiable** (found while checking candidate_user's "no recipient-side verify tool"): it omitted the exact bytes that were signed. Now included, and a new `verify_signed_attestation` tool provides the recipient's half, with a key fingerprint for recognizing repeat signers.
- **`estimate_timeline` ignored `employer_has_fcl` in its structured numbers** (candidate_user) — "yes" and "no" returned identical figures. The sourced 90–270 day sponsorship wait is now folded into the estimate and exposed as its own field.
- **`/try` rendered a blank page until JavaScript loaded** (recruiter_user, also raised in round 7) — its Suspense fallback was `null` and wrapped the whole page. Now server-renders the nav, intro, every tool's name, a loading state, and a `<noscript>` note.
- Smaller fixes: an over-blocked NBIS/DISS "record systems" question; no scope signal when searching for employers outside the a16z speedrun network; the hero transcript read half-typed to screen readers (and was labeled "live" though scripted); `/sources` missing the speedrun data source and two research citations (now guarded by a test covering every URL any tool cites); a misleading `recruiterQuestions` field name.
- **Not changed, with reasoning:** the anonymous-signal pool's cold start and limited integrity (already disclosed in-tool); `/try` feeling impersonal without an agent (inherent to running with no LLM key); Cosign lookup latency (a disclosed consequence of Cosign's API having no direct lookup); the OG image and type-scale polish (low user impact relative to regression risk).

Post-fix verification (same day): unit suite 374 → 409, protocol 14/14 against a build reporting 16 tools, full E2E 88 passed / 2 skipped (the same live-data-dependent test on both viewports), including a real browser round trip of sign → share → verify.
