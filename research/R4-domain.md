# R4 — Domain Rules (ITAR/Clearance) + Frontier Verification Tech

**Status:** Verified against primary sources. **Last verified: 2026-11-11.**
**Companion machine-readable files:** `data/rules.json` (13 rule entries), `data/timelines.json`.

This report backs every rule and number Clearance Lens shows with a primary-source citation. Secondary sources (trade press, blogs) are used only to corroborate or to point at a primary document, and are labeled as such. Where I could not verify a number against a primary source, I used `null` rather than guess — per the product's own "verify with your FSO" fallback principle.

---

## Headline finding: the DCSA timeliness figures in the original brief are NOT stale

The brief flagged "~197 days Secret / ~243 days TS" as a placeholder from "stale memory" that needed re-verification. After pulling DCSA's actual FY2026 Q3 industry timeliness data — presented at the September 2, 2026 NISPPAC public meeting and downloaded directly from archives.gov — **those exact figures are DCSA's current published numbers for the most recent reported quarter**:

| | Initiate | Investigate | Adjudicate | **End-to-end** |
|---|---|---|---|---|
| **Initial Secret (industry), FY26 Q3** | 21 days | 59 days | 117 days | **197 days** |
| **Initial Top Secret (industry), FY26 Q3** | 20 days | 97 days | 126 days | **243 days** |

Source: "DCSA Inventory & Timeliness \| Industry" slide, DCSA Personnel Vetting (presenter: Tom Giancoli), NISPPAC public meeting, September 2, 2026, National Archives — data as of August 17, 2026. (`https://www.archives.gov/files/isoo/oversight-groups/nisppac/20260902-nisppac-public-meeting-slides.pdf`, pages 60-61 of the published deck.) I downloaded this 67-page, 15 MB slide deck directly and read the actual chart (not a text-extraction/OCR summary — the deck is a scanned/paper-capture PDF whose text layer is garbled, so I visually read the rendered slide image to get these numbers right).

**But the story underneath is more interesting than "nothing changed," and the product should be able to explain it:** the *investigation* phase has gotten dramatically faster (Top Secret investigation time fell from 234 days a year ago to 97 days now), while the *adjudication* phase has gotten correspondingly slower (40 → 126 days for Top Secret over the same period). The two roughly offset, so the end-to-end number has barely moved and ticked back up this quarter after a brief dip. A companion, government-wide (not industry-only) data source — the Performance Accountability Council's own Trusted Workforce 2.0 Quarterly Progress Report for the same quarter — independently confirms the investigation-phase figures: 61 days average for Secret-tier ("Moderate Risk") cases _[Correction, 2026-11-12 (D-049): 61 is the FY26-Q2 value; the FY26-Q3 table shows 57]_ and 82 days for Top-Secret-tier ("High Risk") cases under the newer "100% of cases" methodology (49 and 67 days respectively under the older "fastest 90%" methodology DCSA used for two decades). This is a second, independent government source landing in the same range as the industry figure once you isolate just the investigation step, which is strong corroboration.

**Practical implication for `estimate_timeline`:** report the end-to-end industry figures (197 / 243) as the headline number, but `explain_rule` should be able to say *why*: it's not the background investigation that's the bottleneck anymore — it's the adjudication queue. See the full breakdown and five-quarter trend in `data/timelines.json` and the `dcsa-timeliness` entry in `data/rules.json`.

A word of caution for whoever maintains this product: these numbers are reported quarterly and have swung by 50-100+ days between quarters in the last two years (Top Secret end-to-end ranged from 221 to 333 days across just the last five quarters). **Do not hardcode these as permanent facts** — re-check `performance.gov/trusted-workforce` and the next NISPPAC meeting's slides each quarter.

---

## 1. ITAR "U.S. Person" (22 CFR 120.62)

**Verbatim text of 22 CFR § 120.62** (confirmed via Cornell LII's mirror of the current eCFR text; eCFR.gov's canonical URL is `https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.62` but my automated fetcher hit a bot-check redirect there, so I verified the text via `https://www.law.cornell.edu/cfr/text/22/120.62`, which mirrors eCFR verbatim):

