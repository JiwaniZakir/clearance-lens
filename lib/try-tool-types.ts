/**
 * Hand-mirrored TypeScript shapes for the /try playground's tool calls.
 *
 * These intentionally duplicate (rather than import) the zod schemas in
 * lib/tools/*.ts: those modules pull in server-only clients and are not meant
 * to be imported from client components, and their internal `InputSchema`/
 * `OutputSchema` consts aren't exported anyway. Each shape below was copied
 * field-for-field from the corresponding tool file's zod schema — see the
 * header comment in app/try/page.tsx for which file backs which type.
 */

export interface SourceRef {
  title: string;
  url: string;
  lastVerified?: string;
}

export type ToolErrorCode =
  | "pii_cui_rejected"
  | "invalid_input"
  | "upstream_error"
  | "not_found"
  | "internal_error"
  | "network_error"
  | "parse_error";

export interface ToolErrorShape {
  code: ToolErrorCode;
  message: string;
}

/* ---------------------------------------------------------------------- */
/* search_defense_roles (lib/tools/search-defense-roles.ts)               */
/* ---------------------------------------------------------------------- */

export type RequirementBasis = "stated" | "inferred";

export interface RequirementSignal {
  kind: string;
  value: string;
  basis: RequirementBasis;
  evidence: string;
}

export interface RoleResult {
  id: string;
  title: string;
  company: string;
  companySlug: string | null;
  url: string;
  location: string | null;
  remote: boolean;
  workplaceType: string | null;
  compMin: number | null;
  compMax: number | null;
  compCurrency: string | null;
  publishedAt: string;
  requirementSignals: RequirementSignal[];
}

export type ClearanceFilter = "none" | "secret" | "ts" | "ts_sci";

export interface SearchDefenseRolesInput {
  query?: string;
  clearance?: ClearanceFilter;
  itar_only?: boolean;
  location?: string;
  remote?: boolean;
  limit?: number;
}

