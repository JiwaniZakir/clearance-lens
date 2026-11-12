# Sources

Every rule, statistic, and legal citation this product uses, with a primary or authoritative source and a last-verified date. If something here could change (a law, a timeline figure, an API version), it's cited rather than asserted from memory — see `DECISIONS.md` and `research/` for the full verification trail. This file backs the live [`/sources`](https://clearance-lens.vercel.app/sources) page; `tests/unit/data-integrity.test.ts` confirms every URL in `data/rules.json`/`data/timelines.json` appears somewhere below.

This project was built end-to-end in one concentrated session, and every citation below was actually opened and confirmed live as part of that build — which is why the dates cluster together rather than reflecting a staggered, ongoing audit. Treat each date as that content's build-time snapshot, not a promise of continuous re-checking.

---

## From `data/rules.json` and `data/timelines.json`

_Generated from `data/rules.json` (lastVerified 2026-11-12) and `data/timelines.json` (lastVerified 2026-11-11) by `scripts/generate-sources.ts`. Do not hand-edit this section — edit the data files and regenerate._

### ITAR & export control, eligibility, clearance process, sponsorship, reciprocity, continuous vetting, verification tech

**ITAR "U.S. Person" Definition** (`itar-us-person`, itar)
  - [22 CFR § 120.62 — U.S. Person (eCFR)](https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.62) — verified 2026-11-11
  - [22 CFR § 120.63 — Foreign Person (eCFR)](https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.63) — verified 2026-11-11
  - [8 U.S.C. § 1324b(a)(3) — "Protected Individual" Defined (Cornell LII)](https://www.law.cornell.edu/uscode/text/8/1324b) — verified 2026-11-11

**Security Clearances Require U.S. Citizenship (Green Card Holders Included)** (`clearance-citizenship`, eligibility)
  - [Executive Order 12968 — Access to Classified Information, §§ 2.6 and 3.1(b) (Federal Register)](https://www.federalregister.gov/documents/1995/08/07/95-19654/access-to-classified-information) — verified 2026-11-12
  - [32 CFR § 117.10(k)–(l) — Non-U.S. citizens; temporary eligibility (eCFR)](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-117/section-117.10) — verified 2026-11-12
  - [22 CFR § 120.62 — U.S. Person (eCFR)](https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.62) — verified 2026-11-12

**Limited Access Authorization (LAA) for Non-U.S. Citizens** (`laa-non-citizen`, eligibility)
  - [32 CFR § 117.10 — Determination of Eligibility for Access to Classified Information for Contractor Employees (eCFR)](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-117/section-117.10) — verified 2026-11-12
  - [32 CFR § 117.10 — Limited Access Authorization text (Cornell LII mirror)](https://www.law.cornell.edu/cfr/text/32/117.10) — verified 2026-11-12
  - [Executive Order 12968 — Access to Classified Information, § 2.6 (Federal Register)](https://www.federalregister.gov/documents/1995/08/07/95-19654/access-to-classified-information) — verified 2026-11-12

**EAR "Deemed Export" vs. ITAR** (`deemed-export`, itar)
  - [15 CFR § 734.13 — Export, Reexport, and Release (eCFR)](https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-734/section-734.13) — verified 2026-11-11
  - [BIS — Deemed Exports Policy Guidance](https://www.bis.doc.gov/index.php/enforcement/oee/14-policy-guidance/deemed-exports) — verified 2026-11-11

**SF-86 and the eApp Filing System** (`sf86-eapp`, clearance-process)
  - [Federal Register — OPM Notice on SF-86/SF-85 Information Collection](https://www.govinfo.gov/content/pkg/FR-2026-07-09/html/2026-13868.htm) — verified 2026-11-11
  - [DCSA — Electronic Questionnaires for Investigations Processing (e-QIP)](https://www.dcsa.mil/is/eqip) — verified 2026-11-11
  - [Trusted Workforce 2.0 Quarterly Progress Report, FY2026 Q3 (Performance Accountability Council)](https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf) — verified 2026-11-11

**NBIS vs. DISS: Current System of Record** (`nbis-diss`, clearance-process)
  - [DCSA News — Industry Transition to DISS for Initiate and Review (I/R) Functionality](https://www.dcsa.mil/About-Us/News/Article/Article/4563691/industry-transition-to-diss-for-initiate-and-review-ir-functionality/) — verified 2026-11-11
  - [National Background Investigation Services (NBIS) Portal](https://vetting.nbis.mil/authentication) — verified 2026-11-11
  - [Trusted Workforce 2.0 Quarterly Progress Report, FY2026 Q3 (Performance Accountability Council)](https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf) — verified 2026-11-11

**SEAD 4: The 13 Adjudicative Guidelines** (`sead4`, eligibility)
  - [SEAD 4 — National Security Adjudicative Guidelines (June 8, 2017) — hosted by U.S. Department of Energy](https://www.energy.gov/sites/prod/files/2018/02/f48/SEAD4_20170608.pdf) — verified 2026-11-11
  - [SEAD 4 — National Security Adjudicative Guidelines (Federation of American Scientists mirror)](https://sgp.fas.org/othergov/intel/sead-4.pdf) — verified 2026-11-11
  - [DOD CAF — Whole Person Concept Fact Sheet](https://www.dcsa.mil/Portals/91/Documents/pv/DODCAF/DOD_CAF_Whole_Person_Factsheet_042021.pdf) — verified 2026-11-11

**SEAD 7: Clearance Reciprocity** (`sead7`, reciprocity)
  - [SEAD 7 — Reciprocity of Background Investigations and National Security Adjudications (Federation of American Scientists mirror)](https://sgp.fas.org/othergov/intel/sead-7.pdf) — verified 2026-11-11
  - [ICPG 704.4 — Reciprocity of Personnel Security Clearance and Access Determinations (April 6, 2022)](https://archive.dni.gov/files/documents/ICPG/ICPG-704-4-Reciprocity-of-Personnel-Security-Clearance-and-Access-Determinations-20220406.pdf) — verified 2026-11-11
  - [32 CFR § 117.10 — Determination of Eligibility for Access to Classified Information for Contractor Employees (Cornell LII)](https://www.law.cornell.edu/cfr/text/32/117.10) — verified 2026-11-11

**Continuous Vetting (Trusted Workforce 2.0)** (`continuous-vetting`, continuous-vetting)
  - [Trusted Workforce 2.0 Quarterly Progress Report, FY2026 Q3 (Performance Accountability Council)](https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf) — verified 2026-11-11
  - [DCSA — Continuous Vetting](https://www.dcsa.mil/Personnel-Vetting/Continuous-Vetting/) — verified 2026-11-11

**Interim (Temporary) Clearance Eligibility** (`interim-clearance`, clearance-process)
  - [32 CFR § 117.10 — Determination of Eligibility for Access to Classified Information for Contractor Employees (Cornell LII)](https://www.law.cornell.edu/cfr/text/32/117.10) — verified 2026-11-11
  - [DCSA — Interim Clearances](https://www.dcsa.mil/mc/pv/fso/interim_clearances) — verified 2026-11-11

**Facility Clearance (FCL) Sponsorship for a New Company** (`fcl-sponsorship`, sponsorship)
  - [DCSA — Facility Clearance Orientation Handbook (August 2026)](https://www.dcsa.mil/Portals/128/Documents/CTP/fc/DCSA%20FCL_Orientation_Handbook_20260828.pdf) — verified 2026-11-11
  - [DCSA — Small Business Guide to the Facility Clearance Process](https://www.dcsa.mil/Portals/91/Documents/about/business/DCSA_SB_Guide_Facility_Clearance_Process_Aug2019.pdf) — verified 2026-11-11
  - [Office of Naval Research — Roadmap to Getting a Facility Clearance/FCL Sponsorship](https://www.onr.navy.mil/media/document/roadmap-getting-facility-clearancefcl-sponsorship) — verified 2026-11-11

**Current DCSA Clearance Timeliness (FY2026 Q3)** (`dcsa-timeliness`, clearance-process)
  - [DCSA Inventory & Timeliness | Industry — NISPPAC Public Meeting Slides, September 2, 2026 (data as of Aug. 17, 2026)](https://www.archives.gov/files/isoo/oversight-groups/nisppac/20260902-nisppac-public-meeting-slides.pdf) — verified 2026-11-11
  - [Trusted Workforce 2.0 Quarterly Progress Report, FY2026 Q3 (Performance Accountability Council)](https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf) — verified 2026-11-11

**Zero-Knowledge Passport Proofs (Self, zkPassport)** (`zkp-credentials`, verification-tech)
  - [Self Protocol — Official Site](https://self.xyz/) — verified 2026-11-11
  - [zkPassport — Documentation](https://docs.zkpassport.id/intro) — verified 2026-11-11

**W3C Verifiable Credentials 2.0 and SD-JWT** (`w3c-vc`, verification-tech)
  - [W3C — Verifiable Credentials Data Model v2.0 (Recommendation)](https://www.w3.org/TR/vc-data-model-2.0/) — verified 2026-11-11
  - [W3C News — The Verifiable Credentials 2.0 Family of Specifications Is Now a W3C Recommendation](https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation/) — verified 2026-11-11
  - [RFC 9901 — Selective Disclosure for JSON Web Tokens (SD-JWT)](https://www.rfc-editor.org/rfc/rfc9901.html) — verified 2026-11-11
  - [IETF — draft-ietf-oauth-sd-jwt-vc-22 (SD-JWT-based Verifiable Digital Credentials)](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/22/) — verified 2026-11-11
  - [W3C Verifiable Credentials Working Group Charter (2026-2028)](https://w3c.github.io/vc-charter-2026/) — verified 2026-11-11

**Mobile Driver's License (mDL) / ISO 18013-5** (`mdl-iso18013`, verification-tech)
  - [ISO/IEC 18013-5:2021 — Personal Identification — ISO-compliant Driving Licence — Part 5: Mobile Driving Licence (mDL) Application](https://www.iso.org/standard/69084.html) — verified 2026-11-11

### Clearance investigation timelines

**Secret clearance investigation**
  - [DCSA Inventory & Timeliness | Industry — NISPPAC Public Meeting Slides, September 2, 2026 (data as of Aug. 17, 2026)](https://www.archives.gov/files/isoo/oversight-groups/nisppac/20260902-nisppac-public-meeting-slides.pdf) — verified 2026-11-11

**Top Secret clearance investigation**
  - [DCSA Inventory & Timeliness | Industry — NISPPAC Public Meeting Slides, September 2, 2026 (data as of Aug. 17, 2026)](https://www.archives.gov/files/isoo/oversight-groups/nisppac/20260902-nisppac-public-meeting-slides.pdf) — verified 2026-11-11

**Modifier: interim**
  - [32 CFR § 117.10 — Determination of Eligibility for Access to Classified Information for Contractor Employees (Cornell LII)](https://www.law.cornell.edu/cfr/text/32/117.10) — verified 2026-11-11

**Modifier: lapsed lt 2y**
  - [SEAD 7 — Reciprocity of Background Investigations and National Security Adjudications (Federation of American Scientists mirror)](https://sgp.fas.org/othergov/intel/sead-7.pdf) — verified 2026-11-11

**Modifier: lapsed gt 2y**
  - [SEAD 7 — Reciprocity of Background Investigations and National Security Adjudications (Federation of American Scientists mirror)](https://sgp.fas.org/othergov/intel/sead-7.pdf) — verified 2026-11-11

**Modifier: no fcl**
  - [DCSA — Facility Clearance Orientation Handbook (August 2026)](https://www.dcsa.mil/Portals/128/Documents/CTP/fc/DCSA%20FCL_Orientation_Handbook_20260828.pdf) — verified 2026-11-11

---

## Hiring compliance & bias law

Backs Hard Constraint #4 (no hire/no-hire scores, no ranking, no demographic inference; "fit" is sourced work-style alignment only). Independently verified in a dedicated just-in-time research pass — full detail, caveats, and a confidence rating per item in [`research/jit/bias-compliance-law.md`](./research/jit/bias-compliance-law.md) (`DECISIONS.md` D-009). **Verified 2026-11-11.**

**Title VII disparate impact doctrine** — still valid, binding federal law; available to private plaintiffs regardless of current EEOC enforcement posture (EEOC's own AI-specific guidance was withdrawn in Jan. 2025).
  - [42 U.S.C. § 2000e-2(k) (Cornell LII)](https://www.law.cornell.edu/uscode/text/42/2000e-2) — verified 2026-11-11
  - [E.O. 14281, Federal Register (Apr. 23, 2025)](https://www.govinfo.gov/content/pkg/FR-2025-04-28/html/2025-07378.htm) — verified 2026-11-11

**NYC Local Law 144** — in force, unchanged since Jan. 2023; bias audit + 10-business-day candidate notice required for automated employment decision tools. Lowest-risk citation of the six.
  - [NYC DCWP — Automated Employment Decision Tools](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page) — verified 2026-11-11

**Illinois AI hiring-notice law** — Public Act 103-0804, effective Jan. 1, 2026. *Caveat: corroborated by multiple consistent secondary sources; a direct ilga.gov read is still an open follow-up (fetch errors this pass).*
  - [Illinois Public Act 103-0804](https://www.ilga.gov/Legislation/PublicActs/View/103-0804) — verified 2026-11-11 (secondary-corroborated)

**Colorado AI Act** — the original SB 24-205 was repealed before taking effect; replaced by SB 26-189 (effective Jan. 1, 2027). *The least durable of the six citations — re-verify close to any ship date.*
  - [Colorado General Assembly — SB 26-189](https://leg.colorado.gov/bills/SB26-189) — verified 2026-11-11

**EU AI Act** — Annex III classifies hiring/employment AI as high-risk (unchanged); compliance deadline delayed to Dec. 2, 2027.
  - [EU AI Act Service Desk — Annex III](https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3) — verified 2026-11-11
  - [European Commission — AI Act Regulatory Framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) — verified 2026-11-11

***Mobley v. Workday*** — active, unsettled litigation (N.D. Cal. No. 3:23-cv-00770-RFL); disparate-impact and FEHA claims proceeding, nationwide ADEA collective certified.
  - [Court docket (PacerMonitor mirror)](https://www.pacermonitor.com/public/case/47898981/Mobley_v_WORKDAY,_INC) — verified 2026-11-11
  - [Civil Rights Litigation Clearinghouse case tracker](https://clearinghouse.net/case/44074/) — verified 2026-11-11

---

## Assessment science

Backs `build_trial_assessment`, `run_job_preview`, and `generate_interview_guide`. Full design-guidance translation in [`research/R5-assessment-science.md`](./research/R5-assessment-science.md).

- [Sackett, Zhang, Berry & Lievens (2022) — revisited meta-analytic validity estimates, *J. Applied Psychology*](https://gwern.net/doc/statistics/meta-analysis/2021-sackett.pdf) — full text read
- [Earnest, Allen & Landis (2011) — RJP mechanisms meta-analysis, *Personnel Psychology*](https://stevenmbrownportfolio.weebly.com/uploads/1/7/4/6/17469871/earnest_et_al._2011_rjp.pdf) — full text read
- [Premack & Wanous (1985) — original RJP meta-analysis](https://www.researchgate.net/publication/232556638_A_Meta-Analysis_of_Realistic_Job_Preview_Experiments) — effect sizes relayed via Earnest et al. (2011)'s direct citation, not read as full primary text
- [Campion, Palmer & Campion (1997) — structure in the selection interview, *Personnel Psychology*](https://core.ac.uk/download/234763785.pdf)
- [Callinan & Robertson (2000) — work sample testing design principles](https://psychology.iresearchnet.com/industrial-organizational-psychology/individual-differences/work-samples/)
- [Schmidt & Hunter (1998) — the validity and utility of selection methods in personnel psychology](https://stafforini.com/works/schmidt-1998-validity-and-utility/) — structured interviews .51 vs. unstructured .38; confirmed across multiple independent sources (backs `generate_interview_guide`)

---

## Platform & engineering sources

Not statistics, but attribution for where data and design patterns come from:

- [a16z speedrun Talent Network](https://speedrun-talent-network.com) — the public API `search_defense_roles` and `get_company_profile` query
- [GitHub public REST API](https://docs.github.com/en/rest) — `verify_evidence`'s data source
- Full UI/UX reference-pattern citations (Linear, Vercel/Geist, Stripe, Radix, Anduril, and 9 others): [`research/R2-design-system.md`](./research/R2-design-system.md) §1 and its Sources section
- Full leverage/library-choice citations (MCP SDK versions, PII-detection design precedent, testing toolchain): [`research/R1-leverage.md`](./research/R1-leverage.md)

---

_For the raw research behind every section above — including synthetic personas and real verbatim quotes, each clearly labeled — see [`research/`](./research/)._