> "U.S. person means a person who is a lawful permanent resident as defined by 8 U.S.C. 1101(a)(20) or who is a protected individual as defined by 8 U.S.C. 1324b(a)(3). It also means any corporation, business association, partnership, society, trust, or any other entity, organization, or group that is incorporated to do business in the United States. It also includes any governmental (Federal, state, or local) entity. It does not include any foreign person as defined in § 120.63."

Unpacking who that actually covers, tracing through **8 U.S.C. § 1324b(a)(3)** ("protected individual," fetched via Cornell LII):

- **(A)** A citizen or national of the United States — straightforward.
- **(B)** An alien lawfully admitted for permanent residence (i.e., a green card holder), granted temporary residence under specific legalization provisions, admitted as a refugee, or granted asylum — **but only if** they applied for naturalization within 6 months of becoming eligible (or within 6 months of November 6, 1986, if already eligible then), **and** either were naturalized within 2 years of applying or can show they are actively pursuing it.

In practice, this means:
- **U.S. citizens** → U.S. persons, always.
- **Green card holders (LPRs)** → U.S. persons via the *first* prong of 120.62 ("lawful permanent resident as defined by 8 U.S.C. 1101(a)(20)"), which does **not** carry the naturalization-timing condition — that condition sits on the separate "protected individual" path, which mostly matters for asylees/refugees who don't yet have a green card.
- **Asylees/refugees without LPR status yet** → U.S. persons only if they meet the naturalization-pursuit timing conditions above.
- **Everyone else — H-1B, L-1, O-1, TN, F-1/OPT, J-1, and every other nonimmigrant visa category** → "foreign person" under 22 CFR 120.63, full stop, no matter how long they've worked in the U.S. or how senior they are.

This is a bright-line immigration-status test, entirely separate from whether someone holds, or could get, a security clearance. A startup can lawfully employ foreign persons generally — it just cannot let them access ITAR-controlled technical data or defense services without a specific DDTC license or exemption.

**Sources:** 22 CFR 120.62 and 120.63 (eCFR, `https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.62` and `.../section-120.63`); 8 U.S.C. 1324b(a)(3) (Cornell LII, `https://www.law.cornell.edu/uscode/text/8/1324b`).

---

## 2. EAR "Deemed Export" — and how it differs from ITAR in practice

