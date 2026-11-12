# PLAN — Clearance Lens

**Status of this document:** written at the Gate R→B review (Phase R → Phase B), 2026-11-11. Phase B build work has already started concurrently in parts of this repo (see "Current build state" in each section below) — this plan reflects a snapshot taken during that review and should be re-checked against the live repo before each backlog item is picked up, not treated as a prediction frozen in time.

**Gate review disposition (full detail in `DECISIONS.md` D-007):** five research reports (`research/R1-leverage.md` … `R5-assessment-science.md`, `research/real-interview-guide.md`) and both data files (`data/rules.json`, `data/timelines.json`) were read in full. Both JSON files were already valid and well-sourced; two data-integrity corrections were made directly (an unsourced day-count upper bound in `timelines.json`, and an over-precise, unsupported date in `rules.json` — both detailed in D-007; note the entry is D-007, not D-006 — D-006 was taken concurrently by an unrelated Phase B decision about Speedrun API retry behavior while this review was in progress). No contradictions were found between reports. One non-blocking gap outside the five reports' explicit scope is flagged in the backlog (last item) rather than silently decided. `BLOCKERS.md` was left untouched — no genuine human-judgment-call gap was found.

**A note on staleness:** Phase B build work progressed very quickly, concurrently with this review — by the end of it, all 11 MCP tools had gone from 5 built to 11/11 built mid-document. Every section below was re-checked against the repo immediately before this document was finalized, but given the pace observed, re-verify file existence before acting on any specific backlog item rather than trusting the status column alone.

---

## 1. Architecture summary

Single Next.js 16 (App Router, TypeScript strict) project, deployed to Vercel, stateless by design (no database — `DECISIONS.md` D-001/D-002). Two public surfaces share one core:

```
                        ┌─────────────────────────┐
  MCP client ─────────► │ app/mcp/route.ts         │
  (Claude, Cursor, …)   │ Streamable HTTP, via     │──┐
                        │ mcp-handler +            │  │
                        │ @modelcontextprotocol/   │  │
                        │ server v2 (D-003b)       │  │
                        └─────────────────────────┘  │
                                                       ▼
                        ┌─────────────────────────┐  ┌──────────────────────────┐
  Browser ────────────► │ app/api/tools/route.ts  │  │ lib/tools/wrap.ts         │
  (/try playground)     │ app/api/tools/[name]/   │─►│  callTool(def, rawInput): │
                        │ route.ts (JSON POST)     │  │  1. input-size limit      │
                        └─────────────────────────┘  │  2. PII/CUI guard         │
                                                       │  3. zod input validate   │
                                                       │  4. def.handler(input)   │
                                                       │  5. zod output validate  │
                                                       └──────────────┬───────────┘
                                                                      ▼
                                                   lib/tools/registry.ts → TOOL_REGISTRY[]
                                                   (one array; adding a tool here is the
                                                    only step needed to expose it on BOTH
                                                    surfaces — this is the "one shared
                                                    lib/tools/* core" the spec requires)
                                                                      ▼
            ┌─────────────────────────────────────────────────────────────────────────┐
            │ Per-tool handlers (lib/tools/*.ts), drawing on:                          │
            │  • lib/rules-data.ts      ← data/rules.json      (13 cited rule entries) │
            │  • lib/timelines-data.ts  ← data/timelines.json  (investigation stats +  │
            │                                                   4 modifiers)           │
            │  • lib/companies-data.ts  ← data/companies.json  (curated per-company    │
            │                                                   criteria; empty by     │
            │                                                   design at v0)          │
            │  • lib/speedrun/{client,types,infer,extract-sections}.ts                 │
            │       (a16z speedrun Talent Network API client + requirement-signal      │
            │        inference + posting section extraction)                          │
            │  • lib/github/client.ts   (public GitHub REST signal lookup)             │
            │  • lib/disclaimers.ts     (canonical, reused-verbatim disclaimer strings)│
            │  • lib/tools/role-shared.ts (shared resolveRole() + signal matchers used │
            │        by every role-centric tool, by design — see its own doc comment) │
            │  • lib/guard/pii.ts       (the PII/CUI detector itself)                  │
            └─────────────────────────────────────────────────────────────────────────┘
```

