/**
 * Canonical disclaimer strings, reused verbatim across tools (spec §1, hard
 * constraints #2, #3, #4, #5) so wording never drifts tool-to-tool and tests
 * can assert on exact required phrases rather than guessing at prose.
 */

export const DISCLAIMERS = {
  notLegalAdvice:
    "This is general information, not legal advice. Clearance, ITAR, and export-control rules have real exceptions — verify your specific situation with your Facility Security Officer (FSO) or an attorney before acting on it.",

  evaluateLocally:
    "This checklist is for your own agent to evaluate privately against what it already knows about you. Do not send your personal answers back to this server — nothing here needs them.",

  notAScore:
    "This is not a score, a ranking, or a hire/no-hire recommendation. Each criterion is reported as aligned, mixed, or unclear, with the evidence you chose to share and a note on what's uncertain.",

  itarSafeTrial:
    "This exercise is built only from the public job posting and public company material. It never includes or requests export-controlled technical data, drawings, or specifications. If anything about a real assignment feels like it crosses that line, stop and ask your FSO before continuing.",

  neverVerifiesClearance:
    "Clearance Lens cannot verify clearance status and never will — DISS/NBIS lookups are restricted to Facility Security Officers by design. The correct verification path is the employer's FSO at the offer stage, not a screenshot or a self-report.",

  noDemographicInference:
    "This tool never infers or asks about protected characteristics (e.g. age, race, sex, national origin, disability, veteran status beyond what's job-relevant). \"Fit\" reflects only criteria the company has published, each with a source link and a stated job-relevance reason.",

  statedVsInferred:
    "Requirements marked \"stated\" are quoted directly from the public posting. Requirements marked \"inferred\" are a pattern-based judgment call, not a fact — confirm directly with the employer before relying on them.",

  neverSubmitsOnUserBehalf:
    "Clearance Lens never submits an application or expresses interest on your behalf. Links to the employer's or network's own apply flow are provided so you can decide and act yourself.",

  exampleDataLabel:
    "Example data for illustration only — not a real role, person, or statistic.",
} as const;

export type DisclaimerKey = keyof typeof DISCLAIMERS;
