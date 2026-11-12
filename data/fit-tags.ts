/**
 * Closed vocabulary of work-STYLE/REALITY tags for fit_debrief. Deliberately
 * excludes anything demographic, personality-typed, or "culture vibes" (spec
 * hard constraint #4) — every tag names an observable job reality, several
 * mirroring run_job_preview's six scenes so the two tools compose naturally.
 */
export const FIT_TAGS = [
  "fast_ambiguous_pace",
  "ethics_reflection_comfort",
  "itar_process_rigor",
  "clearance_wait_patience",
  "scif_lifestyle",
  "onsite_culture",
  "mission_driven_focus",
  "hands_on_hardware",
  "high_autonomy",
  "structured_process",
  "travel_reporting_overhead",
  "long_investigation_timeline",
] as const;

export type FitTag = (typeof FIT_TAGS)[number];

export const FIT_TAG_LABELS: Record<FitTag, string> = {
  fast_ambiguous_pace: "Fast pace with real ambiguity",
  ethics_reflection_comfort: "Sitting with weapons-adjacent ethics tradeoffs",
  itar_process_rigor: "ITAR/export-control process rigor",
  clearance_wait_patience: "Waiting out a clearance investigation",
  scif_lifestyle: "SCIF life (no phone, controlled space)",
  onsite_culture: "Onsite-first culture",
  mission_driven_focus: "Mission-driven focus over general tech work",
  hands_on_hardware: "Hands-on hardware, not just software",
  high_autonomy: "High autonomy / self-direction",
  structured_process: "Structured process over move-fast chaos",
  travel_reporting_overhead: "Foreign-travel reporting overhead",
  long_investigation_timeline: "A long clearance investigation timeline",
};

export const FIT_TAG_QUESTIONS: Record<FitTag, string> = {
  fast_ambiguous_pace: "How is priority actually decided day-to-day when it's not obvious — who do I ask, and how fast do I usually get an answer?",
  ethics_reflection_comfort: "Has the team had an explicit conversation about the ethics of what we're building, and how often does that come up?",
  itar_process_rigor: "What does the day-to-day ITAR/export-control process actually look like for someone in this specific role?",
  clearance_wait_patience: "What does someone on the team typically do during the clearance wait — is there real unclassified work lined up?",
  scif_lifestyle: "How much of the week is actually spent in a SCIF for this role, versus a normal desk?",
  onsite_culture: "Is onsite expectation firm for this role, or is there any flexibility in practice?",
  mission_driven_focus: "What does the team point to as the clearest recent example of the mission mattering in day-to-day work?",
  hands_on_hardware: "How much of this specific role is hands-on-hardware versus software-only, in practice?",
  high_autonomy: "How much autonomy does someone at my level actually have on technical decisions here?",
  structured_process: "How much process/review is there before something ships, for a role like this?",
  travel_reporting_overhead: "How often does foreign-travel reporting actually come up for someone in this role?",
  long_investigation_timeline: "What's this employer's actual recent experience with clearance timelines, not just the official estimate?",
};
