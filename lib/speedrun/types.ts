/**
 * Types for the a16z speedrun Talent Network public API.
 * Base URL: https://speedrun-talent-network.com/api/v1 — no auth, open CORS,
 * edge-cached 1-5 min server-side. Verified directly against live responses
 * (not guessed) — see DECISIONS.md and research/R1-leverage.md for the
 * verification trail. OpenAPI spec: GET /api/v1/openapi.json (title
 * "speedrun talent network API", confirmed reachable).
 *
 * Fields are intentionally loose (nullable / string rather than strict enum)
 * where live data showed `null` or where the full enum isn't confirmed —
 * safer against upstream drift than a guessed closed enum.
 */

export interface SpeedrunSource {
  title: string;
  url: string;
}

export interface SpeedrunJobSummary {
  id: string;
  title: string;
  company: string;
  company_slug: string;
  company_url: string;
  url: string;
  location: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  function: string | null;
  seniority: string | null;
  remote: boolean;
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  comp_period: string | null;
  published_at: string;
  stealth: boolean;
  cohort: string | null;
  tier: string;
}

export interface SpeedrunJobLabels {
  function?: string | null;
  specialty?: string | null;
  seniority?: string | null;
  min_experience?: string | null;
  workplace?: string | null;
  engagement?: string | null;
  founding_role?: boolean | null;
  ai_native_role?: boolean | null;
}

export interface SpeedrunJobApply {
  kind: string; // observed: "external"; treated as an open string, not a closed enum
  url: string;
}

export interface SpeedrunJobDetail extends Omit<SpeedrunJobSummary, "function"> {
  status: string;
  function: string | null;
  comp_summary?: string | null;
  apply: SpeedrunJobApply | null;
  description_text: string;
  labels: SpeedrunJobLabels;
}

export interface SpeedrunFacetValue {
  v: string;
  n: number;
}

export interface SpeedrunJobSearchResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_more: boolean;
  next_page: number | null;
  jobs: SpeedrunJobSummary[];
  facets?: Record<string, unknown>;
  scope?: string;
  source?: string;
}

export interface SpeedrunJobDetailResponse {
  job: SpeedrunJobDetail;
  source?: string;
}

export interface SpeedrunCompanyJobSummary {
  id: string;
  title: string;
  url: string;
  location: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  comp_summary?: string | null;
  comp_min: number | null;
  comp_max: number | null;
  comp_period: string | null;
  published_at: string;
}

export interface SpeedrunCompanyLabels {
  stage?: string | null;
  size?: string | null;
  business_model?: string | null;
  industry?: string | null;
  frontier_lab?: boolean | null;
  big_tech?: boolean | null;
  ai_native?: boolean | null;
  hardware?: boolean | null;
}

export interface SpeedrunCompany {
  slug: string;
  name: string;
  url: string;
  tier: string;
  cohort: string | null;
  open_roles: number;
  location: string | null;
  industries: string[];
  blurb: string | null;
  logo: string | null;
  labels: SpeedrunCompanyLabels;
  jobs: SpeedrunCompanyJobSummary[];
}

export interface SpeedrunCompanyResponse {
  company: SpeedrunCompany;
  source?: string;
}

export interface SpeedrunApiErrorBody {
  error: { code: string; message: string };
}

/** Search params this app exposes through search_defense_roles. A subset of the
 * full upstream filter list (q, industry, loc, remote, page, scope) — the ones
 * actually useful for this product's defense/clearance framing. */
export interface SpeedrunJobSearchParams {
  q?: string;
  industry?: string;
  loc?: string;
  remote?: boolean;
  page?: number;
  scope?: "speedrun" | "portfolio" | "everywhere";
}
