# Just-In-Time Research: Bias/Compliance-Law Citations (Hard Constraint #4)

**Task:** PLAN.md backlog item #11 / DECISIONS.md D-007. The original build brief's Hard Constraint #4 ("no hire/no-hire scores, no ranking, no demographic inference; 'culture fit' reframed as sourced work-style/values alignment") leaned on six legal/regulatory citations that none of R1–R5 independently verified. This file verifies them before any UI copy, `explain_rule` content, or `/sources` entry names them.

**Verification date (all 6 items below): 2026-11-11.**

**Method note:** Per the global AgentMux tool-use policy, `search_offerings` was called first with a capability query for web research; it returned `[gateway-unavailable] The hosted AgentMux gateway is unavailable`, so native WebSearch (extended mode) and WebFetch were used directly, as the policy permits when AgentMux is unavailable. Every item below was checked against a primary or clearly authoritative source where one could be reached; where a fetch failed, that is stated explicitly rather than papered over.

---

## 1. Title VII disparate impact doctrine (as applied to hiring criteria/algorithms)

**Plain-English summary (tooltip/sources-ready):** Title VII bans not only intentional discrimination but also facially neutral employment practices — including software/algorithmic selection tools — that disproportionately screen out a protected group, unless the employer shows the practice is job-related and consistent with business necessity and no less-discriminatory alternative was available (42 U.S.C. § 2000e-2(k)(1)(A)). This is current, binding federal statutory law; it has not been repealed or overturned. The EEOC applied this doctrine specifically to AI/algorithmic hiring tools in a May 2023 technical guidance document — but that document was removed from eeoc.gov in January 2025, and an April 23, 2025 executive order (E.O. 14281) directed federal agencies to deprioritize disparate-impact enforcement, which the EEOC's own June 2026 National Enforcement Plan has since done (it states the agency "will not commence, develop, or continue to pursue litigation advancing disparate impact claims"). **Important nuance: the legal theory remains fully available to private plaintiffs regardless of EEOC enforcement posture** — this is exactly the theory proceeding against Workday in *Mobley* (item 6, below). Product copy should state the doctrine as live law, but should not imply active EEOC enforcement or cite EEOC's AI-specific guidance as a currently-published document.

**Primary sources:**
- Statute text: https://www.law.cornell.edu/uscode/text/42/2000e-2 (42 U.S.C. § 2000e-2(k) — Cornell LII, directly fetched and quoted 2026-11-11)
- E.O. 14281, "Restoring Equality of Opportunity and Meritocracy" (Apr. 23, 2025): https://www.govinfo.gov/content/pkg/FR-2025-04-28/html/2025-07378.htm (Federal Register, confirmed via search 2026-11-11)
- EEOC's now-withdrawn AI guidance: live URL `eeoc.gov/laws/guidance/select-issues-assessing-adverse-impact-software-algorithms-and-artificial` returned HTTP 404 on direct fetch 2026-11-11 (confirms removal); an archived copy (https://data.aclum.org/storage/2025/01/EOCC_www_eeoc_gov_laws_guidance_select-issues-assessing-adverse-impact-software-algorithms-and-artificial.pdf) was fetched and confirms the document's content and existence as of its 2023 issuance.

**Verified:** 2026-11-11. **Confidence:** high on the doctrine's current validity and on the EEOC-guidance-removal/enforcement-posture-shift; this is a case where the underlying law is settled but the enforcement-politics context changed materially in 2025–2026 and any copy should reflect that.

---

## 2. NYC Local Law 144 (automated employment decision tools)

**Plain-English summary:** Still in force, unchanged. NYC Local Law 144 makes it unlawful for an employer or employment agency to use an "automated employment decision tool" (AEDT) to screen candidates or employees unless: (1) the tool has had an independent bias audit within the past year, (2) a summary of the audit results has been made publicly available, and (3) candidates/employees have been notified at least 10 business days in advance that an AEDT will be used (with information on how to request an alternative process or accommodation). The law took effect January 1, 2023; NYC's Department of Consumer and Worker Protection (DCWP) began enforcement July 5, 2023. No repeal or substantive amendment was found as of this research pass. (A December 2025 NYS Comptroller audit found DCWP's enforcement weak and DCWP agreed to tighten it; a 2026 bill, Local Law 25 of 2026, ordered a study of city agencies' own use of such tools but changed none of the law's duties.) This is the lowest-risk citation of the six — directly confirmed against the regulator's own page.

**Primary source:** https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page (NYC DCWP, directly fetched and quoted 2026-11-11)

**Verified:** 2026-11-11. **Confidence:** high.

---

## 3. Illinois's AI notice law for hiring

