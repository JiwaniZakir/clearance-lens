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