**15 CFR § 734.13** (Export Administration Regulations, administered by Commerce's Bureau of Industry and Security — a different agency and regime from ITAR/DDTC/State). Confirmed text, subsection (b):

> "Any release in the United States of 'technology' or source code to a foreign person is a deemed export to the foreign person's most recent country of citizenship or permanent residency."

So releasing export-controlled technical information or source code to a foreign national *inside the United States* — in a meeting, a code review, a shared repo — is legally equivalent to exporting it to that person's home country, even though nothing physically left the U.S.

**How this differs from ITAR for an engineering job**, which is the part that actually matters for hiring decisions:

| | ITAR (DDTC/State) | EAR (BIS/Commerce) |
|---|---|---|
| Covers | Defense articles/services on the U.S. Munitions List | "Dual-use" items/technology (civil + military use) on the Commerce Control List |
| Core test | Is the worker a "U.S. person"? (near-binary) | What is the worker's specific nationality, and is there an applicable license exception? |
| Dual citizens / green card holders | Still must be a "U.S. person" under 120.62 (green card holders qualify; dual citizens who are U.S. citizens qualify) | **Explicitly exempted** from deemed-export treatment — EAR treats them as not needing a deemed-export license at all |
| Flexibility for a foreign-national hire | Generally requires a specific DDTC license/exemption (e.g., certain close-ally exemptions); in practice, teams doing USML-controlled work skew close to all-U.S.-persons | A deemed-export license can be sought per nationality/technology pair, so a foreign-national engineer can sometimes legally work on EAR-controlled (but not ITAR-controlled) technology with the right license in place |

**Bottom line for the product:** if a role is described as working on weapons systems, munitions, spacecraft/defense-specific software, or similar USML categories, assume ITAR and a near-total U.S.-person requirement. If it's "dual-use" (many semiconductors, some AI/autonomy software, certain sensors), EAR applies and there is more room to navigate with export licensing — but it still is not a clean bill of health for any foreign national on any technology.

**Sources:** 15 CFR 734.13 (eCFR, `https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-734/section-734.13`; text confirmed via Cornell LII `https://www.law.cornell.edu/cfr/text/15/734.13`); BIS deemed-export guidance (`https://www.bis.doc.gov/index.php/enforcement/oee/14-policy-guidance/deemed-exports`).

---

## 3. SF-86 / eApp, and NBIS vs. DISS — current rollout status

**SF-86** ("Questionnaire for National Security Positions") is the background-investigation form behind every clearance. It is filed electronically. Two separate transitions are underway simultaneously, and conflating them is a common source of confusion:

1. **The filing *portal*** is moving from the legacy **e-QIP** to **eApp** (part of the NBIS program). Per a July 2026 Federal Register notice (OPM), the updated February 2024 edition of the SF-86/SF-85/SF-85P forms rolled out via eApp, and the **old paper/legacy-form versions stopped being accepted as of August 1, 2025**. OPM is not proposing content changes to the SF-86 itself right now because of transition #2 below.
2. **The *form content* itself** is being consolidated: DCSA began an internal rollout of a unified **Personnel Vetting Questionnaire (PVQ)** in **April 2026**, intended to eventually replace the three separate SF-86/SF-85/SF-85P forms that personnel vetting has used for over 30 years. As of the FY2026 Q3 report, this is still in DCSA-internal collection/testing, with expansion to other investigation service providers planned next.

**NBIS vs. DISS — current status (this is the part most likely to be stale in anyone's mental model):** JPAS was replaced by **DISS** as the system of record in 2021. **NBIS** (National Background Investigation Services) was designed to eventually replace DISS entirely. As of today (November 11, 2026), **that has not happened — and DCSA is actively moving case-management functions *back* toward DISS, not forward into NBIS:**

- Industry "Initiate/Review/Authorize" (IRA) functionality — including eApp case submission — went live on an upgraded **DISS-JVS (Joint Verification System)** on **July 31, 2026**.
- **September 30, 2026** was the last day to initiate new cases in **NBIS-Agency**.
- **NBIS-Agency becomes fully read-only after November 30, 2026** (close of business), per DCSA's own partner notifications.
- Open NBIS-Agency cases do **not** automatically transfer — anything unfinished by November 30, 2026 must be **re-initiated in DISS-JVS**.

In short: as of this research date, **DISS-JVS, not NBIS, is the live operational system** for initiating and managing industry clearance cases. This is a meaningful course-correction from the program's original multi-year vision, and it's exactly the kind of detail a model relying on 2024/2025-era training data would get backwards. (Separately, the applicant-facing `vetting.nbis.mil` eApp portal continues to exist as the SF-86 filing front-end; it is the *agency-side case management* back-end that is moving back to DISS.)

Neither DISS nor NBIS is queryable by a candidate or a recruiter — access is restricted to credentialed Facility Security Officers. This is exactly why Clearance Lens's hard constraint ("never query or imitate DISS/NBIS/DCSA systems… explain the correct path (FSO verification at offer stage) instead") is the only honest design.

**Sources:** OPM/Federal Register SF-86 notice (`https://www.govinfo.gov/content/pkg/FR-2026-07-09/html/2026-13868.htm`); DCSA e-QIP page (`https://www.dcsa.mil/is/eqip`); NBIS portal (`https://vetting.nbis.mil/authentication`); DCSA news release, "Industry transition to DISS for Initiate and Review (I/R) functionality" (`https://www.dcsa.mil/About-Us/News/Article/Article/4563691/industry-transition-to-diss-for-initiate-and-review-ir-functionality/` — confirmed to exist via search; dcsa.mil blocks automated fetches so I was not able to pull the full article text, only confirm its existence, title, and the dates corroborated across independent trade reporting); Trusted Workforce 2.0 QPR FY2026 Q3 (`https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf`, directly read — "Enhanced Questionnaire Rollout Begun" section, p.3).

---

## 4. SEAD 4 — the 13 adjudicative guidelines

**Security Executive Agent Directive 4**, "National Security Adjudicative Guidelines," signed by the Director of National Intelligence (as Security Executive Agent) on December 10, 2016, **effective June 8, 2017**. It is the single set of criteria every federal agency uses to decide security-clearance eligibility, evaluated holistically under the "whole person concept" — no single guideline is automatically disqualifying, and each one lists both disqualifying and mitigating conditions. I found no superseding revision as of this research date; it remains the current, controlling version.

The 13 guidelines, one line each:

| | Guideline | One-line summary |
|---|---|---|
| A | Allegiance to the United States | Conduct suggesting divided loyalty or a willingness to act against U.S. interests |
| B | Foreign Influence | Close ties (family, financial, obligation) to a foreign country or its agents that could be exploited |
| C | Foreign Preference | Actions showing preference for a foreign country over the U.S. (e.g., foreign citizenship/passport use, foreign military service) |
| D | Sexual Behavior | Conduct that reflects a lack of judgment or discretion, or that creates vulnerability to coercion |
| E | Personal Conduct | Dishonesty, rule violations, or other conduct calling judgment/reliability/trustworthiness into question |
| F | Financial Considerations | Unexplained affluence, debt, or financial irresponsibility that could motivate illegal acts for money |
| G | Alcohol Consumption | Alcohol use that impairs judgment or reliability |
| H | Drug Involvement and Substance Misuse | Illegal drug use or misuse of prescribed substances |
| I | Psychological Conditions | Emotional, mental, or personality conditions that could impair judgment, reliability, or trustworthiness (a diagnosis is not required for a concern to exist; seeking treatment is explicitly not itself held against someone) |
| J | Criminal Conduct | A pattern of, or serious, criminal behavior |
| K | Handling Protected Information | A history of mishandling classified or other protected information |
| L | Outside Activities | Outside employment or activities creating a conflict with protecting classified information |
| M | Use of Information Technology | Misuse of IT systems (unauthorized access, introducing malware, etc.) |

**Sources:** SEAD 4 full text, hosted as a PDF on a U.S. government domain by the Department of Energy (`https://www.energy.gov/sites/prod/files/2018/02/f48/SEAD4_20170608.pdf`); mirrored by the Federation of American Scientists (`https://sgp.fas.org/othergov/intel/sead-4.pdf`); DOD Consolidated Adjudications Facility "Whole Person" fact sheet (`https://www.dcsa.mil/Portals/91/Documents/pv/DODCAF/DOD_CAF_Whole_Person_Factsheet_042021.pdf`). I was not able to find a currently-live direct PDF link on dni.gov/odni.gov itself — an archived DNI reform-accomplishments page I fetched lists "SEAD-4 (PDF)" but marks the link as "not published" in that particular page snapshot — so I'm citing the DOE .gov mirror and the FAS mirror instead, both of which serve the identical, verbatim document.

---

## 5. SEAD 7 — reciprocity of existing clearances between agencies

**Security Executive Agent Directive 7**, "Reciprocity of Background Investigations and National Security Adjudications," issued **November 9, 2018**. Core rule: an agency must accept another authorized agency's existing eligibility determination at the same or higher level, rather than re-investigating/re-adjudicating from scratch — subject to real limits:

- The break in federal service or classified access must not exceed **24 months**. _[Correction, 2026-11-12 (DECISIONS.md D-049): this 24-month rule is in 32 CFR 156.5(h)(3) (DoD), not SEAD 7 — SEAD 7 addresses investigations more than seven years old case by case.]_
- The underlying investigation must not be older than **7 years**, with no new derogatory information.
- Within those bounds, a reciprocity determination is supposed to be made in about **5 business days**.
- Only the Security Executive Agent (the DNI) can generally disallow reciprocal recognition, and only for specific national-security reasons.

For industry/contractor employees specifically, this duty is implemented in regulation at **32 CFR § 117.10** (the NISPOM rule), which I fetched and read directly:

> "...a temporary eligibility determination shall not exceed one year unless approved by the applicable CSA in the system of record." / the CSA determines whether employees were "previously determined eligible for access to classified information or investigated by an authorized investigative activity" per SEAD 7, and "[a]ny current eligibility determination... based on an investigation of a scope that meets or exceeds that necessary for the required level of access will provide the basis for a new eligibility determination."

Notably, **32 CFR 117.10 governs both reciprocity and interim/temporary eligibility** in the same section — which is why they're closely linked in practice: a candidate whose break in service is under 24 months is the same population who can plausibly get fast reciprocity rather than needing a fresh investigation (see the `lapsed_lt_2y` vs. `lapsed_gt_2y` modifiers in `timelines.json`).

**Sources:** SEAD 7 full text (Federation of American Scientists mirror, `https://sgp.fas.org/othergov/intel/sead-7.pdf` — I could not locate a currently-reachable direct dni.gov/odni.gov/archive.dni.gov PDF link for SEAD 7 itself after several attempts; the archived DNI reform page I successfully fetched does not list SEAD-7 at all in its current snapshot); ICPG 704.4, "Reciprocity of Personnel Security Clearance and Access Determinations" (dni.gov archive, April 6, 2022, which explicitly states it conforms to SEAD 7) (`https://archive.dni.gov/files/documents/ICPG/ICPG-704-4-Reciprocity-of-Personnel-Security-Clearance-and-Access-Determinations-20220406.pdf`); 32 CFR 117.10 (Cornell LII, `https://www.law.cornell.edu/cfr/text/32/117.10`, text directly confirmed).

---

## 6. Continuous Vetting / Trusted Workforce 2.0

**Trusted Workforce 2.0 (TW 2.0)** is the government-wide personnel-vetting reform launched in 2018 under the **Security, Suitability, and Credentialing Performance Accountability Council (PAC)**, the interagency body (chaired by OMB's Deputy Director for Management, with the DNI as Security Executive Agent, OPM as Suitability/Credentialing Executive Agent, and DCSA as the primary investigative service provider) made accountable under Executive Order 13467 (as amended).

**Continuous Vetting (CV)** replaces the old model — a single, deep **periodic reinvestigation (PR)** every 5 years (Top Secret/SCI) or 5-10 years (Secret) — with **ongoing automated record checks** (criminal activity, terrorism, financial/credit, public records, foreign travel, and more) that generate alerts reviewed by a human adjudicator as they happen, rather than only at a scheduled multi-year interval.

I directly read the Performance Accountability Council's own FY2026 Q3 Quarterly Progress Report, which confirms CV's status as of this research date:

> "At the end of June [2026], DCSA sunset legacy periodic reinvestigation (PR) investigative products. Instead, the agency — with only a few limited exceptions — will only facilitate enrollment into continuous vetting."

So **legacy periodic reinvestigations for the national-security population were formally retired at the end of June 2026** — a recent, specific milestone, not a vague "it's been happening for years" story. CV enrollment for the core national-security population was already at 78% as of FY26 Q3; the broader, newer "non-sensitive public trust" (NSPT) federal population is still ramping (54% enrolled as of FY26 Q3, expected substantially complete by the end of calendar 2026). Separately, DCSA announced on **May 19, 2026** that NISP contractor national-security personnel now get a simplified questionnaire every 5 years in place of a full reinvestigation case.

**Day-to-day effect on a cleared person:** no more one large reinvestigation case file/interview every several years. Instead, continuous automated monitoring in the background, an obligation to self-report qualifying life events (foreign travel, financial changes, arrests, new foreign contacts, etc.) as they occur, and the possibility that an automated alert triggers a review and request for more information at any time — not on a predictable schedule.

**Sources:** Trusted Workforce 2.0 Quarterly Progress Report, FY2026 Q3, and its companion "Legacy Metrics" supplement (Performance Accountability Council / performance.gov, both directly downloaded and read: `https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf` and `https://assets.performance.gov/files/QPR_Legacy_Metrics_(FY26-Q3).pdf`); DCSA Continuous Vetting page (`https://www.dcsa.mil/Personnel-Vetting/Continuous-Vetting/` — confirmed to exist and its content corroborated via search synthesis; dcsa.mil blocks automated fetches so I could not pull the full page text directly).

---

## 7. Interim (temporary) clearances — what they do and don't permit

Officially renamed "**temporary eligibility**" in current regulation (32 CFR 117.10), though "interim" remains the common colloquial term (and the one SEAD 8 itself uses in its title, "Temporary Eligibility"). Reading 32 CFR 117.10 directly:

- **Permits:** access to classified information at the Top Secret, Secret, or Confidential level for ordinary ("collateral") work, based on preliminary/partial investigative results showing no disqualifying information so far.
- **Does NOT permit:** access to **Restricted Data (RD)**, **COMSEC**, or **NATO** classified information — these categories always require a *final* eligibility determination. Access to **SCI** or **Special Access Program (SAP)** material on an interim basis is discretionary and decided case by case, not automatic.
- **Who's eligible:** **U.S. citizens only** — "non-U.S. citizens cannot receive temporary eligibility," per the regulation.
- **Duration:** "a temporary eligibility determination shall not exceed one year unless approved by the applicable CSA in the system of record" — a hard one-year regulatory cap absent specific extension approval.
- **Revocable:** at any point, if the completed investigation or an interim adverse-information check surfaces a problem.

I did not find a current, primary-sourced figure for the *typical time to grant* an interim determination — the one number circulating online (~7 days, attributed to "DCSA industry data, 2022") is several years old and traces to a secondary source, not a DCSA publication I could independently verify, so `timelines.json` leaves that figure `null` rather than repeating a stale, unverifiable number.

**Sources:** 32 CFR 117.10 (Cornell LII, text directly confirmed, `https://www.law.cornell.edu/cfr/text/32/117.10`); DCSA Interim Clearances page (`https://www.dcsa.mil/mc/pv/fso/interim_clearances` — confirmed to exist, content corroborated via search synthesis; direct fetch blocked by dcsa.mil's bot protection).

---

## 8. FCL (Facility Clearance) sponsorship — what a startup needs

A **Facility Clearance (FCL)** is an administrative determination that a specific company location is eligible to access, store, or work with classified information up to a given level. It belongs to the facility/company, not to any one employee.

**Critically: a company cannot apply for its own FCL.** It must be **sponsored**, by one of two kinds of entity:
1. A U.S. Government Contracting Activity (GCA) that has, or anticipates, a classified contract requiring that specific company's work, or
2. An already-cleared prime contractor that needs to subcontract classified work to the (as-yet-uncleared) company.

**There is no self-service path and no waitlist a startup can join on its own initiative** — the single biggest practical bottleneck for an early-stage defense-tech startup is usually *finding a sponsor willing to make this request*, not DCSA's internal processing speed.

**Process, once a sponsor exists:**
1. Company designates a **Facility Security Officer (FSO)** — this should happen before or at sponsorship.
2. Sponsor submits a request through DCSA's **National Industrial Security System (NISS)**, typically including a **DD Form 254** (which spells out the classification level, security requirements, and scope of the work driving the need) and a sponsorship letter.
3. DCSA's Facility Clearance Branch reviews the package and either rejects it (with reasons) or accepts it and places the facility "in-process," sending a welcome/introductory email that starts the formal application clock.
4. The company is generally expected to return all required paperwork within **20 days** of that welcome email.
5. **Cost:** the government funds DCSA's own FCL processing — there's no government fee to the company. The company's real cost is internal: building compliant security processes under NISPOM (32 CFR Part 117) and the FSO's time.

**Timeline reality check:** DCSA itself states it cannot commit to a fixed timeline because so much depends on how quickly and accurately the company provides required information — and per a 2026 DCSA conference briefing, the average sponsorship package takes **1.93 submission cycles with a 53% rejection rate**, rising to **2.5 cycles / ~70% rejection** for initial/upgrade FCL packages specifically. That alone routinely adds weeks to months. Commonly cited (secondary/trade-press, not DCSA-published-statistic) overall ranges: **roughly 3-9 months** from sponsorship to a granted FCL for a straightforward case, and **6-18 months** where foreign ownership, control, or influence (FOCI) mitigation is involved. One source cites a narrower 45-90-day window for the sponsorship-to-approval step specifically in clean cases — consistent with the lower end of the broader range once you separate "finding + submitting to a sponsor" time from "DCSA's own review" time.

**Sources:** DCSA Facility Clearance Orientation Handbook, dated August 28, 2026 (`https://www.dcsa.mil/Portals/128/Documents/CTP/fc/DCSA%20FCL_Orientation_Handbook_20260828.pdf` — confirmed to exist via search; direct fetch blocked by dcsa.mil's bot protection, so handbook content here is drawn from corroborating secondary coverage plus the DCSA Small Business Guide below); DCSA Small Business Guide to the Facility Clearance Process (`https://www.dcsa.mil/Portals/91/Documents/about/business/DCSA_SB_Guide_Facility_Clearance_Process_Aug2019.pdf`); Office of Naval Research, "Roadmap to Getting a Facility Clearance/FCL Sponsorship" (`https://www.onr.navy.mil/media/document/roadmap-getting-facility-clearancefcl-sponsorship`); 32 CFR Part 117 (NISPOM).

---

## 9. Frontier identity/credential verification tech (context for `explain_rule`, not implemented in v0)

The throughline for this whole section: **every one of these technologies can prove identity, age, nationality, or document-authenticity facts. None of them can prove security clearance status.** There is no public, cryptographically-verifiable credential for "holds an active U.S. security clearance" — the only authoritative systems (DISS-JVS, NBIS, Scattered Castles) are restricted to vetted FSOs, by design, and that is unlikely to change given how clearance status is itself treated as sensitive information. If a candidate or a product ever encounters a "zero-knowledge proof of my clearance," that claim should be treated with real skepticism until proven otherwise.

### Zero-knowledge passport proofs: Self Protocol and zkPassport

- **Self Protocol** (`self.xyz`) — an open-source, zero-knowledge identity platform from Self Labs (which acquired OpenPassport; team has roots in Celo). A user scans a passport, EU ID card, or Aadhaar card via phone NFC; a zero-knowledge proof is generated **on the device** ("there is no cloud copy and no central database... Self itself never sees raw documents"). The app/service receives only the specific fact disclosed — age threshold, country/nationality, not-on-a-sanctions-list status, or a uniqueness "nullifier" that distinguishes one real human from another without identifying them. Explicitly positioned to *complement*, not replace, regulated KYC.
- **zkPassport** (`docs.zkpassport.id`) — a similar open-source protocol: NFC scan of a passport, national ID, or residence permit produces a client-side zero-knowledge proof of age, nationality, or personhood/name, revealing nothing else, while cryptographically guaranteeing the source document's authenticity.

Both are squarely KYC/Sybil-resistance/age-verification tools, not clearance-adjacent in any way. They are, however, a reasonable analogy for explaining the *shape* of a future "prove a fact without handing over the document" credential — useful for `explain_rule` to describe when asked about frontier identity tech, while being explicit that nothing like this exists yet for clearance status specifically.

### W3C Verifiable Credentials 2.0

The **Verifiable Credentials Data Model (VCDM) 2.0** became an official, finished **W3C Recommendation on May 15, 2025** — confirmed via W3C's own news announcement. It's the standard structure for a cryptographically-signed, tamper-evident digital credential (conceptually: a digital diploma, license, or ID card that can be verified without calling back to the issuer). Unlike 1.0, VC 2.0 doesn't mandate one single way of cryptographically securing a credential — it explicitly accommodates Data Integrity proofs, JOSE/COSE, **and SD-JWT**. A **VC 2.1** maintenance revision is already underway (First Public Working Draft published April 9, 2026) under a freshly-chartered 2026-2028 Working Group.

### SD-JWT / SD-JWT VC — current IETF standardization status

Two distinct specs, often conflated:
- **Base SD-JWT** ("Selective Disclosure for JSON Web Tokens") — the mechanism letting a credential holder reveal only some fields while keeping the issuer's signature valid over the whole — is **finalized: RFC 9901, published by the IETF in November 2025**, Proposed Standard.
- **SD-JWT VC** ("SD-JWT-based Verifiable [Digital] Credentials") — a richer profile built on top of base SD-JWT, adding things like a type/schema system for credentials — is **still an IETF Internet-Draft**, not yet a final RFC. As of this research date it is at **revision -22** (dated October 30, 2026), in IESG review (a SECDIR security-directorate review was pending with a due date of November 3, 2026), heading toward Proposed Standard status but not there yet.

So: "SD-JWT" the base mechanism is done and final; "SD-JWT VC" the credential profile built on it is close but still in progress. Get this distinction right if asked — conflating the two over- or under-states how settled the spec is.

### mDL / ISO/IEC 18013-5

The international standard for a phone-based mobile driver's license: how its data is structured and how it's presented to a verifier (e.g., a TSA checkpoint reader). **ISO/IEC 18013-5:2021** was approved August 18, 2021 and remains the only published edition — a second edition is in development (committee-draft/DIS stage as of 2026) but not yet published. A companion standard for remote/online presentation, **ISO/IEC 18013-7**, published in 2024. In the U.S., **AAMVA** layers additional implementation guidance for state DMV programs; several states (California, Colorado, Arizona, Maryland, and others) have live mDL programs built on it, and **TSA's CAT-2 readers** at 250+ airport checkpoints already accept an 18013-5-compliant mDL.

**Sources:** Self Protocol official site (`https://self.xyz/`, fetched directly); zkPassport documentation (`https://docs.zkpassport.id/intro`, fetched directly); W3C VC Data Model 2.0 spec (`https://www.w3.org/TR/vc-data-model-2.0/`) and W3C's Recommendation announcement (`https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation/`); W3C VC Working Group 2026-2028 charter (`https://w3c.github.io/vc-charter-2026/`); RFC 9901 (`https://www.rfc-editor.org/rfc/rfc9901.html`); IETF draft-ietf-oauth-sd-jwt-vc-22 (`https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/22/`); ISO/IEC 18013-5:2021 catalog entry (`https://www.iso.org/standard/69084.html`).

---

## Research methodology and honesty notes

- **Directly fetched and read** (highest confidence): 22 CFR 120.62/120.63 text (Cornell LII mirror), 8 U.S.C. 1324b (Cornell LII), 15 CFR 734.13 (Cornell LII), 32 CFR 117.10 (Cornell LII), the Trusted Workforce 2.0 QPR FY2026-Q3 main report and Legacy Metrics supplement (performance.gov, downloaded as PDF and visually read page-by-page), the September 2, 2026 NISPPAC meeting slide deck (archives.gov, 67 pages / 15 MB, downloaded directly and visually read for the exact timeliness figures after its embedded OCR text layer proved too garbled to trust), self.xyz, and docs.zkpassport.id.
- **Confirmed to exist with corroborated content, but not directly fetched** (dcsa.mil blocks automated fetching — both WebFetch and a second MCP fetch tool returned HTTP 403/login-barrier on every dcsa.mil URL I tried): the DCSA Interim Clearances page, DCSA Continuous Vetting page, DCSA FCL Orientation Handbook, and the DCSA DISS/NBIS transition news article. For these, I relied on search-engine-indexed snippets quoting the actual page content, cross-checked against at least one independent secondary source where possible, and cite the dcsa.mil URL itself as the source of record — a reader clicking through in a normal browser should see the page load normally (the block appears to be automated-traffic/bot detection, not a dead or moved page).
- **Could not locate a currently-reachable direct dni.gov/odni.gov PDF link** for SEAD 4 or SEAD 7 themselves (redirects, an archived page explicitly marking the SEAD-4 link "not published," and no result for SEAD-7 on the current site structure after multiple targeted searches). I cite a U.S. Department of Energy .gov mirror for SEAD 4's verbatim text and the Federation of American Scientists' long-standing public document archive for both, plus a directly-fetched, dni.gov-hosted implementing document (ICPG 704.4) that explicitly references and conforms to SEAD 7.
- **No figure in `rules.json` or `timelines.json` was invented.** Every number traces to one of the sources above. Where I could not verify a figure against a primary source (the "time to grant an interim" statistic, in particular), I used `null` rather than repeat an unverifiable secondary-source number, per this task's explicit instructions.
- **Version/status-sensitive facts** (NBIS rollout dates, DCSA timeliness, SEAD 4 currency, ISO 18013-5 edition status, W3C VC version, SD-JWT/SD-JWT VC IETF status) were all checked against November 2026 sources, not drawn from model memory.
