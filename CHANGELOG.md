# Changelog

All notable changes to Clearance Lens, in reverse chronological order. Conventional-commit style entries.

## [Unreleased]

### feat
- All 11 MCP tools implemented, registered, and live-tested via both `/mcp` (real `@modelcontextprotocol/client`) and `/api/tools/*`.
- 3 MCP resources (`rules`, `timelines`, `disclaimers`) and 3 MCP prompts (`check_my_eligibility`, `prep_for_role`, `preview_the_job`).
- `lib/guard/pii.ts`: deterministic PII/CUI detector, 75 unit test cases.
- `lib/speedrun/*`, `lib/github/client.ts`: typed API clients with retry/backoff, verified live.
- Phase R research (5 reports + gate review) complete; `data/rules.json`/`data/timelines.json` populated with real, cited content.

### fix
- Speedrun client now retries transient 5xx, not just 429 (D-006).
- `lib/speedrun/types.ts`: removed a type-level lie (`SpeedrunJobDetail` inheriting a `cohort` field it doesn't have) and widened `company_slug`/`company_url` to nullable for stealth postings (D-008).
- `lib/guard/pii.ts`: SSN detection now also catches the dotted separator format (D-008).

### chore
- Scaffold Next.js 16 App Router project (TypeScript strict, Tailwind v4, ESLint).
- Disable Cache Components (D-001); pin Node engines (D-002); security headers in `next.config.ts`.

## [Unreleased] — web app, hardening, and deployment (2026-11-11 – 2026-11-12)

### feat
- The full web app shipped: `/` (landing, install snippets for 6 client types, FAQ), `/try` (all 11 tools playable live across 6 tabs — Search roles, Timeline, Trial assessment, Role rubric, Job preview, Explain a rule), `/privacy`, `/sources`.
- `app/mcp/route.ts`: explicit CORS wrapper + `OPTIONS` export (D-012) — `createMcpHandler` doesn't add this by default, and no prior Node-client smoke test could have caught it (CORS is browser-only).
- Deployed to production via Vercel's Git integration (`https://clearance-lens.vercel.app`, auto-deploying every push to `main`).
- Judging panel protocol frozen (`panel/protocol.md`) and its executor (`panel/run-round.workflow.js`) written, reviewed, and refined pre-freeze (D-024) before round 1.

### fix
- `lib/guard/pii.ts`: `CLEARANCE_RECORD_CONTEXT` was rejecting bare mentions of "diss"/"nbis"/"jpas" with no surrounding context — made the product's own central trust rule (`nbis-diss`) permanently unreachable through `explain_rule`, found by the agent-in-the-loop eval (D-016). Also: 5 PII-guard bypasses found and fixed by a dedicated red-team pass — Unicode lookalikes, short base64, ROT13, percent-encoding, a fail-open depth limit (D-013); a scoped `extraGuard` hook added to `prepare_consented_card` for PII split across sibling fields (D-014, resolves BLOCKERS.md B-001).
- `estimate_timeline`: a zero-history caller (`current_status: "none"`) never saw interim-eligibility content, since it lived behind a `current_status === "interim"` check a zero-history caller can never honestly pass (D-017).
- `lib/speedrun/infer.ts`: requirement-excerpt extraction bled into unrelated adjacent bullets when a posting used newline-separated lists without trailing periods (D-017); a "citizen, national, or lawful permanent resident" disjunction was misclassified as the narrower citizen-only requirement instead of the broader US-person test (D-017).
- `search_defense_roles`: a zero-result query (very common for a specific company name, given the upstream search's narrow field matching) returned a bare empty list with no guidance — now explains why and suggests a fix (D-018).
- `get_company_profile`: `compRangeObserved` mixed different `comp_period` units (hour/week/year) into one meaningless min/max — now annualizes first and excludes rather than guesses at an unconfirmed unit (D-019).
- Two real accessibility bugs found via Playwright + axe against a production build: a result card was `role="button"` while containing its own focusable children, both an axe violation and a live event-bubbling bug (D-019); several `overflow-x-auto` scroll regions had no `tabIndex`, failing axe's `scrollable-region-focusable` rule (D-019).
- Two heading-order bugs found via Lighthouse: `/try` and `/sources` both jumped from their one `<h1>` straight to `<h3>`s with no `<h2>, dinging the accessibility score even though axe's serious/critical gate didn't catch it (moderate-impact rule) (D-020).
- `scripts/linkcheck.ts`'s own retry logic could downgrade a legitimate bot-block/auth-required signal to a false FAIL depending on which retry attempt happened to throw last (D-021).
- `playwright.config.ts`: `pnpm start -- -p ${PORT}` broke on this pnpm version (forwards a literal `--` into `next start`, which then misparses `-p` as a positional argument) — no Playwright test had ever run against a production build before this fix (D-019).
- A stuck shared dev server (HMR reload loop breaking all client-side hydration) diagnosed and restarted (D-019).

### test
- Agent-in-the-loop persona eval (spec §5): 4 fresh agents, one per R3 persona, each holding a private profile and connecting a real MCP client to the live server — 40 scenarios, found the `nbis-diss` and `estimate_timeline` bugs above (D-016/D-017).
- `tests/e2e/try-playground.spec.ts`: the Playwright persona-scenario suite covering every distinct interactive path across all 6 `/try` tabs plus a chained multi-tab journey (D-022).
- `tests/e2e/accessibility.spec.ts`: axe on all 4 pages × 2 themes × 2 viewports, keyboard navigation, theme-toggle-via-keyboard — zero serious/critical violations.
- Lighthouse CI wired up and run against production: 100/100/100/100 (performance/accessibility/best-practices/seo) on every page (D-020, D-023).
- Full production smoke test: all 11 tools, CORS, the protocol conformance suite, and the full E2E suite all re-verified against the live deployed URL, not just local builds (D-023).
- `estimate-timeline.test.ts` and `explain-rule.test.ts` added — the first two tools built had never had a dedicated unit test file, only live smoke tests (D-017). Unit suite: 149 → 206 tests across this phase.

## [Unreleased] — judging panel round 1 response (2026-11-12)

Round 1 of the frozen panel protocol: trimmed mean **6.69** (fail), no hard-constraint violation. Full results `panel/round-1/`, full response DECISIONS.md D-026.

### feat
- `/try`: added 3 tabs for the only tools it never exposed at all — `readiness_brief`, `verify_evidence` ("Verify GitHub"), `prepare_consented_card` ("Consented card") — closing a gap 4 of 5 judges flagged against the README's "try every tool directly" claim.

### fix
- A leaked internal Gate R→B review annotation in live `explain_rule`/`estimate_timeline` content (`data/rules.json`, `data/timelines.json`) — stripped.
- `lib/speedrun/extract-sections.ts`'s header-detection gate missed plain Title Case headers entirely and didn't reset the current section on an unrecognized-but-real header, letting qualifications bleed into every later section — fixed `get_role_rubric`'s (and silently, `readiness_brief`'s) garbled "skills" output; added a defense-in-depth boilerplate filter.
- `lib/tools/wrap.ts` used one generic, job-posting-flavored 404 message for every entity type — `SpeedrunApiError`/`GitHubApiError` now carry an entity-specific `userMessage`.
- `verify_evidence`: a syntactically-invalid username produced a misleading "something went wrong, retry" — moved the format check into the zod schema for a proper `invalid_input` error.
- `search_defense_roles`: a zero-result note blamed the keyword even when location was the actual cause — now names whichever filter(s) are active.
- Two switch toggles ("ITAR only," "Remote") had the accessible name "on" — added explicit `aria-label`.
- `estimate_timeline`'s "never a false-precision number" claim was false for most real inputs — softened everywhere it appears to match what's actually delivered.
- `/sources`' uniform `lastVerified` dates across 40+ citations spanning decades were never disclosed as a single build-time snapshot rather than a staggered audit — said so explicitly.

### test
- `tests/e2e/try-playground.spec.ts` extended with tests for the 3 new tabs (56 cases total, both viewports).
- Unit suite: 206 → 219.
- Investigated (4/5 judges' single most-repeated finding) and disproved as a product bug: `/try`'s tabs appeared not to switch on click — a bare JS `.click()` doesn't fire the pointer-event sequence Radix Tabs needs; a real simulated click (this project's own E2E suite, and any real mouse/touch/keyboard user) works every time.
- `get_company_profile`'s reported 10–14s latency on a near-miss slug — investigated, could not reproduce after 7+ varied live attempts; not fixed.

## [Unreleased] — judging panel round 2 response (2026-11-12)

Round 2: trimmed mean **6.96**, but a **hard-constraint violation** (2/5 judges) capped the effective score at 6.0. Full results `panel/round-2/`, full response DECISIONS.md D-027/D-028.

### fix
- **Hard constraint:** `prepare_consented_card`'s PII/CUI filter was bypassed by trivial rephrasing of 4 of 5 protected categories — a bare 9-digit number, "Born 03/14/1992" (no "DOB"), "My ID number is..." (no "passport"), e-QIP/case numbers phrased as "request"/"file"/"reference", and real JPAS field jargon ("Owning SMO," "PSQ"). Fixed with targeted regex widenings, a new `credit_card` category, and a new tool-scoped stricter bare-identifier check — zero regressions against the existing 108-case suite.
- `/try?tool=<name>` deep links never worked — the homepage's own per-tool "Try it" buttons linked there, but the page never read the query param at all.
- `estimate_timeline`'s `current_status=interim` produced output nearly identical to `none` — now gets its own driver explicitly stating the baseline is a reference point, not their own expected wait.
- `search_defense_roles` emitted duplicate/redundant clearance signals from a single sentence ("Top Secret security clearance" matched both a specific level and the generic fallback).
- The citizenship/ITAR inference wasn't geography-aware — tagged a real Sydney, Australia posting (asking for an Australian NV2 clearance) with the same US-person flag applied to domestic roles.
- Focus-ring contrast fell below WCAG 3:1 on the project's standard `ring-accent-6` focus token — independently re-derived the judge's exact computed ratios via direct luminance calculation; changed to `ring-accent-8` across all 12 files using it.
- No skip-to-content link existed anywhere — added to the shared `Nav` component.
- `verify_evidence`'s disclaimer included a non-sequitur "fit"/"criteria" sentence copy-pasted from `get_company_profile`'s own, unrelated design.

### test
- Investigated and found NOT reproducible: a claim that 200-level-deep nesting bypassed the PII depth guard (tested directly, both in isolation and through the full HTTP pipeline — correctly rejects every time).
- Investigated and found NOT a real gap: the search keyword field allegedly relying on placeholder-as-label (both actual search inputs already have a proper `<label>` or `aria-label`).
- Unit suite: 219 → 237. Full E2E suite re-extended and re-verified against production (62 passed, 2 graceful skips, both viewports). Lighthouse still 100/100/100/100 on all 4 pages.

## [Unreleased] — judging panel round 3 response (2026-11-12)

Round 3: trimmed mean **6.82**, another **hard-constraint violation** (2/5 judges, 2 bypass patterns distinct from round 2's) capped the effective score at 6.0. Full results `panel/round-3/`, full response DECISIONS.md D-029.

### fix
- **Hard constraint:** a case-ID shape in agency-prefix order ("DCSA-2026-0417") and real clearance-adjudication jargon naming no DISS/JPAS/NBIS system ("my SOR was adjudicated favorably... with T5 scope and CI poly", bare "adjudicated under e-QIP") both bypassed every existing PII/CUI detector. Widened the case-ID pattern to accept either order; added a new keyword-co-occurrence check (each token alone too short/generic to flag — "CI" collides with "Continuous Integration" in this domain).
- **Credit-card false positive on UUID-shaped identifiers** (4/5 judges independently reproduced) — D-027's own new credit-card shape check matched by coincidence inside an all-numeral `role_id` UUID. Added a UUID pre-strip scoped only to that one check.
- `search_defense_roles` multi-second tail latency (22.4s/11.0s outliers reproduced live) — root-caused to a transient upstream slowdown compounding across up to 4 sequential page-fetch retries. Added an 8-second deadline on the page-scan loop with an honest note when it triggers.
- "Secret security clearance" was classified to only the generic clearance fallback, not the specific `secret` level — that pattern required "secret clearance" immediately adjacent; made "security" optional between them.
- No MCP tool annotations were declared on any of the 11 tools, despite the original plan's own stated intent — added `readOnlyHint: true` (every tool here only reads/computes).
- `/try`'s 9-tool tab strip had zero visual affordance that it scrolls at mobile/tablet widths (measured: only 3-7 of 9 tabs visible, no arrow, no partial-tab peek) — added a fixed edge mask-image fade.
- `/try`'s `<title>` stayed the generic "Clearance Lens" — added a sibling Server Component layout so it gets the same "`<Page>` · Clearance Lens" template every other page has.
- A 2px horizontal overflow on mobile (header wordmark + toggle/button cluster) — reduced the row's gap below the `sm:` breakpoint.
- `get_company_profile`'s "currently open roles" figure can strain credulity against a company's own employee-count label (e.g. Anduril: 2,586 roles vs. 1,001-5,000 employees) — confirmed this is a general upstream-dataset characteristic (every company in the network shows a similarly high ratio), not a bug in this tool's own aggregation; added a plain caveat rather than "fixing" a number being faithfully passed through.

### feat
- `/try`: added dedicated tabs for `get_company_profile` ("Company profile") and `fit_debrief` ("Fit debrief") — previously reachable only via embedded flows (a dialog; the Job Preview debrief step), a reasoned choice after round 1 that fresh judges in both round 1 AND round 3 independently flagged again as "no UI entry point." Both embedded entry points are unchanged, not replaced.

### test
- Investigated and found NOT reproducible: the footer's "Status" link 404s (recruiter_user, trust_skeptic) — its actual `href` is `/api/health` (200 OK, live), not literally `/status` (404) — both judges appear to have guessed the URL from the link's visible text.
- Investigated and found NOT a real gap: `estimate_timeline` "never produces a true range" (candidate_user) — tested all 12 input combinations directly; `lapsed_gt_2y` genuinely returns a true 180/270 range. The judge's specific sample just didn't include that branch.
- Reconfirmed, not a new finding: the recurring "/try tabs don't switch" claim, via the same click-simulation-limited tool D-026 already root-caused — this round is the clearest confirmation yet, since the one judge using real Playwright screenshots did not reproduce it and instead found the real, different mobile-overflow bug above on the identical control.
- Fixed a pre-existing, intermittent flake in the homepage's own axe scan (caught live during this round's verification, not from the panel) — traced to `components/hero.tsx`'s one-time staged-reveal animation; scanning mid-CSS-transition could transiently change a chat bubble's computed contrast. Added a settle wait before scanning the homepage specifically; stable across 3 repeated runs.
- Unit suite: 237 → 251. Full E2E suite (70 passed, both viewports) against a fresh production build.

## [Unreleased] — judging panel round 4 response (2026-11-12)

Round 4: trimmed mean **7.49** (up from 6.82), median **7.90**, still capped at 6.0 by a hard-constraint flag from 1/5 judges. Full results `panel/round-4/`, full response DECISIONS.md D-030.

### fix
- **Architectural fix for the "/try tabs don't switch" finding, recurring across rounds 1, 3, and 4**: made tab switching robust to a bare `click` event (no preceding pointerdown/mousedown) directly, rather than keep re-investigating the same tooling artifact every round. `Tabs.Root` is now explicitly controlled with a belt-and-suspenders `onClick` on each trigger.
- **Self-inflicted regression**: D-029's "secret security clearance" fix made that pattern also match inside "Top Secret security clearance," double-counting one phrase as both `ts` and `secret` signals. Added a negative lookbehind.
- **2 more PII/CUI bypasses**: "DCSA case 2024-0045678" (bare "case" directly followed by a digit, no dash before the year); a fully spelled-out date ("born march second nineteen ninety two") with no digits at all for any numeric date-shape check to match.
- `explain_rule`'s own input description names "reciprocity" and "continuous_vetting" as example keywords, but neither resolved — the first is a category value, not a rule id; the second used an underscore where the real id uses a dash. Normalized separators before comparing and added a category-match tier that only resolves when a category uniquely identifies one rule.
- A 320px/375px homepage horizontal-overflow bug, traced to the header's wordmark+toggle+CTA cluster — shortened the CTA button's label below the `sm:` breakpoint.
- The nav CTA button's (and every other Button-component instance's) focus ring was correctly defined but animated in over the component's own 150ms transition, unlike every other focusable element on the site. Removed `box-shadow` from the transitioned properties.
- `run_job_preview`/`build_trial_assessment`'s `minutes` field gave a bare "Invalid input" on a bad value — added an explicit message naming the allowed values to both.

### test
- Investigated and found NOT reproducible: a claim that a too-long PII-containing string triggers the length-validation error instead of the PII-specific one — `wrap.ts`'s own pipeline order runs the PII guard strictly before zod validation, confirmed by direct re-reading and reproduction against production.
- Confirmed as deliberate, pre-existing design choices, not new bugs: a bare 9-digit number not being flagged on tools other than `prepare_consented_card` (D-027's own documented, reasoned scoping); an unrecognized top-level key being silently dropped while one nested inside `prepare_consented_card` is strictly rejected (that tool's own deliberate `.strict()`, not an accidental inconsistency).
- Unit suite: 251 → 260. Full E2E suite (78 passed, both viewports), protocol suite 14/14, Lighthouse 100/100/100/100/100 on all 4 pages.

## [Unreleased] — judging panel round 5 response (2026-11-12)

Round 5: trimmed mean **7.55** (up from 7.49), median 7.55, still capped at 6.0 by 2/5 judges, each a different hard-constraint category. Full results `panel/round-5/`, full response DECISIONS.md D-031.

### fix
- **Hard constraint: a PII/CUI bypass specific to the MCP transport.** An SSN in an undocumented extra `tools/call` argument field was silently dropped by the MCP SDK's own schema-based argument parsing before this project's `assertNoPiiCui` ever saw it (the REST `/api/tools/*` path was already unaffected, since it scans the fully raw body). Fixed by scanning the true raw `tools/call` body in a route-level wrapper, ahead of the SDK's own parsing, and returning the rejection in the same `result.isError:true` shape an in-schema PII rejection already uses (not a top-level JSON-RPC `error`, which most client SDKs throw as an exception instead of returning).
- **Hard constraint: a new PII/CUI category.** Classification/control markings ("SECRET//NOFORN", "(S//NF)") were accepted and echoed verbatim into `prepare_consented_card`'s shareable output. Added a `classification_marking` category, anchored on the "//" + a recognized control-marking abbreviation specifically, not a bare classification-level word (which remains legitimate self-attestation language elsewhere in this product).
- A leaked internal "product brief" authoring note in live `estimate_timeline`/`timelines.json` data (same class of bug as D-026's leaked Gate R→B annotation).
- `get_role_rubric`'s `sources[]` listed the same citation twice when two distinct signals mapped to the same underlying rule — deduplicated by URL.
- `search_defense_roles`' clearance filter matched a non-US posting (a real UK Leonardo listing) on a `clearance:"secret"` query, since its generic "unspecified clearance → presumed Secret" fallback wasn't geography-aware. Reused D-028's existing geography check (now exported and shared) and widened it to recognize ISO country codes ("Newcastle, GB"), not just spelled-out names.
- `estimate_timeline`'s min==max cases now explain, in the output itself, that the specific input returns a single figure because its source publishes only one average — not because no range was computed — after judges across 2 separate rounds happened to sample only no-range inputs and read this as the tool failing its own "range where the data supports one" promise.

### test
- Investigated and found NOT a bug: requirement-signal badges appearing "inert" on a bare click — confirmed this is `@radix-ui/react-tooltip`'s own standard behavior (opens on hover or keyboard focus, not a mouse click, per the WAI-ARIA tooltip pattern); both real interaction paths (hover, keyboard focus) already work correctly.
- Not changed, with reasoning: `run_job_preview`'s templated scene reuse across role types and duplicate upstream listings inflating `get_company_profile`'s role counts are both already-disclosed, acknowledged product characteristics, not newly-hidden defects.
- Added 2 new dedicated unit test files for previously-untested modules: `get-role-rubric.test.ts`, `role-shared.test.ts`.
- Unit suite: 260 → 276. Full E2E suite (76 passed, 2 graceful skips, both viewports), protocol suite 14/14 (including the existing declared-field PII test the MCP-transport fix's first draft broke and the second draft fixed), Lighthouse 100/100/100/100/100 on all 4 pages.

## [Unreleased] — Clearance Lens v2: signed self-attestation + GitLab evidence (2026-11-12)

User-directed feature work, run alongside the judging-panel loop, not a panel finding. Full reasoning and the two pending/paused pieces: DECISIONS.md D-032.

### feat
- **New tool `prepare_signed_attestation`.** Wraps a closed-vocabulary self-asserted claim (clearance level, citizenship status, available-from date — no free text) in an Ed25519-signed, W3C-Verifiable-Credential-shaped object. The candidate's own agent generates the keypair and signs entirely client-side (Node's native `crypto`, no new dependency); this server only verifies the signature and that the claims match what was actually signed — it never receives or sees a private key. Proves who signed a claim and when, never that the claim is true.
- **`verify_evidence` now also supports GitLab** as a second "already-public evidence" source, activated only by an explicit `gitlab.com` URL — every existing bare-username/github.com call is unaffected. GitLab's anonymous public API exposes meaningfully less than GitHub's (no bio/followers/created_at); those fields are honestly returned as `null` rather than a fabricated placeholder. Output gained a `platform: "github" | "gitlab"` field.

- **Confirmed, no code change (D-034): `prepare_consented_card` already satisfies piece #3, "per-company re-consent."** Every call requires a fresh `fields_user_approved` tied to that call's own `role_id` — there's no store, cache, or any other mechanism that could let one call's consent carry over to another, because the tool was never capable of persisting anything across calls in the first place (stateless architecture, D-001/D-002).

### test
- New dedicated test file for `prepare_signed_attestation` (9 cases: valid/multi-claim, tampering, wrong key, mismatched `issued_at`, empty claims, unknown claim key, malformed payload, disclaimer content).
- `verify_evidence`'s test file extended with a 4-test GitLab block (platform detection, honest-null fields, bare-username still defaults to GitHub, schema-level URL acceptance).
- New dedicated test file for `prepare_consented_card` (previously untested): basic card generation, the unverified-self-report note, never-submits-on-behalf, its `.strict()` unknown-field rejection, and the D-034 no-persistence regression (two different `role_id` calls never leak one's approved fields into the other's card).

## [Unreleased] — judging panel round 6 response (2026-11-12)

Round 6: trimmed mean **7.65**, uncapped — the first round with **zero hard-constraint findings** from any judge. Full results `panel/round-6/`, full response DECISIONS.md D-033.

### fix
- **New rule entry `laa-non-citizen`**: no tool explained that DoD clearance *eligibility* for a non-citizen (a Limited Access Authorization, 32 CFR § 117.10) is a separate, much stricter regime than ITAR's "U.S. person" test — capped at SECRET, granted only in "rare circumstances," scoped to one contract. Cross-linked both directions with `itar-us-person`.
- `explain_rule` still missed "green_card"/"lpr"/"permanent resident clearance" as synonyms for `itar-us-person` (same `keywords` mechanism as the new LAA entry closes this).
- **CORS/actual-method inconsistency on `/mcp`**: the preflight advertised `GET` as an allowed method, but a real `GET /mcp` always 405s in this stateless deployment. Narrowed the advertised methods to `POST, OPTIONS` to match actual behavior.
- Added `app/robots.ts`/`app/sitemap.ts` (standard Next.js 16 `MetadataRoute` generators) — previously missing entirely.
- `search_defense_roles`' detail-check gap was disclosed only in prose: `rolesScanned` counts every posting matching the search terms (up to 200), but only the first 25 ever get a detail fetch and requirement-signal check. Added `requirementSignalsCheckedCount` as its own output field so a calling agent can detect the gap without depending on prose.
- `build_trial_assessment` never disclosed that quoted rubric criteria carry the source posting's own typos verbatim (a real example: "Mange the Anduril Group 5 Mission Autonomy Systems Engineering homeroom"). The verbatim quoting itself is a deliberate anti-fabrication choice, not a bug — added a sentence to the existing `rubricRefinementNote` naming the tradeoff explicitly.
- **Self-inflicted regression, found while verifying the above, not from any judge**: the new `prepare_signed_attestation` tool (added for v2) was never added to the homepage's hand-maintained `TOOL_CARD_META` blurb map, so its card fell back to its full agent-facing description — which contains long unbroken code-snippet tokens — and overflowed the page at 320/375px. Fixed the instance (added the missing blurb) and the class of bug (`break-words` on the card description, so a future forgotten entry degrades gracefully instead of breaking layout).

### test
- Investigated, not reproducible: a claimed 3.36:1 dark-mode button contrast failure — actual computed color is the `on-solid-dark` token (`rgb(13,16,20)`), not white; hand-computed contrast ≈5.66:1, passes AA. Judge measurement error.
- Unit suite: 276 → 301 (includes both this round's regression tests and the v2 pieces' own new tests above). Full E2E suite (77 passed, 1 pre-existing skip), protocol suite 14/14, `linkcheck` 130 passed/0 failed, Lighthouse all 4 categories ≥95 on `/` and `/try` (desktop preset) after the tool-card fix.

## [Unreleased] — Clearance Lens v2: Cosign evidence source, aggregated signal, low-friction re-consent (2026-11-12)

The three compliant alternatives offered in place of a declined OAuth-ranking/cross-company-sharing request. Full reasoning: DECISIONS.md D-035 (declined) and D-037 (built).

### feat
- **`verify_evidence` now also supports Cosign** as a third, consent-only evidence source (activated only by an explicit `cosign.co` URL) — surfaces only the same thin public directory fields (name, linked handle, photo) anyone can already see, never Cosign's separate OAuth-gated endorsement data, never used to rank candidates.
- **New tools `contribute_anonymous_signal` and `get_aggregated_signal`** — the first stateful piece of this product. A candidate's agent can opt one role-interest into an anonymous pool (no identifier of any kind, only closed-enum buckets); anyone can read it back as rounded percentages, gated by a k-anonymity floor (5 contributors minimum, enforced per-bucket-value too, not just in total). Ships on a graceful in-memory fallback today — not yet durable in production pending a separate decision on provisioning Upstash Redis.
- **New MCP prompt `share_intro_card`** — makes re-consenting to share an intro card with a new company fast for the human (the agent remembers prior field choices in its own context and re-confirms quickly), while keeping every call's approval genuinely fresh (this server itself still remembers nothing, by design).

### fix
- `GitLabApiError` was added for the GitLab evidence path but never added to `lib/tools/wrap.ts`'s own error-handling check, so a nonexistent GitLab username silently fell back to a generic "please retry" instead of its own specific message. Fixed architecturally with a shared `UpstreamApiError` base class every upstream client error now extends, rather than naming a fourth (and future fifth) class by hand.

### test
- New dedicated test files for `lib/cosign/client.ts`, `lib/gitlab/client.ts` (previously untested), `lib/signal/store.ts`'s k-anonymity math, and both new tools.
- Unit suite: 301 → 344. Full E2E suite, protocol suite 14/14 (including the new prompt), `linkcheck` 130/0, Lighthouse clean on `/` and `/try`. Live-verified end-to-end: a real Cosign profile fetched correctly; 5 real contributions through the signal tools confirmed the k-anonymity suppression behavior matches the unit tests.

## [Unreleased] — judging panel round 7 response (2026-11-12)

Round 7 (clean re-run after D-036's voided contaminated attempt): trimmed mean **7.49**, median 7.65, capped at 6.0 by a hard-constraint violation from 1 of 5 judges. Full results `panel/round-7/`, full response DECISIONS.md D-039.

### fix
- **Hard constraint: no PII detector at all for email addresses or phone numbers.** `search_defense_roles`/`explain_rule`/`prepare_consented_card` all accepted and echoed contact info back verbatim, while every other documented category (SSN/DOB/passport/credit-card/classification-marking) was already caught in the same fields. Added `email`/`phone` categories to the PII/CUI guard.
- **`/try` had no UI for 3 of 14 tools** (`prepare_signed_attestation`, `contribute_anonymous_signal`, `get_aggregated_signal`) — added all 3 as full tabs. The attestation tab does real Ed25519 keypair generation and signing in-browser via the Web Crypto API, since that tool's design assumes the caller's own agent does this locally and `/try` has none.
- **"Stateless by design" / "What we store: Nothing" were no longer accurate** now that the anonymous-signal tools genuinely persist anonymous aggregate state — README.md and `/privacy` now state the one exception precisely.
- **No anti-fabrication protection on `contribute_anonymous_signal`** — a script could push 0→10 fake contributions in under 2 seconds with zero auth. Added a short per-role cooldown that defeats that exact burst pattern (explicitly not a complete fix for a more patient adversary, which both tools' disclaimers now say).
- Missing CSP header — added, scoped to what the app actually needs (checked first, not guessed).
- A borderline WCAG contrast ratio (4.58:1/4.63:1, essentially no safety margin above the 4.5 AA floor) — widened in both themes.
- `explain_rule` still missed "permanent_resident"/"permanent resident" as a synonym for `itar-us-person`.
- `get_company_profile`'s existing staleness caveat was scoped to hiring criteria only, not to profile fields like `stage` themselves, which can lag a company's real current status.
- `verify_evidence`'s `/try` tab was stale since the GitLab/Cosign additions (still GitHub-only copy, and would render a literal `null` for GitLab/Cosign's nullable fields) — fixed, and the tab renamed from "Verify GitHub" to "Verify evidence."

### test
- Investigated, not reproducible: a claimed "binary data" mislabel for 61+ repeated characters — tried 7 different characters across 3 tools at the exact described length boundary; never reproduced.
- Investigated, no action needed: `/try`'s raw pre-hydration HTML having no interactive elements — expected for a `'use client'` page; this project's own 86-test real-browser E2E suite confirms it's fully interactive once JS runs.
- New dedicated test coverage: 12 PII regression cases, 10 cooldown-mechanism tests, 3 keyword regression cases, 1 company-profile-caveat test, full E2E coverage for all 3 new /try tabs including a real end-to-end Ed25519 sign/verify round trip in a real browser.
- Unit suite: 299 → 365. Full E2E suite (85 passed, 1 pre-existing skip), protocol 14/14, zero CSP violations on every page, `linkcheck` clean, Lighthouse clean on `/` and `/try`.

## [Unreleased] — new tool: generate_interview_guide (2026-11-12)

The compliant alternative to "AI recruiter panels that score candidates," recommended by an earlier research sub-task and never built until now. Full reasoning: DECISIONS.md D-040.

### feat
- **New tool `generate_interview_guide`** — a structured interview guide for a startup's own human panel: posting-traced questions, strong/weak answer anchors, follow-up probes, and panel guardrails (no protected-characteristic questions, no soliciting export-controlled information). Structurally incapable of evaluating anyone — no candidate input field, no score-shaped output field. Grounded in Schmidt & Hunter (1998): structured interviews .51 vs. unstructured .38.
- Ships with its homepage card and `/try` tab in the same change, not as follow-ups.

### fix
- README's "stateless for N of M tools" count was off by one since round 7 (the stateful exception is two tools, not one) — now 13 of 15.

### test
- 9 new unit tests; unit suite 365 → 374. E2E 87 passed (1 pre-existing skip), protocol 14/14.

## [Unreleased] — judging panel round 8 response (2026-11-12)

Round 8: trimmed mean **7.61**, median **7.90** (highest median yet), capped at 6.0 by a hard-constraint finding. Full results `panel/round-8/`, full response DECISIONS.md D-042.

### fix
- **Hard constraint: bare numeric birthdates** ("01/15/1990", "1990-01-15") passed the PII guard without a "DOB"/"born" keyword. Any day-precise date at least 16 years in the past is now caught; recent and future dates are unaffected.
- **Hard constraint: SSN fragments split across intro-card fields with filler between them** passed the cross-field check. An explicit SSN reference plus 9+ digits anywhere in the card is now rejected — a rule decoy digits can't defeat.
- `search_defense_roles` discarded every result when one later page failed upstream (the speedrun API intermittently returns HTTP 500 on individual pages). Earlier pages' results now survive with a note, and later pages skip retry backoff that had pushed a failing call to 26 seconds. Zero-result guidance now states only a16z speedrun companies are searched.
- **The shareable signed credential couldn't be verified by its recipient** — it omitted the exact signed bytes. Now included, with a key fingerprint.
- `estimate_timeline` returned identical numbers for `employer_has_fcl` "yes" and "no"; the sourced 90–270 day sponsorship wait is now in the structured estimate, and in its own `employerFclWaitDays` field.
- `/try` server-rendered nothing until JavaScript loaded; it now renders the nav, intro, every tool's name, a loading state, and a `<noscript>` note.
- A question about "NBIS and DISS record systems" was rejected as pasted record content.
- The hero transcript read half-typed to screen readers mid-animation (now a static copy for assistive tech), and was labeled "live" though scripted.
- `/sources` omitted the a16z speedrun data source and two research citations.
- `readiness_brief.recruiterQuestions` renamed `questionsToAskTheRecruiter` (they're questions to ask, not from).

### feat
- **New tool `verify_signed_attestation`** — the recipient's half of `prepare_signed_attestation`: checks a credential was signed by the key it names and hasn't been altered, returns its claims and a key fingerprint for recognizing repeat signers. Never that the claim is true. Ships with its `/try` tab.

### test
- A test now requires every URL any tool cites to appear on `/sources` and in `SOURCES.md` (mutation-checked).
- Unit suite 374 → 409. E2E 88 passed / 2 skipped, including a real-browser sign → share → verify round trip. Protocol 14/14.