The web app (marketing + `/try` playground + `/privacy` + `/sources`) is still the default `create-next-app` scaffold (`app/page.tsx`, `app/layout.tsx`, `app/globals.css` are all untouched; `components/` is empty) — it is the single largest remaining Phase B surface, fully specified by `research/R2-design-system.md`.

**Current build state at review time:** all 11 MCP tools are implemented and registered in `lib/tools/registry.ts`, and all 3 named MCP prompts (`check_my_eligibility`, `prep_for_role`, `preview_the_job`) are registered in `app/mcp/route.ts` — both landed while this review was being written (see tool-by-tool detail in §2). `app/mcp/route.ts` registers 2 MCP resources (`rules`, `disclaimers`); only a `timelines` resource is still missing from the MCP surface. Unit tests exist for most already-built pieces (`tests/unit/*.test.ts`, 13+ files and growing); `tests/e2e/` is configured (`playwright.config.ts`) but empty. The entire web app (`/`, `/try`, `/privacy`, `/sources`) is still the default `create-next-app` scaffold — this is now, by a wide margin, the single largest remaining body of work (§3), not tool/MCP-surface logic.

---

## 2. MCP tool specs (11), reconciled against R1/R4 and the live code

Baseline names/shapes are the master spec's original 11. Where a tool is already built, the spec below is the **actual, current** zod-level input/output (more useful to Phase B than the one-line original); where not yet built, it's the baseline plus research-backed guidance. All tools run through the same `callTool` pipeline (§1) — PII/CUI rejection, size limits, and the `sources[]`/`disclaimer` shape are structural, not per-tool choices.

