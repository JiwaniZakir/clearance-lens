# Iterations

One entry per build loop (spec §4). Goal → what shipped → test result → panel result (if run).

## Iteration 0 — Scaffold + Research kickoff (2026-11-11)
**Goal:** Working Next.js skeleton, repo + Vercel project linked, Phase R research running.
**Status:** done. Repo live at github.com/JiwaniZakir/clearance-lens, Vercel project `clearance-lens` linked, Phase R workflow launched (5 research agents + gate review).

## Iteration 1 — Core: MCP server, all 11 tools, Gate R→B applied (2026-11-11)
**Goal:** Every MCP tool built, registered, and live-tested through both the real MCP transport and the /try API route; Phase R's output integrated.
**Shipped:**
- `lib/tools/wrap.ts`'s `callTool` pipeline (size limit → PII/CUI guard → zod input → handler → zod output → structured error), proven with a toy tool before any real one was built.
- All 11 tools: `search_defense_roles`, `get_role_rubric`, `estimate_timeline`, `readiness_brief`, `build_trial_assessment`, `explain_rule`, `verify_evidence`, `run_job_preview`, `fit_debrief`, `get_company_profile`, `prepare_consented_card`.
- `app/mcp/route.ts`: all 11 tools + 3 resources (`rules`, `timelines`, `disclaimers`) + 3 prompts (`check_my_eligibility`, `prep_for_role`, `preview_the_job`).
- Phase R's 5 research reports + gate review landed, were read, and were applied: `data/rules.json`/`timelines.json` corrected (D-007), 4 concrete backlog fixes applied (D-008).
- Two real live bugs found and fixed during build, not left for the panel: a transient Speedrun 5xx not being retried (D-006), a nullable-field type lie in `lib/speedrun/types.ts` (D-008).
**Test result:** 149 unit tests passing, typecheck clean, lint clean. Full MCP-transport smoke test (handshake, tools/list, resources/list, prompts/list, every tool called) passing against local dev.
**Not yet done:** the entire web app (`/`, `/try`, `/privacy`, `/sources` are still the default scaffold — by far the largest remaining item per PLAN.md), protocol/e2e/a11y/perf/red-team/agent-eval/link-check tests, deployment, judging panel.
