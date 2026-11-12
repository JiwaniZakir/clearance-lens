# R5 — Work-Sample / Assessment Validity Science

**Purpose:** ground two Clearance Lens tools — `build_trial_assessment` (a generated work-sample exercise) and `run_job_preview` (a "first week" realistic job preview simulation) — in the actual personnel-selection and recruitment literature, not stale textbook numbers. All effect sizes below were pulled from the primary papers themselves (or, where noted, from a peer-reviewed paper's direct literature-review citation of an earlier paper's numbers) during this research pass, not from memory. Where a figure could not be verified from a primary source, it is omitted rather than guessed.

**Method note:** Primary sources read directly: Sackett, Zhang, Berry, & Lievens (2022) in full (28 pp.), and Earnest, Allen, & Landis (2011) in full (25 pp.). Premack & Wanous (1985) was not itself retrievable as full text; its specific effect sizes are relayed below from its direct citation inside Earnest et al. (2011) and cross-checked against two independent secondary summaries — this is flagged inline. One number that repeatedly appeared in blog/SEO secondary sources ("RJPs cut early turnover ~36%") could not be traced to a primary-source number in anything I could access, so it is **excluded** rather than repeated.

---

## A. Cited evidence

### A1. Corrected selection-procedure validity — Sackett, Zhang, Berry, & Lievens (2022)

**Citation:** Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022). Revisiting meta-analytic estimates of validity in personnel selection: Addressing systematic overcorrection for restriction of range. *Journal of Applied Psychology, 107*(11). https://doi.org/10.1037/apl0000994 — full text read via [gwern.net mirror](https://gwern.net/doc/statistics/meta-analysis/2021-sackett.pdf). Companion design-implications piece (not fully extractable this pass, cited for completeness, not relied on for numbers below): Sackett, Zhang, Berry, & Lievens (2023), *Industrial and Organizational Psychology*, https://doi.org/10.1017/iop.2023.24.

**What actually happened (the correction, in plain terms):** Schmidt & Hunter's (1998) famous summary table corrected observed validity coefficients for two things — measurement error in the performance criterion, and *range restriction* (the fact that validation samples are narrower than the full applicant pool). The range-restriction correction requires knowing how much narrower; when that information wasn't available (which is most of the time), meta-analysts built an "artifact distribution" from whatever subset of studies did report it, then applied that correction factor to *every* study in the meta-analysis — including concurrent-design studies (current employees tested for research purposes) where the predictor was *never actually used to select people* and therefore range restriction is typically minimal (Sackett et al. show the "U ratio" correction in concurrent studies is usually <10%, vs. corrections as large as 50–70% commonly applied). Applying a predictive-study correction factor to concurrent studies — which make up the majority of the data for most predictors — systematically **overcorrected** validity upward. Sackett et al. redid the analysis predictor-by-predictor, applying a correction only where there was credible evidence it was warranted.