| # | Tool | Status | Input | Output (shape) | Notes |
|---|---|---|---|---|---|
| 1 | `search_defense_roles` | **Built** | `{query?, clearance?: none\|secret\|ts\|ts_sci, itar_only?, location?, remote?, limit? (1–25, default 10)}` | `{roles[]: {id,title,company,companySlug,url,location,remote,workplaceType,compMin,compMax,compCurrency,publishedAt,requirementSignals[]}, rolesScanned, note, sources[], disclaimer}` | Backed live by the a16z speedrun Talent Network API (no auth, confirmed by R1 §1). Scans up to 4 pages (200 postings), detail-fetches up to 25 for signal extraction. Each `requirementSignal` is tagged `stated` (verbatim from the posting) or `inferred` — the master spec's "labeled inferred vs stated" requirement, confirmed implemented. **Backlog #1–2 below**: R1 found two live type-safety bugs in `lib/speedrun/types.ts` that feed this tool (a `cohort` field `SpeedrunJobDetail` doesn't actually have but inherits in its type; `company_slug`/`company_url` typed non-nullable when the API can return `null` for stealth roles). R1's "never hardcode an upstream count" finding (the 58-vs-3,471 discrepancy) doesn't apply here — this tool always queries live. |
| 2 | `get_role_rubric` | **Built** | `{role_id}` | `{roleTitle, company, eligibilityChecklist[]: {question, whyItMatters, basis}, skillsRubric[]: {skill, evidenceFromPosting}, questionsForAgent[], evaluate_locally: true (literal), instructionsForAgent, sources[], disclaimer}` | `evaluate_locally: true` is enforced as a literal type, not just a convention — matches the spec's "do not send private facts back to the server" instruction at the type level. Eligibility questions map detected signals to specific `rules.json` entries (`itar-us-person`, `sead4`) so every checklist item is traceable to a cited rule. |
| 3 | `estimate_timeline` | **Built** | `{target_level: secret\|ts\|ts_sci, current_status: none\|interim\|active\|lapsed_lt_2y\|lapsed_gt_2y, employer_has_fcl?: yes\|no\|unknown (default unknown)}` | `{estimate: {minDays, maxDays, medianDays (all nullable)}, keyDrivers[]: {label, detail}, uncertaintyNote, sources[], disclaimer}` | Reads `data/timelines.json`. Implements R4's headline finding directly (197-day Secret / 243-day TS end-to-end; investigation phase got faster, adjudication phase got slower, net roughly flat). One of this review's two data fixes (D-007) flows straight through this tool's `lapsed_lt_2y` output — a real, user-facing example of why the "no invented numbers" check matters, not just a paperwork exercise. |
| 4 | `readiness_brief` | **Built** | `{role_id}` | `{roleTitle, company, template: {eligibility: {prompt, agentFillsThisIn: true}, gaps: {prompt, agentFillsThisIn: true}, twoWeekPrepPlan: {prompt, suggestedFocusAreas[], agentFillsThisIn: true}}, recruiterQuestions[], evaluate_locally: true, instructionsForAgent, sources[], disclaimer}` | Three locally-filled template sections (eligibility / gaps / 2-week prep plan), each explicitly marked for the agent to complete, plus posting-derived recruiter questions (with a citizenship-specific one added when a citizenship signal was detected). Reuses `resolveRole()`/`extractSections()` as its own doc comment anticipated. Matches Persona C's ("Marcus" — R3 §2c) "what done looks like" closely: public facts separated from what the agent fills in, never a score (`DISCLAIMERS.notAScore`). |
| 5 | `build_trial_assessment` | **Built** | `{role_id, minutes: 60\|90\|180}` | `{roleTitle, company, minutes, taskShape, brief, deliverableRequirement, outOfScope[], rubric[]: {criterion, tracedToQuote, bands: {exceptional,proficient,developing,notDemonstrated}}, rubricRefinementNote, itarSafetyNote, limitsNote, sources[], disclaimer}` | Directly implements R5 §B's four-part Brief/Deliverable/Rubric/Exemplars structure and the exact 60/90/180 skeleton from R5 §B4, citing Sackett et al. (2022) and Callinan & Robertson (2000) inline. Every rubric criterion traces to a literal quoted bullet from the posting (R5 §B1's "sample, not sign" principle) — a clean, verifiable implementation of R5's central recommendation. |
| 6 | `explain_rule` | **Built** | `{topic (max 60 chars)}` | `{found, topic?: {id,title,category,summary,keyPoints[]}, availableTopics?[], sources[], disclaimer}` | Thin read over `data/rules.json`'s 13 entries (all re-verified this review; 1 correction — D-007). A miss returns the full topic list instead of a dead end. |
| 7 | `verify_evidence` | **Built** | `{github_username_or_url}` | `{profile: {login,name,profileUrl,bio,publicRepoCount,followers,accountCreatedAt}, topLanguages[]: {language,repoCount}, recentActivity[]: {repo,url,pushedAt,description}, sources[], disclaimer}` | Public GitHub REST API only. **Reconciliation note:** the original spec's input was "`github_username` or public URL" (any public URL); the built input is specifically a GitHub username/profile URL — a reasonable, explicit narrowing (nothing in R1 or the master spec's own tool table suggested verifying non-GitHub URLs), worth stating in any future spec revision rather than leaving implicit. |
| 8 | `run_job_preview` | **Built** | `{role_id, minutes: 20\|30}` | `{roleTitle, company, minutes, instructionsForAgent, scenes[]: {id,title,setup,choices[]: {id,label}, whatRealTeamsReportByChoice, requiresStatedRationale, debriefPrompts[]}, aggregateDebriefPrompt, polygraphNote, itarSafetyNote, sources[], disclaimer}` | Scene content lives in `data/job-preview-scenes.ts`. **Confirmed this review:** all 6 master-spec scenes exist with matching content (`standup_priority`, `ambiguous_spec`, `ethics_tradeoff`, `itar_moment`, `clearance_wait_week`, `scif_life`), with exactly 4 marked `includedInShortVersion` for the 20-minute version (`ambiguous_spec`/`ethics_tradeoff` is actually `standup_priority, ambiguous_spec, itar_moment, clearance_wait_week`) and all 6 for 30 minutes. Directly implements R5 §C's "play it straight, honesty-signal not expectation-management" findings — `aggregateDebriefPrompt` is R5 §C4's single most evidence-grounded question, verbatim. Polygraph is described, never simulated, per the master spec. |
| 9 | `fit_debrief` | **Built** | `{role_id, loved: Tag[] (default []), disliked: Tag[] (default [])}` — `Tag` is a closed enum from `data/fit-tags.ts` (work-style/values tags, not personality/demographic tags) | `{roleTitle, company, summaryTemplate, questionsToAskTheCompany[], shareDraft: {markdown, note}, sources[], disclaimer}` | Reuses `DISCLAIMERS.notAScore` as predicted. Explicitly surfaces the "loved AND disliked the same tag" case as a stated tension rather than averaging it away — a nice, evidence-consistent touch (R5 §C3's "real branches, real consequences" principle). `run_job_preview`'s `aggregateDebriefPrompt` already points here. Worth a spec-reconciliation note: the baseline spec's `Tag[]` wasn't itself defined by the master prompt — confirm `data/fit-tags.ts`'s tag set stays within the master spec's explicitly-banned-criteria list (no hobbies/schools/personality typing) when reviewing it. |
| 10 | `get_company_profile` | **Built** | `{company_slug (1–100 chars)}` | `{company: {slug,name,url,blurb,industries[],stage,size,businessModel}, criteria[]: {criterion,sourceUrl,jobRelevanceReason}, workRealities: {sampleSize,isFullRoster,workplaceMix,topLocations[],uniqueLocationCount,compRangeObserved}, gaps[], sources[], disclaimer}` | `criteria` is empty for every company today **by design** (`data/companies.json` starts as `{}`) — `gaps` always explains why, matching the master spec's "no published criteria → gaps, no fit read" hard constraint exactly. **Confirmed this review:** R1's payload-size concern (the upstream `GET /companies/{slug}` embeds a company's *entire unpaginated* `jobs[]` — up to ~1 MB / 2,586 roles for a large employer) is already mitigated **on output** — this tool returns only aggregates, never the raw per-job array — but the upstream *fetch* itself is still unbounded server-side. Backlog #3. |
| 11 | `prepare_consented_card` | **Built** | `{role_id, fields_user_approved: {headline?, clearance_status_self_reported?, citizenship_status_self_reported?, highlights?[max 5], github_username?, availability?, notes?} (`.strict()` — an unknown key is a validation error, not silently stripped)}` | `{roleTitle, company, card: {markdown, json}, notVerifiedNote, applyLink: {url,label}\|null, sources[], disclaimer}` | Ships exactly as predicted: `applyLink` only ever links to the role's own listing (`role.url`, labeled "Apply via `{company}`'s listing") — no `express_interest`-style submission exists because, per R1's live read of the speedrun OpenAPI spec, the upstream API doesn't expose one. `.strict()` on the approved-fields schema is a deliberate, well-reasoned choice called out in its own code comment: unlike most tool inputs (where an unknown field is harmlessly ignored per D-005), silently dropping part of what someone meant to make public is the wrong failure mode for a sharing tool, so it hard-errors instead. `notVerifiedNote` correctly singles out the two self-reported fields and reuses `DISCLAIMERS.neverVerifiesClearance`. |

Also per spec: MCP **resources** for `rules.json` and the disclaimers (both registered; a `timelines` resource is not yet added — backlog #4 below) and MCP **prompts** `check_my_eligibility`, `prep_for_role`, `preview_the_job` — all 3 are now registered in `app/mcp/route.ts`, each correctly chaining tools together (e.g. `prep_for_role` calls `readiness_brief` + `estimate_timeline`; `preview_the_job` calls `run_job_preview` then `fit_debrief`) while repeating "never a score" in the prompt text itself.

---

## 3. Page list

Four pages, all specified in full by `research/R2-design-system.md` (tokens in §2, the 18 named components in §3, Radix-primitive mapping in §4, ASCII wireframes in §5, the 10 Do/Don't rules in §6, and an explicit implementation checklist in §7 — follow that checklist's order when building). None of the four exist beyond the default scaffold yet.

| Route | Purpose | Key components (R2 §3) | Design notes |
|---|---|---|---|
| `/` | Landing: one-sentence hero + a **real rendered chat-transcript panel** (never a screenshot), install snippets, "how it works" privacy diagram, tool grid, FAQ, disclaimer, footer | `hero`, `install-snippet tabs-with-copy-button`, `tool-card` (×11, one per MCP tool), `disclaimer-banner`, `nav`, `footer` | R2 §5 wireframe; Do/Don't #6 (demonstrate the product as itself, never a mockup) and #1 (motion restraint) apply most here. |
| `/try` | Playground exercising the same `lib/tools/*` via `/api/tools/*` — no agent or LLM key required | `role-search-result-card`, `timeline-estimator-widget`, `rubric-checklist`, `trial-assessment-card`, `job-preview-scene-player`, `fit-debrief-summary`, `company-profile-card`, `source-citation-chip`, `loading-skeleton`, `error-state`, `empty-state` | The one page allowed dense/table-like per-tab filtering (R2 Do/Don't #2); every async call needs a shape-matched skeleton, never a spinner (Do/Don't #8). |
| `/privacy` | Exactly what's sent / stored (nothing) / logged (no bodies) / refused, with a worked PII-rejection example | Plain prose, ~680px column, no `disclaimer-banner` wrapper (the page itself is the disclaimer — R2's own note on this page) | Must match `lib/guard/pii.ts`'s actual categories/messages exactly — don't let this page's copy drift from the real rejection text. |
| `/sources` | Every rule + stat with links and last-verified dates, filterable/searchable | `source-citation-chip` (expanded row form), `Accordion` category groups | Pull directly from `data/rules.json` + `data/timelines.json` at build/request time — never hand-copy a source list here that can drift from the data files. |

---

## 4. Test plan summary

Eight categories per the master spec §5, wired into a single `npm run verify`. Current state as of this review:

| Category | Tool/approach | Current state | What's left |
|---|---|---|---|
| **Unit** | Vitest 5.1.0 (`tests/unit/*.test.ts`) | 13+ files already exist and growing (one per tool/module, e.g. `wrap`, `pii`, `infer`, `speedrun-client`, `github-client`, `data-integrity`, `get-company-profile`, `search-defense-roles`, `verify-evidence`, `build-trial-assessment`, `run-job-preview`, `extract-sections`, `role-template-tools`) | The dotted-SSN PII case (backlog #2); confirm `data-integrity.test.ts` asserts a non-empty source on every entry in **both** `rules.json` and `timelines.json`, not just one; a unit test for `fit_debrief`/`prepare_consented_card` specifically if `role-template-tools.test.ts` doesn't already cover them. |
| **Protocol** | `@modelcontextprotocol/inspector` v2.15.0, `--cli` mode, against the deployed `/mcp` (R1 §6 has the exact confirmed command syntax) | Not started | Run `tools/list`/`tools/call`/`resources/list` against a live preview deploy; double-check `--tool-arg`'s exact encoding against `--help` at that time (R1 flagged this one sub-detail as not 100%-pinned-down from docs alone). |
| **E2E** | Playwright 1.65.0 (`playwright.config.ts` configured: `tests/e2e/`, chromium desktop 1280×800 + Pixel 7 mobile, screenshot-on-failure) | Directory configured, empty | Drop R3 §3's 40 scenarios in nearly as-is (each already states its tool(s) and a mechanical pass criterion) once `/try` exists; install-snippet copy-button test; theme toggle; keyboard-only nav. |
| **Accessibility** | `@axe-core/playwright` 4.14.0 | Not started | Zero serious/critical violations on all 4 pages, run against a production build per R1 §5's finding (dev-mode HMR overlay can confuse a11y scans). |
| **Performance** | `@lhci/cli` 0.16.1 | Not started | **First fix the Node-engine mismatch R1 §5 found**: `@lhci/cli`'s own `engines` requires Node ≥22.19.0, stricter than this project's current `>=20.9.0` floor (D-002) — raise the floor or pin CI to a ≥22.19 image before relying on this step. |
| **Red team** | A subagent attempting PII leakage, ITAR-controlled content, hire/no-hire scoring, ranking, demographic inference, invented stats | Not started | Every successful attack → a regression test + a fix, per spec. `lib/guard/pii.ts`'s own doc comment already points at a ~50-case suite (`tests/unit/pii.test.ts`) as the calibration target for this. |
| **Agent-in-the-loop eval** | A subagent role-playing each R3 persona *as an agent user*, holding a fake private profile locally, never sending it to the server | Not started | Target ≥90% task-success per spec; R3's 40 scenarios are written to drop directly into this too. |
| **Link check** | Every source URL across `data/rules.json`, `data/timelines.json`, and all 5 research reports returns 2xx/3xx | Not started | Out of scope for this gate review (format/plausibility was checked, not live HTTP status — see `DECISIONS.md` D-007) — belongs here as its own CI step, likely a small script under `scripts/` (currently empty). |

---

## 5. Prioritized backlog for the build loop

In build order (schema/data → tool logic → MCP/API routes → UI → tests). **All 11 tools' own logic is now built** (§2) — the only "tool logic" left is the small, surgical fixes below, not new tools. This reshapes the backlog relative to what it would have looked like at the start of this review: schema-layer fixes are still first, but UI is now the dominant remaining body of work by far.

1. **[data/schema]** Fix the two live type-safety bugs R1 confirmed in `lib/speedrun/types.ts`: `SpeedrunJobDetail` inherits a `cohort` field it doesn't actually have (via `Omit<SpeedrunJobSummary, "function">`) — mark it `cohort?: undefined` or drop the inheritance; widen `company_slug`/`company_url` on `SpeedrunJobSummary` to `string | null` (stealth roles can return `null`).
2. **[data/schema]** Add `.` to `lib/guard/pii.ts`'s `SSN_DASHED` separator character class (`/\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/` → include `.`), per R1 §3.2's confirmed gap vs. Presidio's dotted-SSN pattern; add the case to `tests/unit/pii.test.ts`.
3. **[data/schema]** Add a size/latency guard on `get_company_profile`'s upstream fetch (`GET /companies/{slug}` can return ~1 MB / 2,586 embedded jobs for a large employer today — confirmed live by R1 §1.3). The tool's *output* is already safely aggregated; this is about the server-side fetch cost, not output size.
4. **[MCP route]** Add the `timelines` MCP resource (parallel to the existing `rules`/`disclaimers` resources) — the one piece of the MCP surface still missing; the 3 named prompts are already registered.
5. **[UI]** Follow R2 §7's implementation checklist in order: swap `app/layout.tsx` to the `geist` npm package fonts; replace `app/globals.css`'s placeholder 2-variable scheme with R2 §2.1's full token set; wrap the app in `next-themes`' `ThemeProvider`.
6. **[UI]** Scaffold `components/ui/` foundational atoms (Button, Badge, Card, Input/Select/SegmentedControl, Chip — R2 §3.0) before the 18 named components, since every named component composes from these.
7. **[UI]** Build the 18 named components (R2 §3.1–3.18) and the 4 pages (§2 of this doc / R2 §5's wireframes): `/`, `/try`, `/privacy`, `/sources`. By far the largest single item in this backlog — likely worth its own sub-split (e.g. one iteration per page) when actually planned in `ITERATIONS.md`.
8. **[tests]** Fix the Node-engine floor mismatch (`package.json` `engines.node` ≥20.9.0 vs. `@lhci/cli`'s own ≥22.19.0 requirement — R1 §5) before relying on the perf step.
9. **[tests]** Protocol conformance pass: MCP Inspector `--cli` against a deployed preview's `/mcp` (exact command syntax in R1 §6); build the Playwright e2e suite from R3 §3's 40 ready-made scenarios once `/try` exists; axe pass on all 4 pages against a production build.
10. **[tests]** Red-team + agent-in-the-loop eval passes per spec §5, using R3's 4 personas and 40 scenarios directly; a link-check script (under `scripts/`, currently empty) over every URL in `data/rules.json`, `data/timelines.json`, and the 5 research reports.
11. **[non-blocking research gap — flagged, not silently decided]** None of R1–R5 independently verified the hiring-bias-compliance-law citations the master brief's Hard Constraint #4 leans on for the "fit" output's legal framing (Title VII disparate impact, NYC Local Law 144, Illinois's AI notice law, Colorado's AI Act — status as of a 2026-2027 effective date should be re-checked, it has moved before — EU AI Act high-risk-hiring classification, and *Mobley v. Workday*'s current procedural status). This fell outside the five explicit R1–R5 assignments, not within any of them, so it wasn't a "vague answer" to flag as a gap in those reports — it's a new gap this review surfaced. Spawn a short just-in-time research pass (spec §4.2) on these before any UI copy, `explain_rule` content, or `/sources` entry names them by name or relies on their specifics.
