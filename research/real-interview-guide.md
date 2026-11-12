# Real Interview Guide — 20 Minutes, 5 People

**Purpose:** a practical script the human product owner can run with 5 real people to check (and correct) the synthetic personas and pains in `R3-user-studies.md`. Everything in that file is labeled SYNTHETIC or REAL-but-secondhand (forum quotes). This guide is how you get **REAL, primary, first-party** evidence to replace it.

Budget exactly 20 minutes per person. That's short on purpose — you want 5 completed interviews, not 2 perfect ones.

---

## 0. Before you start

**Who to recruit (aim for one person per bucket, minimum):**

| Persona (from R3 §2) | Where to find one real person |
|---|---|
| (a) New-grad US citizen, no clearance | A university CS career-center mailing list, a new-grad Slack/Discord, or a CS subreddit's pinned "ask me anything" post (post your own ask, don't scrape) |
| (b) Dual citizen / green-card holder, ITAR-unsure | An international-student career office, an immigration-focused tech Slack, or a dual-citizen friend-of-a-friend |
| (c) Cleared veteran/engineer eyeing startups | A veteran-transition program (e.g., a base transition office, a veterans-in-tech group), or a cleared professional in your own network |
| (d) Founder/recruiter at a pre-FCL startup | A founder in your own a16z-speedrun-adjacent network, or a technical recruiter at an early-stage defense-tech company |

If you can only get 3–4 people, prioritize (a) and (d) first — they're the two ends of the marketplace this product has to serve, and R3 found the thinnest real evidence for (d)'s voice specifically (see R3 §4.2).

**Consent & recording:** tell them upfront it's 20 minutes, informal, for product research, and ask permission to take notes (or record, if your tooling supports it). Let them know they can skip any question.

**The one hard rule — model the product's own privacy promise:** Clearance Lens's entire premise is that it never asks for or stores clearance case numbers, SSNs, dates of birth, or clearance-record screenshots. **Your interview should hold itself to the same bar.** If a participant starts to volunteer a specific case number, investigation detail, or anything that looks like it came off an actual clearance record, gently redirect: *"You don't need to tell me the specifics — just whether you knew the answer or not is what I'm after."* Don't write those details in your notes even if offered.

**Materials:** this script, a notes doc with the 4 persona labels pre-written so you can tag answers live, and — optionally — a laptop open to the Clearance Lens `/try` playground in case you want to run the Section 3 live-scenario add-on (see §4 below) in the last few minutes.

---

## 1. The script (minute-by-minute)

| Time | Segment |
|---|---|
| 0:00–2:00 | Warm-up |
| 2:00–4:00 | Q1 — context / jobs-to-be-done |
| 4:00–6:30 | Q2 — eligibility ambiguity |
| 6:30–9:00 | Q3 — timeline uncertainty |
| 9:00–11:00 | Q4 — trust in anecdotal info |
| 11:00–13:30 | Q5 — recruiter/employer surprise |
| 13:30–15:30 | Q6 — self-reported-clearance problem *(skip if clearly not persona D)* |
| 15:30–17:30 | Q7 — walk-through of their actual last attempt |
| 17:30–18:30 | Q8 — success criteria |
| 18:30–19:30 | Closing question |
| 19:30–20:00 | Wrap-up, thanks, consent for follow-up |

### Warm-up (0:00–2:00)

> "Thanks for doing this — it's about 20 minutes, totally informal. I'm trying to understand what it's actually like to [figure out if you can work in defense tech / hire for a defense-tech role], not pitch you anything. There's no wrong answer, and skip anything you'd rather not go into. Sound good?"

Ask one quick framing question: *"In a sentence — are you more on the 'trying to get into this world' side, or the 'trying to hire for it' side?"* This tells you which persona bucket they map to and which questions to lean on.

### Q1 — Context and jobs-to-be-done (2:00–4:00)

**Ask:** "Tell me about the last time you looked into a defense or defense-tech job — either applying, or hiring for one. What were you actually trying to figure out?"

**Maps to:** R3 §2, every persona's "jobs-to-be-done" list.
**Listen for:** the actual verb they use (figure out / verify / compare / avoid wasting time) — that verb is your real jobs-to-be-done language, likely better than what's in R3. Note which specific company or role type they mention, if any.

### Q2 — Eligibility ambiguity (4:00–6:30)

**Ask:** "Have you ever read a job posting — or a candidate's resume, if you're hiring — and not been sure whether they were even eligible to apply or be considered? Walk me through that."

**Maps to:** Persona A pain 1, Persona B pains 1–2, Persona D pain 1 (self-reported clearance).
**Listen for:** exact phrases like "ability to obtain," "US person," "eligible for," and whether they could tell the difference between *immigration status*, *ITAR eligibility*, and *clearance eligibility* — R3 found real people (even confident ones, on public forums) getting this wrong or disagreeing with each other (see R3 Q4/Q5/Q15). Where did they go to get an answer? How long did it take? Did they ever actually get a confident one?

### Q3 — Timeline uncertainty (6:30–9:00)