**Net result — the revised validity table** (operational validity ρ; S&H 1998 = prior published estimate; current = Sackett et al. 2022's revised estimate; SD = residual standard deviation across studies; Lower 80% = lower bound of the 80% credibility interval, i.e., mean minus 1.28×SD; B–W *d* = Black–White subgroup standardized mean difference, where available, mostly from Dahlke & Sackett 2017):

| Selection procedure | S&H (1998) ρ | **Sackett et al. (2022) ρ** | Residual SD | Lower 80% CI | B–W *d* |
|---|---|---|---|---|---|
| Structured employment interview | .51 | **.42** | .19 | .18 | .23 |
| Job knowledge test | .48 | **.40** | .13 | .23 | .33 |
| Empirically keyed biodata | .35 | **.38** | .09 | .26 | .33 |
| **Work sample test** | .54 | **.33** | .09 | .21 | .67 |
| Cognitive ability (GMA) test | .51 | **.31** | .14 | .13 | .79 |
| Integrity test | .41 | **.31** | .20 | .05 | .10 |
| Personality-based emotional intelligence | — | .30 | .17 | .08 | .22 |
| Assessment center | .37 | **.29** | .09 | .17 | .52 |
| Situational judgment test (knowledge-based) | — | .26 | .10 | .13 | .39 |
| Situational judgment test (behavioral-tendency) | — | .26 | .12 | .11 | .34 |
| Conscientiousness (contextualized) | — | .25 | .00 | .25 | −.07 |
| Vocational interest congruence | .10 | .24 | .25 | −.08 | .33 |
| Unstructured employment interview | .38 | **.19** | .16 | −.01 | .32 |
| Job experience (years) | .18 | .07 | .11 | −.07 | .49 |

*(Full table has 24 rows including the Big Five facets and two EI variants; abridged here to the rows most relevant to a work-sample/trial-assessment tool — see the paper for the complete set.)*

Key points directly stated in the paper (Discussion, pp. 22–23):

- **Work samples moved the most of the "big three":** .54 → .33, a .21-point drop — larger than the drop for cognitive ability (.20) or structured interviews (.09). The authors attribute this specifically to a new meta-analysis (Roth, Bobko, & McFarland, 2005) with ~98% concurrent-design studies, where they therefore apply **no range-restriction correction at all** (vs. Schmidt & Hunter's reliance on an older, predictive-study-biased review).
- **The field's "top five" predictors by rank are nearly unchanged, but the average validity of the top five dropped from .49 to .37**: the current top five by ρ are *structured interview (.42) > job knowledge (.40) > empirically keyed biodata (.38) > work sample (.33) > cognitive ability (.31, tied with integrity tests)*. Work samples are still a top-tier predictor — just not as dominant as the old .54 implied, and now ranked *below* both structured interviews and job knowledge tests.
- **Why job-specific measures win:** the paper explicitly invokes the classic "sign vs. sample" distinction (Wernimont & Campbell, 1968) and the "behavioral consistency" principle (Schmidt & Ostroff, 1986) to explain why structured interviews, job knowledge tests, biodata, and work samples — all *job-specific* measures with direct behavioral/content correspondence to the job — now outrank more abstract, general "sign" constructs like cognitive ability and personality. Their words: *"a closer behavioral match between predictor and criterion... contributes to strong predictive relationships."*
- **Variability is a design signal, not noise.** Structured interviews have both the highest mean (.42) *and* a wide residual SD (.19) — meaning a poorly structured interview can land far below .42, while work samples have a tighter SD (.09), meaning well-built work samples deliver closer to .33 fairly consistently. **The quality of construction matters enormously for interviews and matters for work samples too, just with less observed spread in the existing data.**
- **Adverse-impact tradeoff is real and uneven across predictors.** Work samples (*d* = .67) and cognitive ability (*d* = .79) carry larger Black–White subgroup gaps than structured interviews (*d* = .23), job knowledge (*d* = .33), or biodata (*d* = .33) in the data Sackett et al. compile (mostly from Dahlke & Sackett, 2017; Roth et al., 2011, 2003). The paper explicitly frames this as a "validity–diversity tradeoff" organizations should weigh, not something to paper over.

**Important honesty caveat for product use:** these are validity estimates for *professionally constructed, job-analysis-grounded, standardized, trained-rater* instruments, aggregated across large validation samples. Nothing here licenses a claim that an auto-generated 60/90/180-minute exercise *achieves* ρ ≈ .33–.40. The value of this evidence for `build_trial_assessment` is in **which design features are known to raise or lower validity** (job-specificity, standardization, behavioral anchoring vs. genericness, vague holistic scoring) — not in a number the tool can advertise. Design guidance in Section B is written accordingly.

---

### A2. Realistic job previews — Premack & Wanous (1985) and Earnest, Allen, & Landis (2011)

**Citations:**
- Premack, S. L., & Wanous, J. P. (1985). A meta-analysis of realistic job preview experiments. *Journal of Applied Psychology, 70*(4), 706–719. ([ResearchGate record](https://www.researchgate.net/publication/232556638_A_Meta-Analysis_of_Realistic_Job_Preview_Experiments))
- Earnest, D. R., Allen, D. G., & Landis, R. S. (2011). Mechanisms linking realistic job previews with turnover: A meta-analytic path analysis. *Personnel Psychology, 64*(4), 865–897. https://doi.org/10.1111/j.1744-6570.2011.01230.x (read in full)

**Premack & Wanous (1985) — the original meta-analysis (21 studies).** Its headline, corrected turnover correlation was **r = −.06** — a real but modest effect. Critically, it was **moderated by job complexity**: **r = −.12 for more complex jobs** vs. **r = −.02 for less complex jobs** (figures as cited directly inside Earnest et al., 2011, p. 866, itself quoting Premack & Wanous). P&W's own conclusion, per that same citation, was that *"given the relatively modest investment required to implement an RJP, providing RJPs is a useful turnover management strategy"* — i.e., a cheap intervention with a real but small payoff, not a silver bullet. P&W also reported (direction only, per the same secondary citation chain) that RJPs are associated with a **negative relationship with job acceptance** — the classic "realistic previews cause some self-selection out" finding — which Earnest et al. (2011) later substantially revise (see below). Two contemporaneous/intervening meta-analyses, cited for bracketing context via Earnest et al.'s literature review: McEvoy & Cascio (1985) found r = −.09 for turnover; Phillips (1998), updating the base with ~13 more years of studies, found r = −.06 (voluntary turnover) and r = −.05 (aggregate turnover), plus r = −.18 (initial expectations), r = −.02 (met expectations), r = −.03 (acceptance), and r = .05 (perceived honesty).

**Earnest, Allen, & Landis (2011) — the most current meta-analysis, with the first mediation test.** k = 52 studies, N ≈ 17,000 (75 unique effects; harmonic-mean sample used for the path model, n = 339 studies-as-cases). Meta-analytic correlations between RJP use and each outcome (Table 1; asterisk = 95% CI excludes zero):

| Outcome | r | k | N | 95% CI |
|---|---|---|---|---|
| Acceptance (self-selection into the job) | **.02*** | 24 | 6,601 | [.01, .04] |
| Attraction to the organization | −.10* | 15 | 1,585 | [−.16, −.03] |
| Initial expectations | −.12* | 16 | 2,538 | [−.17, −.08] |
| Met expectations | −.01 (n.s.) | 9 | 2,084 | [−.06, .04] |
| Perceptions of organizational honesty | **.11*** | 10 | 1,554 | [.05, .17] |
| Role clarity | .10* | 5 | 871 | [.02, .21] |
| Overall turnover | −.04* | 48 | 17,230 | [−.05, −.02] |
| Voluntary turnover | −.07* | 15 | 4,924 | [−.10, −.04] |

Two findings matter far more than the top-line turnover number:

1. **Self-selection is essentially a non-effect in the current data.** Acceptance r = **.02** — tiny, and (if anything) in the *positive* direction, the opposite of the classic 1985–1998 assumption that honest previews meaningfully scare qualified people away. The authors note this explicitly contradicts Phillips' (1998) r = −.03 and Premack & Wanous's negative finding; the best current evidence is that **showing real downsides does not meaningfully reduce acceptance at the aggregate level.**
2. **The textbook mechanism (managing expectations) is not what's actually doing the work.** The authors ran a multiple-mediator path model testing four proposed mechanisms (met expectations, role clarity, perceptions of honesty, attraction) as parallel mediators of RJP → voluntary turnover. Specific indirect effects: met expectations *a₁b₁* = .002 (n.s.), role clarity *a₂b₂* = .015 (n.s.), attraction *a₄b₄* = −.009 (n.s.), **perceptions of organizational honesty *a₃b₃* = −.052, Sobel Z = −2.01, p = .04 — the only significant mediator, and it fully mediated the RJP–turnover relationship.** Met expectations — the dominant theoretical explanation since the 1970s–80s — was not even directionally reliable (CI = [−.06, .04]).

This leads the authors to **reframe RJPs through signaling theory (Spence, 1973)** rather than expectation-management theory: an RJP works less because it recalibrates what someone expects, and more because *the act of being shown an honest, balanced picture signals that the organization (or, by extension, the source doing the showing) is trustworthy* — an "instrumental" function (reducing uncertainty) and a "symbolic" one (signaling care/honesty) at once.

**Moderators (hold with appropriate caution — most confidence intervals overlapped across levels, so the authors themselves flag these as suggestive, not confirmed):**
- **Timing:** posthire delivery showed *numerically* stronger associations with reduced voluntary/total turnover than prehire delivery (e.g., voluntary turnover: posthire r = −.10 vs. prehire r = −.06) — the opposite of the classic "must be prehire to enable self-selection" assumption, and consistent with honesty-signaling (which doesn't require pre-decision timing) rather than self-selection (which does).
- **Medium:** oral/richer-media delivery trended stronger than written for total turnover (oral r = −.15 vs. written r = −.05); consistent with media-richness theory (Daft & Lengel, 1984).
- **Exposure/duration:** longer previews (>1 hr) trended toward slightly stronger turnover effects than shorter ones, though CIs overlapped — a weak, not a strong, signal.
- **Setting:** field studies showed stronger effects than lab studies across most outcomes.
- **Internet era:** contrary to the authors' own hypothesis that online info availability would weaken RJPs' unique value, there was no clear evidence post-1995 studies showed smaller effects.
- **Job complexity** (inherited from Premack & Wanous, not re-tested as a moderator in this specific path model, but consistent with it): RJPs have historically shown a bigger turnover payoff for complex jobs than simple ones.

---

## B. Design guidance — `build_trial_assessment`

**Translation principle (read this before the specifics):** The statements below that cite a specific finding are evidence-backed design constraints. Where a recommendation extrapolates beyond anything a cited study directly tested (e.g., the exact 60/90/180-minute scope split, which no validity study measures), it is labeled **[inference]** — a reasoned synthesis, not a separate empirical claim.

### B1. The core principle: build a *sample*, not a *sign*

Per A1, the predictors that now rank highest (structured interview .42, job knowledge .40, biodata .38, work sample .33) are exactly the ones with **direct behavioral/content correspondence to actual job tasks** — the "sample" side of Wernimont & Campbell's (1968) sign-vs-sample distinction — while abstract reasoning/trait measures rank lower. A generic algorithm-trivia prompt ("reverse a linked list," "what's a race condition") is a **sign**-type item: it measures a correlate of ability, divorced from the job's actual content. It is the opposite of what the evidence says works. **Every brief must be visibly derived from the specific job posting's stated responsibilities, tools, and deliverables** — not a role-agnostic template with the company name swapped in. This is the single highest-leverage design rule, and it is also what keeps the exercise ITAR-safe almost by construction: a task built only from public posting text, with no invented technical specifications, naturally avoids export-controlled content.

Work-sample-specific design literature (Callinan & Robertson, 2000, *International Journal of Selection and Assessment*, https://doi.org/10.1111/1468-2389.00154; summarized via [psychology.iresearchnet.com](https://psychology.iresearchnet.com/industrial-organizational-psychology/individual-differences/work-samples/)) frames this as a **bandwidth–fidelity** tradeoff: *bandwidth* is how much of the job's task domain the exercise covers, *fidelity* is how closely the simulated conditions match real conditions. Both should be deliberately chosen, not accidental. The same literature lists concrete validity-supporting features: job-analysis-derived content, standardized administration (identical prompt/time box for everyone), standardized and trained scoring, interrater-reliability-aware rubrics, and **emphasis on rating observed behavior/output, not inferred traits.**

### B2. Four-part structure: Brief → Deliverable → Rubric → Exemplars

**1. The Brief.** A short, realistic work-order framed in the voice of a teammate or manager, built only from the posting's named responsibilities/stack/domain — never invented technical specs. It must state, explicitly and up front: the time box; what is *in scope* and *out of scope* (scope-fencing is itself a standardization feature — an unbounded brief turns the exercise into a test of free time, not skill); the full rubric criteria (disclosed, not hidden — see B4 rationale); and the ITAR-safety disclaimer (public-information-only, no request for or production of controlled technical data, no drawings/schematics).

**2. The Deliverable.** Must require **producing an artifact** — code, a design doc with explicit tradeoffs, a test plan, a short technical memo — not an opinion essay. This is what makes it an actual work *sample* instead of a self-report. [Inference] Where the role is non-coding (e.g., a program-management or systems-engineering posting), the "artifact" can be a structured plan/memo, but the same rule holds: it must contain decisions and tradeoffs that can be evaluated against job-specific criteria, not a free-form reflection.

**3. The Rubric.** 3–6 **named, independently scored criteria**, each one explicitly traceable to a specific phrase or requirement in the source job posting (this traceability is both a validity feature — content correspondence — and a fairness/defensibility feature consistent with the product's "work-style alignment with evidence + source link" framing elsewhere in Clearance Lens). Each criterion should be **behaviorally anchored** across 3–4 performance bands — i.e., built like a Behaviorally Anchored Rating Scale (BARS): each band describes an observable feature of the artifact, not a trait adjective. The rubric should also **explicitly list excluded/banned signals** (formatting polish beyond legibility, perceived personality, "culture vibes") to prevent construct-irrelevant variance from creeping into scoring — directly in service of the product's existing hard constraint against vague "culture fit" judgments.

Borrowing structure, not content, from structured-interview design (Campion, Palmer, & Campion, 1997, *Personnel Psychology*, 50(3), 655–702 — 15 components of interview structure, [full text](https://core.ac.uk/download/234763785.pdf)): the generator should fix criteria *before* generating the brief (not reverse-engineer a rubric from whatever the brief happens to produce), use the *same* prompt/rubric pairing for every run of that role/time-box combination (standardized administration), and score each criterion independently rather than collapsing to one holistic gut score — the components of structure most consistently linked to higher validity in that literature.

**4. "What great looks like" exemplars.** For each criterion, give 1–2 concrete anchor descriptions of excellent vs. mediocre vs. poor responses, in the voice of "what the artifact actually contains" (e.g., "handles the malformed-input case explicitly and explains why" vs. "code runs on the happy path only"). This is the practical content of a BARS and the most commonly missing piece in ad hoc take-home tests.

### B3. Good vs. bad rubric criterion — worked example

> **Bad (vague/trait-based, low behavioral anchoring):** "Shows strong engineering judgment." *(Unobservable without inference; two readers will disagree; not traceable to a specific task element.)*
>
> **Good (behaviorally anchored, traceable to posting + task):** "Handles the ambiguous sensor-dropout case named in the brief: **Exceptional** — explicitly identifies the ambiguity, states an assumption, and implements a fallback with a one-line rationale. **Proficient** — implements a reasonable fallback but doesn't name the assumption. **Developing** — handles the common case only; dropout path is unhandled or silently wrong. **Not demonstrated** — no attempt to address it."

This mirrors the generic BARS contrast documented in HR practice guidance (e.g., [PeopleManagingPeople's BARS guide](https://peoplemanagingpeople.com/performance-management/behaviorally-anchored-rating-scale/)): "rate communication 1–5" produces rater disagreement; "completes quality checks on all outgoing orders before shipping" does not. [Inference] applying that same logic to an AI-graded rubric: the behaviorally anchored version is also what lets a user's own agent score consistently and explain *why*, which matters more here than for a human-rater BARS, since there is no live calibration session to catch drift.

### B4. Concrete skeleton by time box **[inference — no study measures optimal minute-counts; this translates the "fixed shape, scaled scope" standardization principle from B2/B1]**

| | 60 min | 90 min | 180 min |
|---|---|---|---|
| Task shape | One narrow, already-decomposed task (e.g., "this function has a bug tied to X named in the posting; fix it and explain in 3 sentences") | One small end-to-end deliverable + a short rationale memo | A scoped mini-project mirroring a real first-task, plus an explicit "here's what I'd do next and the two riskiest unknowns" memo |
| Closest predictor analogue | Job-knowledge test (applied, correct use of domain concepts under time pressure) | Job-knowledge + work-sample blend | Work-sample + a structured-interview-like reasoning component (written, not spoken) |
| Rubric size | 2–3 criteria | 4–5 criteria | 5–6 criteria, with the "next steps / risks" memo scored as its own criterion |
| Why this scope | Matches tight time to a bounded, gradable unit of work; avoids penalizing candidates for not having large uninterrupted blocks | Adds a tradeoffs-explanation component, the cheapest way to approximate structured-interview-style reasoning without a live conversation | Tests judgment under ambiguity and prioritization — closer to the actual breadth of job performance — while the shorter time boxes test precision |

Across all three, keep the same four-part shape (Brief / Deliverable / Rubric / Exemplars) so only *scope*, not *structure*, changes — this keeps the generator's own internal "test" standardized across role and duration, which is the only form of standardization a stateless, single-shot tool can actually guarantee.

### B5. Explicit limits

State plainly, including in-product copy if any validity claim is surfaced: the cited ρ values describe professionally validated instruments at scale, not a guarantee about any single generated exercise. What is evidence-backed is the *direction* of each design choice (job-specific > generic; behaviorally anchored > holistic; standardized > ad hoc; disclosed criteria > hidden), not a number this tool can claim to reproduce. Also carry forward the adverse-impact note from A1: work-sample-style exercises are not automatically "bias-free" relative to other methods (B–W *d* = .67 in the cited data) — a reason to keep criteria narrowly job-specific (lower-*d* territory, like job-knowledge and structured-interview content) rather than drifting toward abstract-reasoning puzzles (higher-*d* territory, like GMA-style items).

---

## C. Design guidance — `run_job_preview`

**Scope caveat up front [inference, important]:** the RJP literature in Section A2 studies previews *delivered by or on behalf of the actual employer*, inside a real hiring process, with *employee turnover at that employer* as the outcome. `run_job_preview` is delivered by a third-party, stateless tool, before application, to a candidate whose future employment the tool will never observe. The evidence therefore transfers most directly to **how to make the content and debrief maximally honest and informative** (the thing proven to matter), and only by extrapolation to "this will reduce turnover" (a claim about a mechanism — perceptions of *this employer's* honesty — the tool cannot itself fully deliver, since it is previewing the field/role generically, not speaking for the employer). Product copy should claim the former, not the latter.

### C1. Design around the one thing that's actually proven: honesty-signal, not expectation management

The single most important finding in A2 is that **perceptions of organizational honesty was the only significant mediator** of the RJP → turnover relationship (Sobel Z = −2.01, p = .04), fully mediating it, while **met expectations — the textbook explanation — was not even reliably directional** (r = −.01, CI crossing zero). Practically: the simulation's design target should not be "manage the candidate's expectations down to the right level" (the old theory) — it should be **"feel undeniably honest, including in the unflattering parts."** A preview that is balanced in form but subtly softened in substance (every downside scene resolving positively, hardships reframed as "growth opportunities") is optimizing for the wrong, now-unsupported mechanism and would be expected to under-deliver on the one mechanism actually evidenced.

### C2. Showing real downsides is not empirically costly — so don't soften them

Classic theory (and Premack & Wanous's and Phillips' older numbers) held that realistic previews modestly *reduce* acceptance — i.e., some self-selection-out is the cost of honesty. The most current meta-analytic evidence revises this: **acceptance r = .02** — essentially a non-effect, and not even in the expected deterrent direction. **[Inference]** For product purposes this means: the six specified hard scenes (vague standup priority call, ambiguous spec, a weapons-adjacent ethics tradeoff, the ITAR moment where a foreign-national contractor asks for a drawing, a clearance-wait week of unclassified busywork, SCIF/no-phone life plus foreign-travel-reporting norms) should be played **straight** — genuinely uncomfortable, not sanded down for fear of scaring people off. The evidence gives little empirical reason to pull punches, and real reason (honesty-signal) to not.

### C3. Agency: real branches with real consequences, not a disguised quiz

The RJP literature treats self-selection as a *legitimate, desired* outcome of accurate information, not something to be engineered around. That framing implies the simulation should offer **genuine choices with differentiated, plausible consequences** at each scene — not a forced-choice item converging on one "correct" path (which would make it a disguised competency test, undermining the honesty-signal mechanism, since a hidden right-answer format is itself a (mild) form of not-being-straight with the user about what the tool is doing). **[Inference]** Each scene's "what real teams report" content should include outcomes for more than one plausible choice, so the user experiences agency rather than being funneled.

Role clarity (r = .10, a real though secondary correlate) is worth deliberately reinforcing even though it wasn't the dominant mediator: **[inference]** each scene can end with a short, ungraded prompt like "what would you actually need to know or decide here?" — building role clarity as a side effect without turning it into an assessment.

### C4. Debrief design grounded directly in the mediator model

Because perceived honesty is the one validated lever, and the product's hard constraints already ban any hire/no-hire scoring, the debrief (per scene, and in aggregate) should ask, roughly:
1. *What happened* — what did you choose, what would you have done differently? (behavioral reflection, ties to the scene's own correspondence to real job content)
2. *Honesty check* (the evidence-backed question): "Did this feel like an accurate picture, including the parts that aren't flattering?" — this is the single most evidence-grounded outcome item available, and arguably the most important one to actually ask, even above "are you still interested."
3. *Role clarity check*: "What's still unclear to you about this part of the job?"
4. A values/fit-relevant reflection that stays descriptive, never scored (consistent with the product's existing "aligned / mixed / unclear" framing elsewhere, never a number).

At the end of all six scenes, the wrap-up (feeding into the separately planned `fit_debrief` tool) should surface one aggregate honesty-perception item alongside the loved/disliked tags already planned — it is the one summary metric with a direct evidentiary basis.

### C5. Scene-specific notes

- **ITAR moment (foreign-national contractor asks for a drawing):** give this scene the same "require an actual decision + short stated rationale" shape used in the trial-assessment deliverable (Section B2) rather than pure narrative — the behavioral-sample logic (show what you'd actually do, not just how you feel about it) applies inside the preview too, and this specific scene is also where the product's existing ITAR-safety hard constraints (no technical data generated or requested) must be enforced in the scene content itself, not just in the surrounding tool.
- **Clearance-wait week of unclassified busywork:** this is exactly the kind of low-glamour, true-to-complexity content the evidence says to keep (Section C2) — soften-tempting content is precisely where honesty-signal payoff is highest, since it's the scene most likely to otherwise be sanitized.
- **SCIF/no-phone + travel-reporting norms:** present as lived-in logistics (what changes day-to-day), not abstract policy text — this keeps it in "sample" rather than "sign" territory, same principle as B1.

### C6. Moderator-informed hedges (present as *weak* signals, per the source's own caution)

- Evidence trends toward **posthire and richer/oral-style delivery** being somewhat more effective than prehire/written, with the authors' own caveat that confidence intervals overlapped across levels — treat as a weak tilt, not a rule. For a pre-application, text/agent-mediated tool, this mainly argues for making the simulation feel as interactive and dialog-like as the format allows (closer to "oral/rich" than a static document), rather than for restructuring when in the funnel it's offered.
- Evidence trends toward **longer exposure (>1 hr)** being slightly more effective, again with overlapping CIs — at the product's 20–30 minute budget, this is not a strong lever either way; depth and honesty of each scene matters more than stretching duration.
- The **job-complexity moderator** inherited from Premack & Wanous (effect roughly 6× larger for complex jobs, r = −.12 vs. r = −.02) is, if anything, a point in favor of this technique for defense-tech engineering roles specifically, which are unambiguously complex — **[inference]**, since that moderator was not re-tested inside Earnest et al.'s specific path model.

### C7. What not to do — the "performative preview" anti-pattern

The clearest lesson from comparing 1985/1998-era theory to the 2011 mediation test is that **the field's long-standing best-practice story (manage expectations, enable self-selection) turned out not to be what was actually working.** A preview built to *look* balanced while still funneling every scene toward an upbeat resolution, or one that treats "realistic" as a box to check rather than a felt quality, optimizes for a mechanism (expectation management / filtering) that the best current evidence says barely moves the needle, while skipping the one that does (perceived honesty). The practical test for `run_job_preview`, per this evidence: **if a candidate who disliked what they saw would still describe it afterward as "that was straight with me," the design is on the right track; if they'd describe it as "that was obviously trying to get me excited," it isn't** — regardless of how many branching choices or polished scenes it contains.

---

## Sources

- Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022). Revisiting meta-analytic estimates of validity in personnel selection: Addressing systematic overcorrection for restriction of range. *Journal of Applied Psychology, 107*(11). https://doi.org/10.1037/apl0000994 — [full text (PDF)](https://gwern.net/doc/statistics/meta-analysis/2021-sackett.pdf)
- Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2023). Revisiting the design of selection systems in light of new findings regarding the validity of widely used predictors. *Industrial and Organizational Psychology*. https://doi.org/10.1017/iop.2023.24 — [publisher page](https://www.cambridge.org/core/journals/industrial-and-organizational-psychology/article/revisiting-the-design-of-selection-systems-in-light-of-new-findings-regarding-the-validity-of-widely-used-predictors/A20984B138319E3D432E643978BF026D) (cited for completeness; not relied on for specific numbers above)
- Premack, S. L., & Wanous, J. P. (1985). A meta-analysis of realistic job preview experiments. *Journal of Applied Psychology, 70*(4), 706–719. [ResearchGate record](https://www.researchgate.net/publication/232556638_A_Meta-Analysis_of_Realistic_Job_Preview_Experiments) (effect sizes relayed via direct citation inside Earnest et al., 2011, not read as full primary text this pass)
- Earnest, D. R., Allen, D. G., & Landis, R. S. (2011). Mechanisms linking realistic job previews with turnover: A meta-analytic path analysis. *Personnel Psychology, 64*(4), 865–897. https://doi.org/10.1111/j.1744-6570.2011.01230.x — [full text (PDF)](https://stevenmbrownportfolio.weebly.com/uploads/1/7/4/6/17469871/earnest_et_al._2011_rjp.pdf)
- Campion, M. A., Palmer, D. K., & Campion, J. E. (1997). A review of structure in the selection interview. *Personnel Psychology, 50*(3), 655–702. [full text (PDF)](https://core.ac.uk/download/234763785.pdf)
- Callinan, M., & Robertson, I. T. (2000). Work sample testing. *International Journal of Selection and Assessment, 8*(4), 248–260. https://doi.org/10.1111/1468-2389.00154 — summarized via [psychology.iresearchnet.com](https://psychology.iresearchnet.com/industrial-organizational-psychology/individual-differences/work-samples/)
- PeopleManagingPeople (n.d.). Behaviorally Anchored Rating Scale: Expert Guide. https://peoplemanagingpeople.com/performance-management/behaviorally-anchored-rating-scale/ (general BARS illustration, not a primary research source — used only for the vague-vs-behavioral-anchor contrast example in B3)

**Not used / explicitly excluded:** a frequently-repeated secondary-source claim that RJPs "reduce early turnover by ~36%" (appeared in multiple SEO/blog summaries of Premack & Wanous) could not be traced to a verifiable primary-source statistic in any source accessed this pass and is deliberately omitted rather than repeated.
