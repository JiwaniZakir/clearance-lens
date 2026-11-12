# R1 — Leverage, Don't Rebuild

**Status:** Complete. **Verified:** 2026-11-11, live — npm registry, GitHub (API + raw source), official docs, and direct HTTP calls to the speedrun Talent Network API itself. Nothing below is from training memory where a version, count, or current status is asserted; every such claim carries a source URL and, for live data, the exact query and timestamp context used to get it.

**AgentMux note:** per this task's instructions, `mcp__agentmux__search_offerings` was called once before starting; it returned `gateway-unavailable`, so all research below used WebSearch/WebFetch/direct HTTP (curl) instead, as instructed.

---

## 0. Ground-truth sanity check

The brief asked me to confirm (not re-derive) a set of already-verified facts, but sanity-check and loudly flag anything that contradicts them.

| Claim in the brief | Result | Evidence |
|---|---|---|
| `@modelcontextprotocol/server` **v2.4.0** + `@modelcontextprotocol/client` **v2.4.0** are current, and are *not* the old v1 `@modelcontextprotocol/sdk` | ✅ **Confirmed**, independently, two ways | `node_modules/@modelcontextprotocol/server/package.json` on disk reads `2.4.0`; `registry.npmjs.org/@modelcontextprotocol/server/latest` also reads `2.4.0` today. The old `@modelcontextprotocol/sdk` line is still separately published and alive at **v1.32.2** ([npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)) — it hasn't disappeared, it's just the line this project correctly avoids per `DECISIONS.md` D-003b. |
| `mcp-handler` v2.3.1's `peerDependencies` is exactly `{"@modelcontextprotocol/server": "^2.0.0", "next": ">=13.0.0"}` | ✅ **Confirmed**, exact string match | Local `node_modules/mcp-handler/package.json` and the live [npm registry record](https://www.npmjs.com/package/mcp-handler) both return that identical object today. |
| `@modelcontextprotocol/inspector` v2.15.0 depends on the same v2 `{core,client,server}` family | Not contradicted | Registry confirms `2.15.0` is current latest ([npm](https://www.npmjs.com/package/@modelcontextprotocol/inspector)); the family relationship itself was already verified in `DECISIONS.md` D-003b via context7 and wasn't re-walked here (out of this brief's scope to re-derive, per the instructions). |
| `zod` required by `@modelcontextprotocol/server` is `^4.2.0`; 4.6.7 is installed | ✅ **Confirmed exactly** | `node_modules/@modelcontextprotocol/server/package.json` → `"dependencies": {"zod": "^4.2.0", "@modelcontextprotocol/core": "2.4.0"}`. Installed zod is `4.6.7`, which satisfies `^4.2.0`. |
| Next 16.4.6 / React 19.3.0 / Tailwind 4.3.3 / TypeScript 5.9.3 / zod 4.6.7 installed | ✅ Confirmed, with one minor non-blocking note | All five match `node_modules` exactly. **Note:** the npm-latest versions today are React **19.3.1** (published 2026-10-14, [npm](https://www.npmjs.com/package/react)) and Tailwind **4.3.5** (published 2026-11-06, [npm](https://www.npmjs.com/package/tailwindcss)) — both are patch releases one or two bumps ahead of what's installed. Next itself (`16.4.6`) *is* the current npm-latest, published 2026-11-09 ([npm](https://www.npmjs.com/package/next)). None of this blocks anything; flagging only because the brief asked for current-version sanity checks. No action recommended unless a specific patch-note bug is hit. |
| D-001 (Cache Components left off) | Not relitigated, per instructions. |
| speedrun Talent Network API: base URL, no-auth, open CORS, edge-cached, endpoint list, pagination contract (`page`/`page_size=50`/`total_pages`/`has_more`/`next_page`, capped at page 200) | ✅ Confirmed live, in detail — see §1 below. |
| `industry=defense_space` facet alone returned **58 roles** in a sample query | 🚩 **Contradicted — flagging loudly, as instructed.** Live today it is **3,471 roles**, confirmed two independent ways within minutes of each other: (a) `GET /api/v1/jobs?industry=defense_space` → `"total":3471`; (b) the `facets.industry` array returned inside a *separate, unfiltered* `GET /api/v1/jobs` call independently reports `{"v":"defense_space","n":3471}`. See §1.5 for the likely (labeled-synthetic) explanation and the resulting engineering recommendation: **never hardcode a count from this API anywhere** (UI copy, tests, docs) — always fetch it live. |
| Companion MCP at `mcp.speedrun-talent-network.com/mcp` with the listed tool names | Not independently re-tested — out of scope for this brief's 6 questions (Q6 is about the Inspector tool, not about exercising that server). The Inspector invocation pattern in §6 applies to it too if ever needed. |

---

## 1. Speedrun Talent Network API — full field schemas (Q1)

Fetched directly: `https://speedrun-talent-network.com/api/v1/openapi.json` (OpenAPI 3.1, API's own self-reported `info.version: "1.5.0"` — a separate number from the MCP SDK versions above, don't conflate them). Every field below is from that live spec, cross-checked against real live responses (not guessed). Full raw spec saved for reference at `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/openapi.json` for this session.

### 1.1 `Job` — the shape returned inside `GET /jobs` search results

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID; first-8-hex-chars prefix also works as a lookup key for `/jobs/{id}`. |
| `title` | `string` | |
| `company` | `string` | Display name; literally `"Stealth"` when the role is masked. |
| `company_slug` | `string \| null` | **Nullable.** |
| `company_url` | `string \| null` | **Nullable.** Absolute `/companies/...` URL, "when one exists." |
| `url` | `string` | Canonical absolute job URL — link users here. |
| `location` | `string \| null` | |
| `workplace_type` | `string \| null` | `Onsite \| Hybrid \| Remote` (Ashby's vocabulary — many source postings are Ashby-backed under the hood). |
| `employment_type` | `string \| null` | `FullTime \| PartTime \| Intern \| Contract \| Temporary`. |
| `function` | `string \| null` | `engineering\|research\|product\|design\|sales\|marketing\|operations\|other`, plus a wider classified set (`data`,`growth`,`customer`,`finance`,`legal`,`people`,`business_development`,`strategy`,`executive`,`hardware_manufacturing`) while that classifier is live. `null` = not yet classified. |
| `seniority` | `string \| null` | `founding\|exec\|staff\|senior\|junior\|intern`. |
| `remote` | `boolean` | **Required.** |
| `comp_min` / `comp_max` | `number \| null` | In `comp_period` units; annual by convention when `comp_period` is `null`. |
| `comp_currency` | `string \| null` | |
| `comp_period` | `"year"\|"hour"\|"month"\|"week"\|"day"\|null` | Non-annual bands are display-only — excluded from the `comp`/`comp_max` filters and from comp facet counts. |
| `published_at` | `string \| null` | ISO datetime. |
| `stealth` | `boolean` | **Required.** |
| `cohort` | `string \| null` | speedrun cohort tag (e.g. `SR007`). |
| `tier` | `"speedrun"\|"a16z"\|"market"\|"universe"` | Present only while the universe-scope/wider-market feature is live (it is, today — see §1.5). |

Required: `id, title, company, url, remote, stealth`.

### 1.2 `JobDetail` — the shape returned by `GET /jobs/{id}`

**This is a genuinely different shape from `Job`, not just a superset — worth being precise about:**

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `status` | `"open"\|"closed"` | **New field, not on `Job`.** Per spec: on `closed`, only `id/title/company/url` stay meaningful; `apply`/`description_text` go `null`. (Not independently verified live — no closed-role id was sampled — stated per the API's own schema.) |
| `url`, `title`, `company`, `company_slug`, `company_url` | as `Job` | |
| `tier` | `"speedrun"\|"a16z"\|"market"\|"universe"` | |
| `stealth` | `boolean` | |
| `location`, `workplace_type`, `employment_type`, `function`, `seniority`, `remote` | as `Job` | |
| `comp_summary` | `string \| null` | **New field.** Human-readable pay summary. |
| `comp_min`, `comp_max`, `comp_currency`, `comp_period`, `published_at` | as `Job` | |
| `apply` | `{kind: "onsite"\|"external", url: string} \| null` | **New.** `onsite` = candidate applies on the job URL itself; `external` = hands off to the company's own careers page. Confirmed live: Anduril's SDET role returned `{"kind":"external","url":"https://boards.greenhouse.io/andurilindustries/jobs/5277965007?gh_jid=5277965007"}`. |
| `description_text` | `string \| null` | **New.** Plain text, HTML stripped, capped at 15,000 chars. Null on closed roles. Confirmed live — full real job description returned, ~4,500 chars for the sampled role. |
| `labels` | object or `null` | **New.** `{function, specialty, seniority, min_experience, workplace, engagement, founding_role: boolean\|null, ai_native_role: boolean\|null}`. Confirmed live, fully populated for the sampled role (e.g. `specialty: "QA and test automation"`, `min_experience: "1 to 2 yrs"`). |

Required: `id, status, url, title, company, tier, stealth`.

**🚩 Concrete finding: `JobDetail` has no `cohort` field.** `Job` (the search-result shape) has `cohort`; `JobDetail` (the single-role shape) does not — confirmed both in the schema (not in `JobDetail`'s property list) and empirically (`Object.keys()` on a live `GET /jobs/{id}` response had no `cohort` key at all, not even `cohort: null`). **This project's own `lib/speedrun/types.ts` currently gets this wrong**: `SpeedrunJobDetail extends Omit<SpeedrunJobSummary, "function">`, which inherits `cohort: string | null` from `SpeedrunJobSummary`. At runtime, reading `.cohort` off a real `JobDetail` object will be `undefined`, not `null` — a silent type/runtime mismatch (e.g. a `=== null` check would be `false`, not `true`, for an absent key). **Recommendation:** have `SpeedrunJobDetail` *not* inherit `cohort`, or mark it `cohort?: undefined` explicitly so the gap is visible in the type.

**🚩 Second concrete finding: `company_slug`/`company_url` are nullable on `Job`, but typed as plain `string` (non-nullable) in `lib/speedrun/types.ts`'s `SpeedrunJobSummary`.** The spec is explicit that stealth roles mask the company ("Stealth roles are masked (company 'Stealth', no company link) before they ever leave the query layer"), which strongly implies `company_slug`/`company_url` go `null` for those roles. This wasn't hit in manual testing because stealth roles are vanishingly rare in the live data — the unfiltered facets today show `"stealth": 1` out of 23,475 total roles — so a type error here could lurk until a fuzz/red-team test or real traffic happens to surface that one role. **Recommendation:** widen both fields to `string | null` in the existing type.

### 1.3 `Company` — `GET /companies` (list) vs `GET /companies/{slug}` (detail) are also different shapes

List-view fields (confirmed live against a real response for Anduril): `slug, name, url, tier, cohort, open_roles, location, industries[], blurb, logo`. Required: `slug, name, url, tier, open_roles`.

Detail view (`GET /companies/{slug}`) returns everything above **plus**:

| Field | Type | Notes |
|---|---|---|
| `labels` | object, nullable | `{stage, size, business_model, industry, frontier_lab: boolean\|null, big_tech: boolean\|null, ai_native: boolean\|null, hardware: boolean\|null}`. Confirmed live for Anduril: `{"stage":"growth or late stage","size":"1,001-5,000","business_model":"hardware","industry":"Defense & Space","frontier_lab":false,"big_tech":false,"ai_native":false,"hardware":true}`. Spec explicitly calls this **"Company detail only"** — confirmed: the list-view sample had no `labels` key at all. |
| `jobs` | array | See the 🚩 finding right below — this is the operationally important one. |

**🚩 Major operational finding: `GET /companies/{slug}` embeds the company's *entire, unpaginated* open-roles list, every time.** There is no `page`/`limit` parameter on this endpoint for the nested `jobs` array (unlike `/jobs` and `/collections/{slug}`, which are both paginated at 50/100 per page). Live proof: `GET /companies/anduril-industries` returned **2,586 embedded jobs in one response, totaling ~1.05 MB of JSON**, because Anduril's own `open_roles` count is 2,586. Each nested job uses yet a **third, reduced shape** — `{id, title, url, location, workplace_type, employment_type, comp_summary, comp_min, comp_max, comp_period, published_at}` (required: `id, title, url`) — missing `comp_currency`, `function`, `seniority`, `remote`, `stealth`, and `tier` relative to `Job`/`JobDetail`.

**Why this matters for the build:** the planned `get_company_profile` tool (spec §3.1) calls this endpoint. For a large employer (several speedrun/a16z-portfolio defense primes have thousands of open roles), a naive passthrough would return a multi-megabyte tool result to the calling agent — bad for token cost, latency, and MCP client limits. **Recommendation: `get_company_profile` must cap/summarize the embedded `jobs` array itself** (e.g., return `open_roles` as the count plus the first N roles, or omit the array entirely above some threshold and tell the agent to call `search_defense_roles?company=<slug>` instead, which *is* paginated). This is a concrete, now-known constraint to design around, not a hypothetical.

**🚩 Minor finding:** `lib/speedrun/types.ts`'s single `SpeedrunCompany` interface declares both `labels` and `jobs` as *required* fields, but the live list endpoint (`GET /companies`) returns neither. If that one interface is reused to type list-endpoint responses, it's lying about what's actually there. **Recommendation:** split into a `SpeedrunCompanyListItem` (no `labels`/`jobs`) and `SpeedrunCompanyDetail` (both present) — or mark both optional.

### 1.4 Other schemas confirmed from the spec (for completeness, since the brief asked for "every field name and type")

**`Collection`** (`GET /collections`): `slug, title, description: string|null, group: "pinned"|"industries"|"hubs"|"investors"|"signals", url, companies: int, roles: int, portfolio_members: int`. Required: `slug, title, group, url, companies, roles`.

**Collection member** (nested in `GET /collections/{slug}`, paginated 100/page): `rank: int, name, slug: string|null, url: string|null, tier, cohort: string|null, open_roles: int, location: string|null, blurb: string|null, stage: string|null, remote_policy: string|null, investors: string[], functions: string[], cities: string[], logo: string|null`. Required: `rank, name, tier, open_roles`.

**`Error`** (all 4xx/5xx responses): `{"error": {"code": string, "message": string}}`. Confirmed live verbatim — see §1.5.

**`GET /stats/hiring`**: `live_jobs, hiring_companies, remote_jobs, comp_posted, function_mix: [{function,n}], comp_bands: [{function,n,p25,median,p75}], top_cities: [{city,n}], portfolio_split: [{label,n}], notes: string`.

**Pagination, confirmed live and precisely:** `page` is 0-based; `/jobs` is 50/page, `/companies` and `/collections/{slug}` members are 100/page; the documented hard cap is `page<=200`. Tested both boundary values live: `page=200` returns a normal `200` with `jobs:[]` (or a final partial page, depending on filters) and `has_more:false, next_page:null`; `page=201` **also** returns a normal `200` (not a `400`) with `jobs:[]` and the same `has_more:false` — i.e., paging past the cap degrades gracefully to an empty page rather than erroring, which is good defensive behavior to rely on (don't assume you need to special-case `page>200` as an error).

### 1.5 Live data behavior worth knowing before writing the client

**Transient 500s under rapid sequential requests, confirmed live today.** Firing four `GET` requests back-to-back with no delay produced `{"error":{"code":"internal","message":"query failed"}}` (the documented `Error` shape) on three of the four. Spacing requests ~4 seconds apart made every subsequent call succeed cleanly. This is a direct, live reproduction of exactly the kind of flakiness the original brief referenced ("one past attempt stalled at 159 of 209") and is evidence, not speculation. **Good news:** `lib/speedrun/client.ts` already has `MAX_RETRIES = 3` — this finding validates that design decision; just make sure the retry uses a real backoff (not an immediate retry), since four *immediate* retries in my test still mostly failed.

**The "58 vs 3,471" discrepancy, with a labeled-synthetic explanation.** The hard numbers (confirmed twice, live, minutes apart): unfiltered total today is **23,475** jobs in the default (`portfolio`) scope, with **36,691** more jobs sitting "`beyond_portfolio`" (i.e., in the wider `everywhere` scope) — nearly 60,000 roles total across tiers. Within that, `industry=defense_space` matches **3,471**, not 58. *(Synthetic/inferred, not confirmed by any speedrun changelog — none was found):* the spec's own field descriptions repeatedly flag company/industry classification and the "universe scope" as features that are **"present only while X is enabled/live"** — i.e., explicitly feature-flagged, partially-rolled-out machinery, not a finished, stable dataset. The simplest explanation consistent with that is that industry classification coverage has expanded a lot since whatever moment produced "58," rather than the API being wrong or the filter being broken (the filter *is* working correctly — the same number, 3,471, comes back whether you apply the filter directly or read it out of an unfiltered query's facet counts). **Decisive recommendation: treat every count from this API as point-in-time. Never hardcode a specific number (in UI copy, a test assertion, or a doc) — always fetch it fresh at request/render time**, and if a test needs a stable number, assert a *shape* (e.g., "> 0", "has an `industry` facet containing `defense_space`") rather than an exact count.

---

## 2. UI stack fit-check: shadcn/ui CLI vs. Next.js 16 + Tailwind v4 + React 19 (Q2)

**Decision: GO — attempt `npx shadcn@latest init` first; fall back to hand-building only if it concretely fails.** Not a coin-flip hedge — here's why this is the decisive call and not just a pros/cons list:

1. **The CLI is current and fresh.** `shadcn` on npm (the CLI package; the project was renamed from `shadcn-ui`) is at **4.23.0**, published **2026-10-27** ([npm](https://www.npmjs.com/package/shadcn)) — about two weeks before this check, not a stale release.
2. **Tailwind v4 + React 19 support reads as the current default, not an experimental canary.** Official docs state plainly: *"All components are updated for Tailwind v4 and React 19"* ([ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4)), and this generalizes non-breakingly — existing Tailwind v3/React 18 projects are unaffected; only new scaffolds default to v4/React 19. One earlier GitHub discussion thread ([#6714](https://github.com/shadcn-ui/ui/discussions/6714)) frames this as "canary-only," but that thread predates the current 4.23.0 release by a long way and reads as a historical snapshot, not the current state — the *current* docs page makes no canary caveat.
3. **No current, broad GitHub issue ties Next.js 16 + Tailwind v4 + React 19 together as a blocking combination.** Checked issue status/dates directly via the GitHub API for the CLI's most-discussed init-time bugs:

   | Issue | Opened | State | Verdict |
   |---|---|---|---|
   | [#12648](https://github.com/shadcn-ui/ui/issues/12648) ENOENT installing deps | 2026-11-09 | open, 1 comment | Too fresh/thin to be a confirmed systemic issue; reads as environment-specific. |
   | [#9874](https://github.com/shadcn-ui/ui/issues/9874) bun vs npx | 2026-03-07 | open, 2 comments | Package-manager detection edge case, unrelated to Tailwind/React/Next versions. |
   | [#9227](https://github.com/shadcn-ui/ui/issues/9227) `cb.apply is not a function` | 2025-12-29 | open, 1 comment | Generic CLI bug, not version-combination-specific. |
   | [#8552](https://github.com/shadcn-ui/ui/issues/8552) "init not working" | 2025-10-23 | open, 11 comments | Over a year old relative to today; title too generic to attribute to this stack. |
   | [#7952](https://github.com/shadcn-ui/ui/issues/7952) "can't install despite Tailwind v4 already installed" | 2025-08-06 | open, 5 comments | The one issue that *is* Tailwind-v4-specific — but 15+ months old and low-engagement; most plausibly predates the stabilization implied by point 2. |

   None of these is a recent (last few weeks, i.e. since the 4.23.0 release), high-engagement report of a *current* break. Absence of such a report, after checking, is itself the useful signal here (and is reported as exactly that — an absence, not a guarantee).
4. **The CLI's own model minimizes risk either way.** `shadcn add <component>` **copies component source into the repo** (via `components.json` + the `cn()` helper) rather than installing an opaque dependency — so even a partial/messy `init` is easy to inspect and fix by hand, and a failed `init` costs little.
5. **This project already has every underlying primitive the generated code would use:** `@radix-ui/react-{accordion,dialog,slot,switch,tabs,tooltip}`, `class-variance-authority`, `clsx`, `tailwind-merge` are already installed (confirmed in `package.json`) at versions the CLI's own generated components target. `components/` and `lib/` currently have no `cn()` utility or `components.json` yet (confirmed — `components/` is empty; `lib/` only has `guard/` and `speedrun/`), so there's nothing to conflict with.

**Concrete fallback trigger:** if `npx shadcn@latest init` hangs past ~60 seconds or exits non-zero, abort it and hand-write the needed primitives directly against the already-installed Radix packages + CVA + `clsx` + `tailwind-merge` — zero added dependency risk either way, since steps 4–5 mean the two paths converge on the same underlying packages regardless.

---

## 3. PII/CUI detector approach (Q3)

**Decision: keep the existing hand-rolled module (`lib/guard/pii.ts`, already written) as the approach. Do not add `redact-pii`. Do not port Presidio's code; do use its published patterns as a reference checklist for specific edge cases, two of which are flagged below as genuinely worth adding.**

### 3.1 Why not `redact-pii`

- **Wrong trust model, categorically.** `npm view redact-pii` (latest **3.4.0**) shows its own `dependencies` as `{"lodash": "^4.17.21", "@google-cloud/dlp": "^4.1.0"}` ([npm](https://www.npmjs.com/package/redact-pii)) — `@google-cloud/dlp` is Google Cloud's **Data Loss Prevention API client**. Installing this package means its strongest detectors work by **sending the text to a third-party cloud API**, which is the exact opposite of this product's hard constraint that the server never receives/transmits user text for inspection by anyone else. This alone disqualifies it regardless of regex quality.
- **Heavy and likely wrong runtime fit.** A GCP client SDK dependency is not something you want pulled into an Edge Function for "no cold-start cost," and isn't necessary for a pure-regex use case.
- **Maintenance signal is weak.** The upstream repo ([solvvy/redact-pii](https://github.com/solvvy/redact-pii)) last pushed a commit **2023-08-31** and currently sits at 25 open issues, not archived but not actively maintained either.

### 3.2 Why not a direct Presidio port, but why its patterns are still useful

Presidio is Python-only (`presidio-analyzer`), so it can't be imported into a Vercel Edge/Node TypeScript function directly — a sidecar/microservice would be needed, which is disproportionate for this. More importantly, **Presidio's raw patterns are deliberately low-confidence and rely on a scoring+context (NLP) pipeline that this project doesn't have**, so copying the regexes without that pipeline would produce *worse* false-positive behavior than the current hand-rolled module, not better. Concretely (source fetched directly from Presidio's current repo, verbatim, below):

**Note on the repo's current location:** Presidio moved from `github.com/microsoft/presidio` to **`github.com/data-privacy-stack/presidio`** — confirmed via the GitHub API, which 301-redirects the old path (`microsoft/presidio`) to the new one; the repo is not archived. Also, the recognizer layout changed from one flat directory to `predefined_recognizers/{country_specific,generic,ner,nlp_engine_recognizers,third_party}/...`; the current US files live at `predefined_recognizers/country_specific/us/`. Cite the new location going forward, not the old `microsoft/presidio` URL.

`us_ssn_recognizer.py` ([current source](https://github.com/data-privacy-stack/presidio/blob/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_ssn_recognizer.py)), fetched verbatim:

```python
PATTERNS = [
    Pattern("SSN1 (very weak)", r"\b([0-9]{5})-([0-9]{4})\b", 0.05),
    Pattern("SSN2 (very weak)", r"\b([0-9]{3})-([0-9]{6})\b", 0.05),
    Pattern("SSN3 (very weak)", r"\b(([0-9]{3})-([0-9]{2})-([0-9]{4}))\b", 0.05),
    Pattern("SSN4 (very weak)", r"\b[0-9]{9}\b", 0.05),
    Pattern("SSN5 (medium)", r"\b([0-9]{3})[- .]([0-9]{2})[- .]([0-9]{4})\b", 0.5),
]
CONTEXT = ["social", "security", "ssn", "ssns", "ssid"]
```
`invalidate_result()` rejects: mismatched delimiters within one match, all-identical digits, an all-zero group or serial, area number `000`/`666`, and the canonical placeholder SSNs `123456789`/`987654320`/`078051120`.

**The key insight this surfaces:** Presidio scores a bare `XXX-XX-XXXX` string as only **0.05 ("very weak")** confidence *by itself* — it only becomes a confident hit combined with Presidio's separate context/NLP scoring layer. **This project's existing code does the opposite, correctly, for this use case**: `lib/guard/pii.ts`'s `SSN_DASHED` regex matches the 3-2-4 pattern **unconditionally**, no context required, and its own comment explicitly says this is deliberate — rejecting even well-known placeholder SSNs like `123-45-6789` is "the correct, safer behavior for a detector being red-teamed." Given the brief's own requirement ("zero tolerance for false negatives on SSN-shaped strings"), the already-built approach is the right one, and is in this specific respect *stricter* than Presidio's own default. **One more reason not to blindly port patterns:** Presidio's `SSN1` pattern (`\b([0-9]{5})-([0-9]{4})\b`) would, taken alone, also match an ordinary **ZIP+4 code** (e.g. `90210-1234`) — Presidio tolerates that at `0.05` because its downstream context engine suppresses it; copying the raw pattern without that engine would misfire on ZIP+4 codes.

**Two concrete, specific gaps worth closing, found by this comparison (not guessed):**
1. **Dotted SSN separator.** Presidio's `SSN5` pattern allows `.` as a group separator (`123.45.6789`) in addition to `-`/space; the current `SSN_DASHED` regex (`/\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/`) does not. **Recommend adding `.` to the separator character class** — low-risk, closes a real gap.
2. **SSA area-number exclusions, for accuracy only (not recommended as new logic).** The authoritative source ([SSA.gov, "Randomization"](https://www.ssa.gov/employer/randomization.html)) confirms area numbers `000`, `666`, and `900–999` have never been (and still aren't) issued — SSA's June 25, 2011 randomization reform removed the old area-number↔state mapping but *kept* those three exclusions. Presidio's own `invalidate_result` only checks `000`/`666`, not `900–999` — an incompleteness in Presidio itself relative to SSA's own page. **This is informational, not an action item**: adding area-number plausibility *validation* to Clearance Lens's detector would move it in the wrong direction (toward fewer true positives) for a product whose explicit design goal is "when ambiguous, prefer false positive over false negative." The existing code's choice to not attempt SSA-validity filtering at all is correct; don't add it.

**What correctly must *not* be flagged (already handled correctly, confirmed by inspecting the code):** US phone numbers are grouped 3-3-4 (`555-123-4567`), structurally distinct from SSN's 3-2-4 grouping, and the existing `SSN_DASHED` regex's exact `\d{3}[-\s]\d{2}[-\s]\d{4}` shape already can't match a phone number. ZIP+4 codes are grouped 5-4 (`90210-1234`) — also structurally distinct from 3-2-4, so also already safe, with one caveat: ZIP+4 *would* match Presidio's weaker `SSN1`/`SSN2` patterns, which is exactly why this project should keep *not* using those broader, low-confidence patterns.

`us_passport_recognizer.py` ([current source](https://github.com/data-privacy-stack/presidio/blob/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_passport_recognizer.py)), fetched verbatim — useful as a direct checklist for the two current US passport number formats:
```python
PATTERNS = [
    Pattern("Passport (very weak)", r"(\b[0-9]{9}\b)", 0.05),                 # legacy: 9 digits
    Pattern("Passport Next Generation (very weak)", r"(\b[A-Z][0-9]{8}\b)", 0.1),  # next-gen: 1 letter + 8 digits
]
CONTEXT = ["us", "united", "states", "passport", "passport#", "travel", "document"]
```
The current `lib/guard/pii.ts` passport check (`PASSPORT_CONTEXT` + a generic 6–9 char alphanumeric-with-a-digit token, context-gated) already covers both the all-digit legacy format and the letter-prefixed next-gen format as special cases of its broader token pattern, so no gap found here.

**Decision, stated plainly:** ship the existing hand-rolled module. It is fully inspectable, has zero runtime dependency risk, runs anywhere (Edge or Node) with no cold start, and — per the comparison above — is already calibrated more conservatively (safer) than Presidio's own defaults for this product's specific zero-false-negative requirement. Apply the one concrete fix (dotted SSN separator) as a cheap improvement.

---

## 4. Other public job sources: USAJobs, Greenhouse/Ashby/Lever (Q4)

**Decision: ship v0 speedrun-only. Do not add USAJobs or direct Greenhouse/Ashby/Lever calls now.** One paragraph of reasoning, as requested:

**USAJobs** ([developer.usajobs.gov](https://developer.usajobs.gov)) requires self-registering for an API key and sending it as a `Authorization-Key` header plus a `User-Agent` set to the registrant's email on every call ([Authentication guide](https://developer.usajobs.gov/Guides/Authentication)) — a new credential/account to provision and manage, which cuts against this project's "stateless, no-auth-needed" simplicity even though the request itself would be server-to-server, not end-user auth. **Greenhouse/Ashby/Lever** each expose a real, no-auth, public JSON endpoint per company — confirmed live today for Greenhouse (`GET https://boards-api.greenhouse.io/v1/boards/andurilindustries/jobs` → `HTTP 200` with a full job array, tested directly against Anduril's own board) and documented officially for the others (Ashby: `GET https://api.ashbyhq.com/posting-api/job-board/{boardName}` per [developers.ashbyhq.com](https://developers.ashbyhq.com/docs/public-job-posting-api); Lever: `GET https://api.lever.co/v0/postings/{site}?mode=json`, docs at `hire.lever.co/developer`) — but all three are **single-company lookups, not search indexes**; they answer "what are this one company's jobs" given a slug you already know, not "search across many companies." That's a different job than what `search_defense_roles` needs. Meanwhile, the speedrun API's own `JobDetail.description_text` already returns the full (15,000-char-capped) job description, and `JobDetail.apply.url` already links straight through to the originating ATS (confirmed live: Anduril's role resolved to a `boards.greenhouse.io` URL) — so even as a drop-in enrichment source for a company speedrun already returns, Greenhouse/Ashby/Lever would mostly duplicate data speedrun already provides, for three more HTTP integrations, three more data shapes to normalize, and three more sets of error/rate-limit handling, before the v0 MCP tools even exist yet. Given the project is already mid-build on the single speedrun integration (`lib/speedrun/client.ts` already exists) and the core value proposition is the eligibility/timeline/trial-assessment layer *on top of* job data rather than the breadth of the job index itself, this is exactly the kind of scope creep a v0 should defer. **Recommendation for the backlog, not for v0:** USAJobs is thematically strong for this product specifically *because* federal/.gov roles are clearance-adjacent by nature — worth a `PLAN.md` backlog line for v1, not a reason to delay v0.

---

## 5. Testing toolchain vs. Next.js 16 / React 19 (Q5)

No version re-picks below — only flags, as requested, checked against what's actually installed (`node_modules`) and today's state of each project.

| Tool (installed) | Finding | Risk level |
|---|---|---|
| **Vitest 5.1.0** | Real-world Next 16 + React 19 + Vitest 5 upgrades report **no required code changes** for the React/JSX side ([example PR](https://github.com/privet-kitty/albert/pull/36), [another](https://github.com/hyassuo/ss75-cmp/pull/28)). The one real Vitest-5-specific behavior change is that **mock histories now auto-clear between tests by default** (a Vitest 4→5 change, not Next/React-specific) — can silently surface previously-hidden shared-state bugs in an existing suite. Peer deps independently verified clean: installed `vite` resolves to **8.3.8** (satisfies vitest 5.1.0's peer `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`); `@vitest/coverage-v8` must be pinned to the *exact* same version as `vitest` (the peer spec is an exact `"5.1.0"`, not a range) — easy future trap if one gets bumped without the other. | Low. Watch the mock-clearing behavior if tests start failing after any future Vitest bump; nothing to do now. |
| **@playwright/test 1.65.0** | Matches Next 16's *own* declared `peerDependencies` (`"@playwright/test": "^1.51.1"`, confirmed from `next@16.4.6`'s own npm registry metadata) with room to spare. | None found. |
| **@axe-core/playwright 4.14.0** | Peer is `playwright-core": ">= 1.0.0"` — trivially satisfied. No current, specific GitHub/issue report found tying this version to a Next.js 16 App Router problem (checked directly; this is an honest absence-of-evidence, not a clean bill of health). **General best practice, not a version-specific bug:** run axe scans against a production build (`next build && next start`), not `next dev` — Next's dev-mode indicator/HMR overlay and React dev warnings are extra DOM that can occasionally confuse a generic a11y scan; this is standard practice independent of version numbers. | None confirmed; apply the production-build practice regardless. |
| **@lhci/cli 0.16.1** | Two concrete findings, both checked directly against the installed package: (1) **`@lhci/cli`'s own `package.json` declares `"engines": {"node": ">=22.19.0"}`** — confirmed by reading it directly — which is *stricter* than this project's own `package.json` `"engines": {"node": ">=20.9.0"}`. A contributor or CI runner on Node 20.x/21.x would satisfy the project's stated floor but fail to run the Lighthouse CI step specifically. **Recommend raising the project's engines floor to `>=22.19.0` to match, or at minimum documenting/pinning the CI job that runs `lhci` to a Node ≥22.19 image.** (2) A real peer-resolution bug *was* reported for `@lhci/cli` 0.16.0 — its `proxy-agent` dependency (`^6.5.0`) didn't satisfy `@puppeteer/browsers`' peer requirement of `>=8.0.1` ([GoogleChrome/lighthouse-ci#1196](https://github.com/GoogleChrome/lighthouse-ci/issues/1196)) — **but the exact version installed here, 0.16.1, already bumped `proxy-agent` to `^8.0.2`** (confirmed directly from the installed package's own `package.json`), and the resolved tree in this project's `pnpm-lock.yaml` has `@puppeteer/browsers@3.2.7` + `proxy-agent@8.0.2`, which satisfies the `>=8.0.1` requirement cleanly. **This specific bug is not present in what's actually installed.** No current Next-16-specific Lighthouse/output-format incompatibility was found in search. | **Medium** on the Node-engine mismatch (real, easy to hit, easy to fix); **none** on the proxy-agent bug (already resolved in the installed version) or on Next 16 output format. |

---

## 6. MCP Inspector against a remote Streamable HTTP server (Q6)

Confirmed from the Inspector's own CLI docs ([`clients/cli/README.md`](https://github.com/modelcontextprotocol/inspector/blob/main/clients/cli/README.md), package `@modelcontextprotocol/inspector`, latest **2.15.0**):

```bash
# List tools on a deployed remote server (Streamable HTTP, which this project's /mcp route is):
npx @modelcontextprotocol/inspector --cli https://clearance-lens.vercel.app/mcp \
  --transport http \
  --method tools/list

# Call a specific tool (exact --tool-arg value-passing syntax — JSON blob vs. repeated
# key=value — should be double-checked against `--help` at implementation time; the
# flag names themselves are confirmed, the precise argument-encoding convention was not
# pinned down to 100% certainty from the docs fetched today, so this is flagged rather
# than asserted):
npx @modelcontextprotocol/inspector --cli https://clearance-lens.vercel.app/mcp \
  --transport http \
  --method tools/call \
  --tool-name search_defense_roles \
  --tool-arg '<see --help for exact encoding>'

# Custom headers (repeatable), for if/when OAuth is added later per the brief's note:
npx @modelcontextprotocol/inspector --cli https://clearance-lens.vercel.app/mcp \
  --transport http \
  --header "Authorization: Bearer <token>" \
  --method tools/list
```

Key confirmed flags: `--cli` (activate CLI/non-UI mode), `--transport http` (Streamable HTTP, vs. the default which infers from the URL — a path ending in `/sse` infers SSE, otherwise `/mcp` infers HTTP, but passing `--transport http` explicitly is the safer, recommended habit regardless of path), `--method <mcp-method>` (`tools/list`, `tools/call`, `resources/list`, etc.), `--tool-name`/`--tool-arg` for `tools/call`, `--header` for custom headers (repeatable). This is consistent with the ground truth's note that Inspector 2.15.0 sits on the same v2 package family as this project's own server/client — no conflict found. The same invocation pattern applies to smoke-testing speedrun's companion MCP at `https://mcp.speedrun-talent-network.com/mcp` later, if that's ever useful.

---

## 7. Master use / don't use / why table

| Area | Package / approach | Verdict | Why |
|---|---|---|---|
| MCP server | `@modelcontextprotocol/server` 2.4.0 | **USE** | Current v2 line; already installed; `mcp-handler`'s own peer dep requires it. |
| MCP client (for protocol tests) | `@modelcontextprotocol/client` 2.4.0 | **USE** | Same v2 family; already installed. |
| MCP SDK | `@modelcontextprotocol/sdk` 1.x | **DON'T USE** | Old v1 line; still published/alive but superseded; `mcp-handler` doesn't depend on it at all. |
| Next.js adapter | `mcp-handler` 2.3.1 | **USE** | Vercel-maintained, exact peer-dep match confirmed twice (local + registry), stateless-by-default fits v0. |
| UI scaffolding | `npx shadcn@latest init` (4.23.0) | **USE (go, with a defined fallback trigger)** | Current, Tailwind v4/React 19 support reads as default-not-canary today, no current blocking issues found, copies source so low lock-in, converges with what's already installed either way. See §2. |
| UI fallback | Hand-build on existing Radix + CVA + clsx + tailwind-merge | **USE if and only if the CLI concretely fails** | All primitives already installed; zero added risk as a fallback. |
| PII/CUI detection | Hand-rolled regex module (`lib/guard/pii.ts`, already built) | **USE (keep)** | Fully inspectable, zero dependency/runtime risk, already calibrated *more* conservatively than Presidio's own default scoring for this product's zero-false-negative requirement. Add the one concrete fix noted (dotted SSN separator). |
| PII/CUI detection | `redact-pii` 3.4.0 | **DON'T USE** | Hard-depends on `@google-cloud/dlp` (sends text to a third party by design) — violates the core privacy constraint outright; also stale (no commits since 2023-08-31). |
| PII/CUI detection | Microsoft/data-privacy-stack Presidio, direct import | **DON'T USE** | Python-only; raw patterns are deliberately low-confidence and need Presidio's own context/NLP scoring layer to be safe, which this project doesn't have. |
| PII/CUI detection | Presidio's published patterns | **USE as a reference checklist only** | Verified current source reviewed line-by-line in §3; informed two concrete, specific improvements without adopting the library. |
| Job data | speedrun Talent Network API | **USE (primary, already integrated)** | No auth, open CORS, every field now mapped exactly (§1); two concrete type-safety gaps found and flagged for fixing; one operational payload-size constraint found and flagged. |
| Job data | USAJobs API | **DON'T USE for v0 — backlog for v1** | Needs a provisioned API key/credential; thematically strong later, scope creep now. |
| Job data | Direct Greenhouse/Ashby/Lever calls | **DON'T USE for v0** | Single-company lookups, not a search index; speedrun's own `description_text`/`apply.url` already cover most of what they'd add; live-confirmed Greenhouse works today but adds 3 more integrations for v0 doesn't need yet. |
| Unit/integration tests | Vitest 5.1.0 | **USE (already pinned, no change)** | Clean peer-dep chain confirmed; only watch the mock-auto-clear behavior change if future tests misbehave. |
| E2E tests | @playwright/test 1.65.0 | **USE (already pinned, no change)** | Satisfies Next 16's own declared peer dependency with room to spare. |
| Accessibility tests | @axe-core/playwright 4.14.0 | **USE (already pinned, no change)** | No current incompatibility found; run against a production build, not `next dev`, as general good practice. |
| Performance CI | @lhci/cli 0.16.1 | **USE (already pinned) — but raise/document the Node floor** | Installed version already fixed the known 0.16.0 proxy-agent/puppeteer peer bug; its own `engines` floor (Node ≥22.19.0) is stricter than this project's (≥20.9.0) — fix that mismatch. |
| Protocol conformance testing | `@modelcontextprotocol/inspector` 2.15.0, `--cli` mode | **USE** | Confirmed current CLI syntax for remote Streamable HTTP in §6; same v2 package family, no conflict. |

---

## Key sources

- speedrun Talent Network OpenAPI spec (primary source for §1): `https://speedrun-talent-network.com/api/v1/openapi.json`, plus live calls to `/api/v1/jobs`, `/api/v1/jobs/{id}`, `/api/v1/companies`, `/api/v1/companies/{slug}` made 2026-11-11.
- npm registry, fetched live 2026-11-11: [@modelcontextprotocol/server](https://www.npmjs.com/package/@modelcontextprotocol/server), [@modelcontextprotocol/client](https://www.npmjs.com/package/@modelcontextprotocol/client), [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk), [mcp-handler](https://www.npmjs.com/package/mcp-handler), [@modelcontextprotocol/inspector](https://www.npmjs.com/package/@modelcontextprotocol/inspector), [shadcn](https://www.npmjs.com/package/shadcn), [redact-pii](https://www.npmjs.com/package/redact-pii), [next](https://www.npmjs.com/package/next), [react](https://www.npmjs.com/package/react), [tailwindcss](https://www.npmjs.com/package/tailwindcss).
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4); [shadcn-ui/ui discussion #6714](https://github.com/shadcn-ui/ui/discussions/6714); shadcn-ui/ui issues [#12648](https://github.com/shadcn-ui/ui/issues/12648), [#9874](https://github.com/shadcn-ui/ui/issues/9874), [#9227](https://github.com/shadcn-ui/ui/issues/9227), [#8552](https://github.com/shadcn-ui/ui/issues/8552), [#7952](https://github.com/shadcn-ui/ui/issues/7952).
- Presidio, current location: [data-privacy-stack/presidio](https://github.com/data-privacy-stack/presidio); [`us_ssn_recognizer.py`](https://github.com/data-privacy-stack/presidio/blob/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_ssn_recognizer.py); [`us_passport_recognizer.py`](https://github.com/data-privacy-stack/presidio/blob/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_passport_recognizer.py).
- [SSA.gov — SSN Randomization](https://www.ssa.gov/employer/randomization.html).
- [USAJobs API Authentication guide](https://developer.usajobs.gov/Guides/Authentication); [Ashby public Job Posting API docs](https://developers.ashbyhq.com/docs/public-job-posting-api); Lever docs root `hire.lever.co/developer`; live-tested `https://boards-api.greenhouse.io/v1/boards/andurilindustries/jobs`.
- [GoogleChrome/lighthouse-ci issue #1196](https://github.com/GoogleChrome/lighthouse-ci/issues/1196).
- [MCP Inspector CLI README](https://github.com/modelcontextprotocol/inspector/blob/main/clients/cli/README.md).