**Ask:** "If you had to guess right now: how long would it take [you to start / a candidate to start] a job that requires a Secret clearance, starting from zero? How confident are you in that guess, and where does it come from?"

**Maps to:** Persona A pain 2, Persona C pain (readiness), Persona D pain 3 (FCL runway risk).
**Listen for:** whether they conflate *interim* clearance with *final* clearance; whether their number comes from a primary source, a recruiter, or "something I read once"; whether they've personally seen a timeline estimate turn out wrong.

### Q4 — Trust in anecdotal info (9:00–11:00)

**Ask:** "Where do you currently go to find out what it's really like to work at a specific company — say, [name a real one they mentioned, or suggest Anduril/Shield AI/Saronic]? How much do you actually trust what you find?"

**Maps to:** Persona C pain 2 (contradictory Glassdoor/Blind accounts of the same employer).
**Listen for:** explicit skepticism ("I assume half of it is fake"), specific contradictions they've personally noticed, and whether they weight a recent review differently from an old one.

### Q5 — Recruiter/employer surprise (11:00–13:30)

**Ask:** "Tell me about a time a recruiter, job post, or interview process surprised you with a requirement — citizenship, clearance, something else — that you didn't know going in."

**Maps to:** Persona A pain 1, Persona D pain shared with candidates (Q45/Q46/Q47 in R3 — citizenship surfacing only after an onsite).
**Listen for:** *at what stage* they found out (before applying / after an onsite / after an offer) — the later it was, the worse the trust damage, and that's the exact failure this product needs to prevent. Note how it changed their opinion of the company.

### Q6 — Self-reported clearance problem *(ask only if participant is clearly persona D — a founder or recruiter)* (13:30–15:30)

**Ask:** "When a candidate tells you their clearance level or that they're 'interested in a TS role,' what can you actually do with that information today, given you can't look up their record yourself?"

**Maps to:** Persona D pain 1 — this is close to the scenario phrasing in R3 §3, D1.
**Listen for:** do they already know they structurally cannot verify it (only an FSO at an FCL-holding sponsor can)? What do they do instead — trust it, ignore it, ask someone else to check? This question is the single highest-value one for persona D; if your participant is clearly not a recruiter/founder, skip it and spend the extra time on Q7.

### Q7 — Walk-through of their actual last attempt (15:30–17:30)

**Ask:** "Can you walk me through, step by step, exactly what you did last time you tried to answer one of these questions? Tools, people, tabs — whatever actually happened. Screen-share if that's easy."

**Maps to:** every persona's "current workaround" in R3 §2.
**Listen for:** the real number of steps/people/tabs involved (this is your best evidence against or for the synthetic "current workaround" paragraphs in R3) and the exact point where they gave up or settled for an answer they weren't sure about.

### Q8 — Success criteria (17:30–18:30)

**Ask:** "If that had gone perfectly — if you'd gotten exactly the help you needed — what would 'okay, I'm done, I have my answer' have actually looked like?"

**Maps to:** every persona's "what done looks like" in R3 §2.
**Listen for:** do they want a fast yes/no, or a nuanced brief with sources? Do they want a human in the loop at all, or would a sourced, written answer be enough? This directly informs how terse or how thorough `explain_rule` / `get_role_rubric` output should be.

### Closing question (18:30–19:30)

**Ask:** "Last one — is there a question about getting into, or hiring for, a defense-tech role that you've genuinely never been able to get a straight answer to?"

**Listen for:** net-new pains not already covered by Q1–Q8, and the emotional register (frustrated/resigned vs. mildly curious) — that's a real signal of how painful this actually is versus how painful the forum quotes in R3 made it sound.

### Wrap-up (19:30–20:00)

Thank them, ask if they're open to a quick follow-up if you have a clarifying question later, and — only if they're comfortable and you have the two minutes — offer the optional live add-on below.

---

## 2. Optional add-on (only if the 20 minutes ran short and they're willing to stay)

Pick 2–3 scenarios from `R3-user-studies.md` §3 that match this participant's persona bucket, and actually run them against the live `/try` playground or a connected agent. Watch where they hesitate, what they misread, and whether the output matches what they said they wanted in Q8. This turns one interview into a lightweight usability pass for free — but never let it eat into the core 20 minutes above; it's a bonus, not a substitute.

---

## 3. After the interview

1. **Write up notes within the hour**, tagged by persona bucket and by which R3 pain each answer confirmed, contradicted, or extended. A contradiction is more valuable than a confirmation — it means a synthetic persona needs correcting.
2. **Redact before you save.** Re-read your notes once specifically looking for anything that resembles a case number, SSN, DOB, or other CUI-adjacent detail, and remove it even if the participant offered it freely.
3. **After all 5:** update `R3-user-studies.md`'s personas directly — replace or append to a persona's "top 3 pains" with a note like `[Confirmed by real interview #3]` or `[Contradicted by real interview #1 — see below]` so the file keeps an honest trail between synthetic inference and real evidence, rather than silently overwriting one with the other.