export interface SearchDefenseRolesOutput {
  roles: RoleResult[];
  rolesScanned: number;
  note: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* estimate_timeline (lib/tools/estimate-timeline.ts)                     */
/* ---------------------------------------------------------------------- */

export type TargetLevel = "secret" | "ts" | "ts_sci";
export type CurrentStatus = "none" | "interim" | "active" | "lapsed_lt_2y" | "lapsed_gt_2y";
export type EmployerFclStatus = "yes" | "no" | "unknown";

export interface EstimateTimelineInput {
  target_level: TargetLevel;
  current_status: CurrentStatus;
  employer_has_fcl: EmployerFclStatus;
}

export interface EstimateTimelineOutput {
  estimate: { minDays: number | null; maxDays: number | null; medianDays: number | null };
  employerFclWaitDays: { minDays: number; maxDays: number } | null;
  keyDrivers: { label: string; detail: string }[];
  uncertaintyNote: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* build_trial_assessment (lib/tools/build-trial-assessment.ts)           */
/* ---------------------------------------------------------------------- */

export type TrialMinutes = 60 | 90 | 180;

export interface TrialAssessmentInput {
  role_id: string;
  minutes: TrialMinutes;
}

export interface TrialAssessmentBands {
  exceptional: string;
  proficient: string;
  developing: string;
  notDemonstrated: string;
}

export interface TrialAssessmentCriterion {
  criterion: string;
  tracedToQuote: string;
  bands: TrialAssessmentBands;
}

export interface TrialAssessmentOutput {
  roleTitle: string;
  company: string;
  minutes: number;
  taskShape: string;
  brief: string;
  deliverableRequirement: string;
  outOfScope: string[];
  rubric: TrialAssessmentCriterion[];
  rubricRefinementNote: string;
  itarSafetyNote: string;
  limitsNote: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* run_job_preview (lib/tools/run-job-preview.ts)                         */
/* ---------------------------------------------------------------------- */

export type JobPreviewMinutes = 20 | 30;

export interface JobPreviewInput {
  role_id: string;
  minutes: JobPreviewMinutes;
}

export interface JobPreviewSceneChoice {
  id: string;
  label: string;
}

export interface JobPreviewScene {
  id: string;
  title: string;
  setup: string;
  choices: JobPreviewSceneChoice[];
  whatRealTeamsReportByChoice: Record<string, string>;
  requiresStatedRationale: boolean;
  debriefPrompts: string[];
}

export interface JobPreviewOutput {
  roleTitle: string;
  company: string;
  minutes: number;
  instructionsForAgent: string;
  scenes: JobPreviewScene[];
  aggregateDebriefPrompt: string;
  polygraphNote: string;
  itarSafetyNote: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* fit_debrief (lib/tools/fit-debrief.ts)                                 */
/* ---------------------------------------------------------------------- */

export interface FitDebriefInput {
  role_id: string;
  loved: string[];
  disliked: string[];
}

export interface FitDebriefOutput {
  roleTitle: string;
  company: string;
  summaryTemplate: string;
  questionsToAskTheCompany: string[];
  shareDraft: { markdown: string; note: string };
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* explain_rule (lib/tools/explain-rule.ts)                               */
/* ---------------------------------------------------------------------- */

export interface ExplainRuleInput {
  topic: string;
}

export interface ExplainRuleTopic {
  id: string;
  title: string;
  category: string;
  summary: string;
  keyPoints: string[];
}

export interface ExplainRuleAvailableTopic {
  id: string;
  title: string;
  category: string;
}

export interface ExplainRuleOutput {
  found: boolean;
  topic?: ExplainRuleTopic;
  availableTopics?: ExplainRuleAvailableTopic[];
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* get_company_profile (lib/tools/get-company-profile.ts)                */
/* ---------------------------------------------------------------------- */

export interface CompanyProfileInput {
  company_slug: string;
}

export interface CompanyProfileCriterion {
  criterion: string;
  sourceUrl: string;
  jobRelevanceReason: string;
}

export interface CompanyProfileOutput {
  company: {
    slug: string;
    name: string;
    url: string;
    blurb: string | null;
    industries: string[];
    stage: string | null;
    size: string | null;
    businessModel: string | null;
  };
  criteria: CompanyProfileCriterion[];
  workRealities: {
    sampleSize: number;
    isFullRoster: boolean;
    workplaceMix: Record<string, number>;
    topLocations: { location: string; count: number }[];
    uniqueLocationCount: number;
    compRangeObserved: { min: number | null; max: number | null; currency: string | null } | null;
  };
  gaps: string[];
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* get_role_rubric (lib/tools/get-role-rubric.ts)                        */
/* ---------------------------------------------------------------------- */

export interface RoleRubricInput {
  role_id: string;
}

export interface RoleRubricChecklistItem {
  question: string;
  whyItMatters: string;
  basis: RequirementBasis;
}

export interface RoleRubricSkillItem {
  skill: string;
  evidenceFromPosting: string;
}

export interface RoleRubricOutput {
  roleTitle: string;
  company: string;
  eligibilityChecklist: RoleRubricChecklistItem[];
  skillsRubric: RoleRubricSkillItem[];
  questionsForAgent: string[];
  evaluate_locally: true;
  instructionsForAgent: string;
  sources: SourceRef[];
  disclaimer: string;
}

/** A role selected via the shared in-page role picker — just enough to
 * label a choice and drive the next tool call; re-fetched in full by
 * whichever tool needs more (build_trial_assessment, run_job_preview, etc). */
export interface PickedRole {
  id: string;
  title: string;
  company: string;
}

/* ---------------------------------------------------------------------- */
/* readiness_brief (lib/tools/readiness-brief.ts)                         */
/* ---------------------------------------------------------------------- */

export interface ReadinessBriefInput {
  role_id: string;
}

export interface ReadinessBriefOutput {
  roleTitle: string;
  company: string;
  template: {
    eligibility: { prompt: string; agentFillsThisIn: true };
    gaps: { prompt: string; agentFillsThisIn: true };
    twoWeekPrepPlan: { prompt: string; suggestedFocusAreas: string[]; agentFillsThisIn: true };
  };
  questionsToAskTheRecruiter: string[];
  evaluate_locally: true;
  instructionsForAgent: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* verify_evidence (lib/tools/verify-evidence.ts)                        */
/* ---------------------------------------------------------------------- */

export interface VerifyEvidenceInput {
  github_username_or_url: string;
}

export interface VerifyEvidenceOutput {
  platform: "github" | "gitlab" | "cosign";
  profile: {
    login: string;
    name: string | null;
    profileUrl: string;
    bio: string | null;
    publicRepoCount: number;
    // Nullable since D-032: GitLab's and Cosign's public APIs don't expose
    // these at all (see lib/tools/verify-evidence.ts).
    followers: number | null;
    accountCreatedAt: string | null;
  };
  topLanguages: { language: string; repoCount: number }[];
  recentActivity: { repo: string; url: string; pushedAt: string; description: string | null }[];
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* prepare_consented_card (lib/tools/prepare-consented-card.ts)          */
/* ---------------------------------------------------------------------- */

export interface ConsentedFields {
  headline?: string;
  clearance_status_self_reported?: string;
  citizenship_status_self_reported?: string;
  highlights?: string[];
  github_username?: string;
  availability?: string;
  notes?: string;
}

export interface PrepareConsentedCardInput {
  role_id: string;
  fields_user_approved: ConsentedFields;
}

export interface PrepareConsentedCardOutput {
  roleTitle: string;
  company: string;
  card: { markdown: string; json: Record<string, unknown> };
  notVerifiedNote: string;
  applyLink: { url: string; label: string } | null;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* prepare_signed_attestation (lib/tools/prepare-signed-attestation.ts)  */
/* ---------------------------------------------------------------------- */

export type AttestationClearanceLevel = "none" | "interim" | "secret" | "ts" | "ts_sci";
export type AttestationCitizenshipStatus = "us_citizen" | "green_card" | "other_protected_individual" | "not_us_person";

export interface AttestationClaims {
  clearance_level?: AttestationClearanceLevel;
  citizenship_status?: AttestationCitizenshipStatus;
  available_from?: string;
}

export interface PrepareSignedAttestationInput {
  claims: AttestationClaims;
  issued_at: string;
  signed_payload: string;
  signature_base64: string;
  public_key_base64: string;
}

export interface PrepareSignedAttestationOutput {
  credential: {
    context: string[];
    type: string[];
    issuer: string;
    issuanceDate: string;
    credentialSubject: Record<string, unknown>;
    proof: { type: string; verificationMethod: string; signatureValue: string };
  };
  shareableMarkdown: string;
  whatThisProves: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* contribute_anonymous_signal (lib/tools/contribute-anonymous-signal.ts) */
/* ---------------------------------------------------------------------- */

export type SignalExperienceBucket = "0-2" | "3-5" | "6-10" | "10+";

export interface SignalContributionFields {
  clearance_level?: AttestationClearanceLevel;
  citizenship_status?: AttestationCitizenshipStatus;
  years_experience_bucket?: SignalExperienceBucket;
}

export interface ContributeAnonymousSignalInput {
  role_id: string;
  contribution: SignalContributionFields;
}

export interface ContributeAnonymousSignalOutput {
  recorded: boolean;
  roleTitle: string;
  company: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* get_aggregated_signal (lib/tools/get-aggregated-signal.ts)            */
/* ---------------------------------------------------------------------- */

export interface GetAggregatedSignalInput {
  role_id?: string;
  company_slug?: string;
}

export interface GetAggregatedSignalOutput {
  scope: { type: "role" | "company"; label: string };
  totalContributions: number;
  meetsFloor: boolean;
  percentages: {
    clearanceLevel: Record<string, number> | null;
    citizenshipStatus: Record<string, number> | null;
    yearsExperience: Record<string, number> | null;
  } | null;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* generate_interview_guide (lib/tools/generate-interview-guide.ts)       */
/* ---------------------------------------------------------------------- */

export type InterviewMinutes = 30 | 45 | 60;

export interface GenerateInterviewGuideInput {
  role_id: string;
  minutes: InterviewMinutes;
}

export interface InterviewQuestion {
  question: string;
  tracedToQuote: string;
  evaluationGuidance: {
    strongAnswerLooksLike: string;
    weakAnswerLooksLike: string;
    followUpProbe: string;
  };
}

export interface GenerateInterviewGuideOutput {
  roleTitle: string;
  company: string;
  minutes: number;
  questions: InterviewQuestion[];
  guardrailsForThePanel: string[];
  itarSafetyNote: string;
  limitsNote: string;
  neverAScoreNote: string;
  sources: SourceRef[];
  disclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* verify_signed_attestation (lib/tools/verify-signed-attestation.ts)     */
/* ---------------------------------------------------------------------- */

export interface VerifySignedAttestationInput {
  signed_payload: string;
  signature_base64: string;
  public_key_base64: string;
}

export interface VerifySignedAttestationOutput {
  signatureValid: boolean;
  claims: { clearance_level?: string; citizenship_status?: string; available_from?: string } | null;
  issuedAt: string | null;
  keyFingerprint: string;
  whatThisProves: string;
  whatThisDoesNotProve: string;
  sources: SourceRef[];
  disclaimer: string;
}
