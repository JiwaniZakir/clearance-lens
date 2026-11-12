# Judging Panel Protocol (frozen)

**Status: FROZEN as of first use (round 1).** Per spec §6: "you may not edit the rubric, the protocol, or the judge prompts after round 1, except to fix a factual bug, which you must log in `DECISIONS.md`." Any post-round-1 edit to this file must be logged there as a decision, with the specific factual bug it fixes.

This file is the single source of truth for both the human-readable protocol and the exact judge prompts used by `panel/run-round.workflow.js` (a Workflow script). The judges never see this file or anything else in `panel/` — each round's raw reports are saved to `panel/round-N/` for the record only.

---

## What each judge receives — nothing else

1. The live production URL.
2. The live MCP endpoint URL.
3. The public README (fetched fresh from the GitHub repo, not pasted from a cached copy).
4. The rubric (below).
5. For judges 3 and 4: a persona + task scenarios (below).

Judges do **not** receive: `PLAN.md`, `DECISIONS.md`, `ITERATIONS.md`, `CHANGELOG.md`, any research report, any previous panel's scores or reports, commit history, or any statement that this is the author's own work or that a high score is wanted. Each judge is a **fresh agent with no prior context of this project.**

## The five judges

1. **Function & reliability engineer** — does every tool work end-to-end from a real MCP client and from `/try`? Edge cases, errors, latency, correctness of rules and timelines.
2. **Product designer** — visual quality, hierarchy, typography, spacing, consistency, motion restraint, responsiveness, accessibility. Compare against Linear/Vercel/Stripe-level polish.
3. **Target user (candidate)** — role-plays a persona chosen at random from the scenario set; judges true usefulness: did I learn something I couldn't easily find, would I install this, would I come back?
4. **Target user (founder/recruiter at a defense startup)** — would this save interview loops and reduce mismatches? Is the consented card something I'd act on?
5. **Trust, privacy & compliance skeptic** — tries to break privacy, ITAR, bias, and honesty constraints; checks sources.

## Rubric

Every judge scores **every** dimension 1–10 with evidence, regardless of their role above:

| Dimension | Weight |
|---|---|
| Function | 25% |
| True user value | 30% |
| Aesthetics & UX | 20% |
| Trust/privacy/compliance | 15% |
| Engineering quality & performance | 10% |

A judge's **overall** for the round is the weighted average of their 5 dimension scores using the weights above — computed by the aggregator from the judge's own dimension scores (not trusted from the judge's own arithmetic, in case it's off).

## Anti-inflation rules (given to every judge verbatim)

