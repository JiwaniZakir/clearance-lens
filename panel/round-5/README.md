# Judging panel — round 5 (2026-11-12)

**Result: FAIL.** Trimmed mean **7.55** (up from 7.49), median 7.55 — the tightest judge clustering yet (7.40–7.75) — but a hard-constraint flag from 2 of 5 judges, each a different category, still caps the effective score at **6.0**. Persona assigned to judge 3: persona A.

| Judge | Overall |
|---|---|
| function_engineer | 7.55 |
| product_designer | 7.75 (dropped) |
| candidate_user | 7.70 |
| recruiter_user | 7.50 |
| trust_skeptic | 7.45 |

Full raw judge reports: [`judges.json`](./judges.json). Full aggregation: [`aggregation.json`](./aggregation.json).

## Response

See `DECISIONS.md` D-031 for the full response. Summary:

- **Hard-constraint violation #1: a PII/CUI bypass specific to the MCP transport**, not the REST path. An SSN in an undocumented extra `tools/call` argument field was silently dropped by the MCP SDK's own schema-based argument parsing before this project's own PII guard ever saw it. Root-caused by reading the SDK's `registerTool()` implementation directly. Fixed by scanning the true raw `tools/call` body in a route-level wrapper, before the SDK's internal parsing strips it — returning the rejection in the same clean `result.isError:true` shape an in-schema PII rejection already uses (the first version of this fix used a top-level JSON-RPC `error`, which broke an existing protocol-suite test by causing most MCP client SDKs to throw an exception instead).
- **Hard-constraint violation #2: a new PII/CUI category**, classification/control markings ("SECRET//NOFORN"), not covered by any prior round's fixes.
- **3 more real bugs fixed:** a leaked internal "product brief" authoring note in live timelines data (same class as D-026); `get_role_rubric` listing the same source citation twice; `search_defense_roles`' clearance filter matching a real UK posting on "secret" (reused and widened an existing geography check).
- **Transparency improvement:** `estimate_timeline`'s min==max cases now explain in the output itself why that specific input has no range, after judges across 2 separate rounds happened to sample only no-range inputs.
- **Investigated, found NOT a bug:** requirement-signal badges looking "inert" on a bare click — confirmed this is `@radix-ui/react-tooltip`'s own standard hover/focus-only behavior, not a defect.

Fix commit: `064a0dd`.

Post-fix verification (same day): unit suite 260→276 (2 new dedicated test files for previously-untested modules, `get-role-rubric.test.ts` and `role-shared.test.ts`), full `pnpm verify` green, protocol suite 14/14, full E2E suite (76 passed, 2 graceful skips, both viewports) against a fresh production build, Lighthouse 100/100/100/100/100 on all 4 pages — every fix independently re-verified live against production with either a real MCP client (confirming the MCP-transport PII fix specifically) or a real browser, not just unit-tested.
