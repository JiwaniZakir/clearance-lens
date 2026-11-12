# Demo script (60 seconds)

A walkthrough showing an agent using the Clearance Lens connector end to end: eligibility check, timeline, job preview, trial assessment, consented card.

**Setup (before recording):** have Claude Code, Claude Desktop, or any MCP-capable agent already connected to `https://clearance-lens.vercel.app/mcp` (one-line install: `claude mcp add --transport http clearance-lens https://clearance-lens.vercel.app/mcp`).

---

**0:00 — The one-sentence pitch.**
Say: *"Clearance Lens is an MCP server — it lets my own agent help me figure out defense-tech eligibility, timelines, and prep, without me ever sending my personal details to a server."*

**0:05 — Eligibility check.**
Type to the agent: *"Can a green-card holder work the Anduril Fury role?"*
The agent calls `search_defense_roles`, then `get_role_rubric`, and answers using the ITAR "US person" distinction — citing 22 CFR 120.62 — entirely from what the tools returned, never asking you to state your citizenship to the server.

**0:20 — Timeline.**
Ask: *"If I had zero clearance history, how long before I could start?"*
The agent calls `estimate_timeline` and shows a sourced estimate (DCSA timeliness data — a single published quarterly average for a from-scratch case like this one, not an invented range) with an explicit uncertainty note and the interim-eligibility driver that can start sooner.

**0:30 — Job preview.**
Ask: *"Give me a 20-minute first-week preview for that role."*
The agent calls `run_job_preview` and walks through 1–2 scenes live (e.g. the ITAR moment: a foreign-national contractor asks for "the drawing") — show the choice, the real consequence, the debrief question.

**0:45 — Trial assessment.**
Ask: *"Build me a 60-minute trial project for this role."*
The agent calls `build_trial_assessment` — show the brief traces directly back to quoted lines from the real public job posting, and the rubric is visible up front, not hidden.

**0:55 — Consented card.**
Ask: *"Draft a share-ready intro card with just my headline and GitHub."*
The agent calls `prepare_consented_card` with only the two fields you named — show the card states plainly what wasn't verified.

**Close:** *"Nothing above ever left my agent as a private fact — the server only ever saw a role ID, a rule topic, and the two fields I explicitly chose to share."* Point to `/privacy` for the receipts.

---

## Alternate: no agent handy

Everything above also works at **https://clearance-lens.vercel.app/try** with no LLM key — same tools, same server, a web form instead of a chat.