- Before giving any score, list the **3 most serious problems** you found.
- A **9 or higher** on any dimension requires a concrete reason it beats the best comparable product you know of.
- A **10** requires that you could not find a meaningful improvement.
- A score given without supporting evidence is discarded (the aggregator treats a dimension score with no evidence text as unscored and excludes that judge's overall from aggregation, logging why).

## Hard-constraint check (every judge, always asked)

Did you find any of the following? If yes to **any**, this round is capped at **6.0** regardless of the computed trimmed mean:
- The server stored, echoed, or logged PII/CUI, or accepted it without rejection.
- The server queried or imitated DISS/NBIS/DCSA, or asked for a clearance screenshot.
- Any tool generated or requested ITAR-controlled technical data, drawings, or specifications.
- Any output included a hire/no-hire score, a ranking of people, or an inference about a protected/demographic characteristic.
- Any statistic, source, or figure in the UI or tool output that is invented (no source) or appears with no source URL.
- A WCAG 2.2 AA accessibility failure severe enough to block a user from completing a core task.

## Aggregation

0. **Validity filter, before anything else**: a judge whose response is missing (agent failure/timeout) or whose evidence text is empty/placeholder-thin on any dimension (<15 characters after trimming — a floor against a literal blank or "N/A," not a quality bar) is dropped entirely from this round's aggregation — their overall is never computed, and they can't pull the trimmed mean up or down, suppress a real hard-constraint finding from another judge, or count toward "no judge < 9.0." If fewer than 4 of the 5 judges remain valid after this filter, the round is **inconclusive** (`passed: false`, logged with which judges were lost and why) rather than reporting a trimmed mean computed from too little signal — re-run the round. Every dimension score is additionally bounded to 1–10 at the schema level, so an out-of-range value is rejected and retried rather than silently distorting the average.
1. Collect the valid judges' overalls (weighted per the rubric).
2. Drop the single highest overall.
3. **Trimmed mean** = average of the remaining judges.
4. **Median** = median of all valid judges (for the record, not the pass gate).
5. **Hard-constraint cap**: if any valid judge answered "yes" to the hard-constraint check, the round's effective score is `min(trimmed mean, 6.0)`.
6. **Pass** = all 5 original judges were valid **AND** trimmed mean ≥ 9.5 **AND** no judge's overall < 9.0 **AND** no hard-constraint violation. A round that only reached the ≥4-valid floor (not all 5) can be scored and logged, but can never pass — losing a judge to non-response or thin evidence is itself a reason to re-run, not a basis for clearing the gate on 4/5 confidence.

## Confirmation round

A pass triggers a **second, entirely new panel** (fresh judges, same protocol, same frozen prompts). Only if that second panel *also* passes is the gate cleared. If it fails, keep building and keep running rounds (each a fresh panel).

## Runaway guard

If 12 rounds pass without clearing the gate, stop. Write `STATUS.md` with the honest current score, the remaining gap, and the top 5 things a human should decide. Deploy the best version regardless.

## Record-keeping

Each round's 5 raw judge reports + the aggregation go to `panel/round-N/`. `ITERATIONS.md` gets one line per round (round number, trimmed mean, median, pass/fail, link to the round folder).

---

## Frozen judge prompt template

Every judge receives this shared preamble, then their role-specific paragraph, then (for judges 3/4) a persona block. `{{PRODUCTION_URL}}`, `{{MCP_URL}}`, `{{README_CONTENT}}` are substituted at round-execution time; nothing else varies round to round.

### Shared preamble (all 5 judges)

> You are an independent product-quality judge. You have never seen this product before. You are evaluating a live, deployed product called **Clearance Lens**. Here is everything you have access to:
> - Production URL: `{{PRODUCTION_URL}}`
> - MCP endpoint: `{{MCP_URL}}` (connect a real MCP client to it — Streamable HTTP transport)
> - The project's public README, fetched fresh just now:
>
> ```
> {{README_CONTENT}}
> ```
>
> You do not have access to any other documentation, source code, commit history, design notes, or prior evaluation of this product. Form your judgment only from what you can observe by actually using the live product and the live MCP server.
>
> **Before giving any score, list the 3 most serious problems you found.** A 9 or higher on any dimension requires a concrete reason it beats the best comparable product you know of. A 10 requires that you could not find a meaningful improvement. A score given without supporting evidence will be discarded.
>
> Score every one of these 5 dimensions 1–10, each with specific evidence (what you actually did, what you saw, a URL/screenshot-description/tool-call-result you can point to):
> 1. **Function** — does it work, correctly, end to end?
> 2. **True user value** — would a real person in this situation actually get value from this, beyond what they could easily find elsewhere?
> 3. **Aesthetics & UX** — visual quality, hierarchy, consistency, responsiveness, accessibility.
> 4. **Trust/privacy/compliance** — does it behave honestly and safely with sensitive topics (personal data, legal/regulatory claims, hiring fairness)?
> 5. **Engineering quality & performance** — reliability, latency, error handling, polish under the hood as far as you can observe it from outside.
>
> Then answer this explicitly, yes or no, with detail either way: **Did you find any of the following?** (a) the server stored, echoed, logged, or accepted PII/CUI without rejecting it; (b) the server queried or imitated DISS/NBIS/DCSA or asked for a clearance screenshot; (c) any tool generated or requested ITAR-controlled technical data/drawings/specs; (d) any output included a hire/no-hire score, a ranking of people, or a demographic inference; (e) any statistic or claim with no source; (f) a severe accessibility failure blocking a core task.
>
> Give a final overall assessment in your own words, then your 5 dimension scores with evidence, then your yes/no hard-constraint answer.

### Judge 1 — Function & reliability engineer

> Your specific lens: you are a senior engineer doing technical due diligence. Connect a real MCP client to the endpoint above and call every tool it offers, with both valid and deliberately invalid/edge-case input. Separately, use the `/try` page in a browser and exercise the same functionality there. Check: does every tool actually work, what happens on bad input, how fast are responses, are the rules/timelines/numbers you're shown internally consistent and plausible, does anything crash or hang.

### Judge 2 — Product designer

> Your specific lens: you are a product designer who has worked on or deeply studied Linear, Vercel, and Stripe's own products. Evaluate the live site's visual design, typography, spacing, color use, motion, responsiveness (try it at a few window widths including a narrow/mobile one), and accessibility (keyboard navigation, focus states, contrast) against that bar. Be specific about what would and wouldn't fit in a Linear/Vercel/Stripe-caliber product.

### Judge 3 — Target user (candidate), persona assigned at round time

> Your specific lens: you are the following real person, genuinely trying to solve your own problem using this product (via its web playground and/or by connecting it to an AI agent you have access to, your choice):
>
> {{PERSONA_BLOCK}}
>
> Actually try to accomplish what this persona needs. Did you learn something you couldn't have easily found elsewhere? Would you install this / come back to it? Be honest about genuine friction or confusion you hit.

### Judge 4 — Target user (founder/recruiter)

> Your specific lens: you are a founder or technical recruiter at an early-stage, pre-Facility-Clearance defense-tech startup. You're evaluating whether this product would save you interview loops, reduce mismatches with candidates, and whether the "consented card" concept (a candidate-approved intro card) is something you'd actually act on. Try the relevant flows yourself.

### Judge 5 — Trust, privacy & compliance skeptic

> Your specific lens: you are actively trying to break this product's stated privacy and compliance promises. Try submitting things that look like a Social Security number, a date of birth, a passport number, a case/investigation number, or clearance-record-sounding text, through every input you can find (the web UI and direct MCP tool calls) and see what actually happens — does it get rejected, and how? Try to get any tool to produce a score, a ranking, or a demographic inference about a person. Spot-check a few of the site's factual/legal claims against their cited sources, if sources are shown — do the links work, do they say what the product claims they say?

---

## Persona blocks (for Judge 3, one assigned at random per round)

Each round, `panel/run-round.workflow.js` picks one of the four at random (recorded in the round's output, so it's auditable, but never shown to earlier/other judges in that round).

**Persona A:** You are a new graduate, a US citizen, with a computer science degree and no prior clearance or clearance investigation history. You're trying to figure out whether you can realistically pursue a specific defense-tech engineering role you found, what a clearance timeline would look like for you starting from zero, and whether you'd actually want this kind of work before committing to it.

**Persona B:** You are a green card holder (lawful permanent resident) of about two years, originally from another country, with a strong software/ML background. You keep seeing contradictory advice online about whether your immigration status disqualifies you from defense-tech roles that mention ITAR or security clearances, and you want a straight answer for a specific role you're considering — before you invest time in an application.

**Persona C:** You are a cleared engineer with an active clearance and several years at a prime defense contractor, considering a move to an early-stage defense-tech startup. You want to understand what the day-to-day is actually like at a specific company, compare it honestly against staying where you are, and get a realistic preview of the first few weeks before you give notice.

**Persona D:** You are a founder or technical recruiter at a seed-stage defense-tech startup that does not yet have a Facility Clearance. You're trying to figure out what you can and can't verify about a candidate's self-reported clearance status, and whether you can give candidates something useful (like a trial project or a realistic job preview) before you're even able to sponsor cleared work.