**Plain-English summary:** The law is **Public Act 103-0804** (from HB 3773), amending the Illinois Human Rights Act. Signed by Gov. Pritzker on August 9, 2024; **effective January 1, 2026** (confirmed current as of today). It makes it a civil rights violation for a covered employer to: (1) use AI in a way that has the effect of discriminating against employees/applicants on a protected basis, (2) use ZIP code as a proxy for a protected class, or (3) fail to notify employees/applicants that AI is being used in recruitment, hiring, discipline, discharge, or other employment decisions. The Illinois Department of Human Rights withdrew its proposed implementing rules on June 2, 2026 — that did not pause or delay the law; it is enforceable directly from the statute in the meantime.

**Caveat — flagged, not glossed over:** Direct fetches of ilga.gov (the canonical primary source) failed twice during this pass with a TLS/certificate-verification error on the fetch tool's side (not a 404 or content issue), and a legiscan.com mirror returned HTTP 403. The specifics above are corroborated by multiple independent, mutually-consistent secondary sources (SHRM's official employer-law bulletin, and several law-firm client alerts: Duane Morris, Sheppard Mullin, and others), all citing the same Public Act number and effective date — but this is secondary corroboration, not a direct read of the statute text itself. **Recommend a follow-up direct read of ilga.gov** (retry from a different network path/tool) before this citation is quoted verbatim (e.g., exact statutory wording) anywhere in the product; the *existence, number, and effective date* are solidly corroborated, but exact operative language was not independently confirmed against the primary text this pass.

**Primary source (canonical cite, not independently re-confirmed by direct fetch this pass):** https://www.ilga.gov/Legislation/PublicActs/View/103-0804

**Verified:** 2026-11-11 (secondary-source corroboration only; primary-source direct read still outstanding). **Confidence:** medium-high on the facts stated; primary-fetch verification incomplete.

---

## 4. Colorado AI Act (SB 24-205 / the "Colorado AI Act")

