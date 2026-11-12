# Judging panel — round 2 (2026-11-12)

**Result: FAIL.** Trimmed mean **6.96**, median 7.00 — but a hard-constraint violation (confirmed independently by 2 of 5 judges) caps the effective score at **6.0** regardless. Persona assigned to judge 3: persona B (green card holder).

| Judge | Overall |
|---|---|
| function_engineer | 7.55 |
| product_designer | 7.95 (dropped) |
| candidate_user | 7.00 |
| recruiter_user | 6.65 |
| trust_skeptic | 6.65 |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-027 (hard-constraint fix) and D-028 (remaining findings) for the full response. Summary:

- **Hard-constraint violation (top priority): `prepare_consented_card`'s PII filter bypassed by trivial rephrasing.** Two independent judges reproduced this with specific phrasings (a bare 9-digit number, "Born 03/14/1992" instead of "DOB", "My ID number is..." instead of "passport", e-QIP/case numbers phrased as "request"/"file"/"reference", real JPAS field jargon). Fixed with targeted regex widenings plus one new tool-scoped stricter check — verified against the full existing 108-case suite (zero regressions) and all 8 reported bypasses (now rejected).
- **7 more real findings fixed:** `/try?tool=<name>` deep links never worked (a genuine missing feature, not a click-simulation artifact); `estimate_timeline`'s `current_status=interim` was nearly identical to `none`; duplicate/redundant clearance signals from one sentence in `search_defense_roles`; citizenship/ITAR inference wasn't geography-aware (tagged a Sydney, Australia role with a US-person flag); focus-ring contrast below WCAG 3:1 (independently reproduced the judge's exact computed ratios); no skip-to-content link anywhere; `verify_evidence`'s disclaimer had a non-sequitur sentence copy-pasted from `get_company_profile`.
- **One finding investigated, found not reproducible:** a claim that 200-level-deep nesting bypassed the depth guard — tested directly both in isolation and through the full HTTP pipeline; both correctly reject every time.
- **One finding investigated, found not a real gap:** the search keyword field allegedly relying on placeholder-as-label — both actual search inputs already have a proper `<label>` or `aria-label`.

Fix commits: `02d3497` (hard-constraint fix) and `1a307ac` (remaining findings).

Post-fix verification (same day): unit suite 219→237, full `pnpm verify` green, E2E suite extended and passing (both viewports), protocol suite 14/14 against production, Lighthouse 100/100/100/100 on all 4 pages — all re-checked against live production after the fix deploy.