**Plain-English summary:** **The original "Colorado AI Act" (SB 24-205) never took effect and is no longer good law.** Signed May 17, 2024, its effective date was first delayed from February 1, 2026 to June 30, 2026 via SB 25B-004 (passed in an August 2025 special session, signed August 28, 2025). Before that later date arrived, xAI (Elon Musk's AI company) sued in federal court (D. Colo., filed April 9, 2026) challenging SB 24-205 on First Amendment, Dormant Commerce Clause, due process, and equal-protection grounds, and the U.S. Department of Justice joined that suit on April 24, 2026. Facing that pressure, the Colorado legislature **repealed SB 24-205's substantive provisions outright and reenacted a narrower replacement, SB 26-189**, signed by Governor Polis on **May 14, 2026** (Chapter 131, 2026 Session Laws). SB 26-189 replaces the "high-risk AI system" framework with a narrower one governing "automated decision-making technology" (ADMT) used in "consequential decisions" about consumers (a category that includes employment decisions) — **effective January 1, 2027**. Secondary legal reporting indicates both xAI and DOJ are expected to challenge SB 26-189 as well.

**This is the single most unstable citation of the six.** Any product copy referencing "the Colorado AI Act" by its original name/bill number is now describing dead law; the live law is SB 26-189, which itself has not yet taken effect and sits in a still-contested area. Treat this citation as needing a freshness re-check close to ship date, not a one-time verification.

**Primary source:** https://leg.colorado.gov/bills/SB26-189 (Colorado General Assembly, directly fetched and quoted 2026-11-11 — confirms repeal/reenactment, signing date, and effective date)

**Verified:** 2026-11-11. **Confidence:** high on the facts as of today; **explicitly low confidence on durability** — this area has changed at least three times in the last 15 months and is reported as likely to change again.

---

## 5. EU AI Act — high-risk classification for hiring/employment AI

**Plain-English summary:** Confirmed: **Annex III, point 4 of the EU AI Act (Regulation (EU) 2024/1689) classifies hiring/employment AI as high-risk**, and Article 6(2) states AI systems referred to in Annex III "shall be considered to be high-risk." Specifically, point 4(a) covers AI used for recruitment/selection (targeted job ads, filtering applications, evaluating candidates) and point 4(b) covers AI used for work-related decisions (promotion, termination, task allocation, performance/behavior monitoring). **This classification itself has not changed.** What has changed is the compliance deadline: the "Digital Omnibus on AI" (Regulation (EU) 2026/1744 — adopted via EU Parliament vote June 16, 2026, published in the Official Journal, entered into force July 27, 2026) delayed the application date for Annex III high-risk-system obligations **from August 2, 2026 to December 2, 2027**. (High-risk systems embedded in regulated products get a separate, later date of August 2, 2028 — not relevant to hiring software specifically.) Any product copy citing an August 2026 compliance deadline for EU hiring AI is now stale; December 2, 2027 is current.

**Primary sources:**
- Annex III point 4 text: https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3 (European Commission's official AI Act Service Desk — "the Act's own site" — directly fetched and quoted verbatim 2026-11-11)
- Delayed timeline confirmation: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai (European Commission, directly fetched and quoted 2026-11-11)
- (eur-lex.europa.eu was attempted directly for the consolidated legal text but returned empty content / a TLS error on this pass; the two Commission sources above are both official, authoritative, and mutually consistent, as is secondary reporting from Cooley, Gibson Dunn, Sidley, and White & Case, so this is not treated as an open gap, but a direct eur-lex re-fetch would be the belt-and-suspenders follow-up.)

**Verified:** 2026-11-11. **Confidence:** high.

---

## 6. *Mobley v. Workday* — current procedural status

**Plain-English summary:** **Active, ongoing litigation — not settled, no trial yet.** U.S. District Court, N.D. Cal., No. 3:23-cv-00770-RFL (Judge Rita F. Lin). Filed February 2023 by Derek Mobley against Workday, alleging Workday's AI-driven applicant-screening tools discriminate on race, age, and disability. Key developments, newest first:
- **October 2026:** Active, contested discovery disputes (deposition limits, protective orders); the court has pushed the parties to consolidate their filings. No settlement indicated.
- **June 22, 2026:** Judge Lin largely denied Workday's motion to dismiss the Third Amended Complaint — allowed new gender- and age-discrimination claims under California's FEHA to proceed (grounded in Workday's Pleasanton, CA headquarters having designed/controlled the tools), while dismissing a newly and improperly added Asian-American race-discrimination claim and some "direct employer" liability theories.
- **July 2025:** Collective expanded to cover applicants screened via Workday's HiredScore AI features.
- **May 16, 2025:** Court granted preliminary certification of a **nationwide ADEA (age discrimination) collective action** — one of the first such rulings against an AI hiring-tool vendor.
- **July 12, 2024:** Court denied dismissal of disparate-impact claims (Title VII, ADEA, part of ADA), allowing the case to proceed on the theory that Workday acts as an "agent" of its employer-customers and can be independently liable — not just the hiring employers themselves.
No settlement has been publicly reported as of this research pass, though secondary commentary notes the potential collective size (characterized by Workday's own filings as potentially "hundreds of millions" of applicants) creates settlement pressure.

**Primary/authoritative sources:**
- Court docket (mirror of PACER/CourtListener): https://www.pacermonitor.com/public/case/47898981/Mobley_v_WORKDAY,_INC (directly fetched 2026-11-11; entries through October 7, 2026)
- Civil Rights Litigation Clearinghouse (Univ. of Michigan Law) case tracker: https://clearinghouse.net/case/44074/ (directly fetched 2026-11-11)
- Legal reporting on the June 2026 ruling: Law360, "Workday Can't Knock Calif. Law Claims Out Of AI Bias Suit" (https://www.law360.com/articles/2492344); Bloomberg Law, "Workday Loses Bid to Toss AI Discrimination Suit in California" (https://news.bloomberglaw.com/daily-labor-report/workday-loses-bid-to-toss-ai-discrimination-suit-in-california)

**Verified:** 2026-11-11. **Confidence:** high on status as of today; by nature of active litigation, this should be re-checked before any ship date if significant time passes — it has moved every few months for the past three years.

---

## Summary table

| # | Item | Status as of 2026-11-11 | Confidence |
|---|------|--------------------------|------------|
| 1 | Title VII disparate impact | Valid law; EEOC's AI guidance withdrawn Jan 2025; federal enforcement deprioritized since Apr 2025 EO; private suits (e.g. Mobley) unaffected | High (doctrine); flag enforcement-posture nuance in copy |
| 2 | NYC Local Law 144 | In force, unchanged, since Jan 2023 / enforced since Jul 2023 | High |
| 3 | Illinois AI notice law | Public Act 103-0804, effective Jan 1, 2026, in force | Medium-high (secondary-corroborated; ilga.gov direct fetch failed this pass) |
| 4 | Colorado AI Act | SB 24-205 repealed before taking effect; replaced by SB 26-189, effective Jan 1, 2027; area still contested (xAI/DOJ litigation) | High as-of-today; low durability — recheck before ship |
| 5 | EU AI Act Annex III | Hiring AI confirmed high-risk (unchanged); compliance deadline delayed Aug 2026 → Dec 2, 2027 | High |
| 6 | *Mobley v. Workday* | Active, not settled; disparate-impact and FEHA claims proceeding; ADEA collective certified | High as-of-today; fast-moving |
