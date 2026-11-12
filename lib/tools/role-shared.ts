import { getJob } from "@/lib/speedrun/client";
import { extractRequirementSignals, type RequirementSignal } from "@/lib/speedrun/infer";
import type { SpeedrunJobLabels } from "@/lib/speedrun/types";
import type { SourceRef } from "@/lib/tools/wrap";

/** Every role/company-derived tool cites the platform data came from — not a
 * statistic, just provenance, but included in `sources[]` for consistency. */
export const SPEEDRUN_SOURCE: SourceRef = {
  title: "a16z speedrun Talent Network",
  url: "https://speedrun-talent-network.com",
};

export interface ResolvedRole {
  id: string;
  title: string;
  company: string;
  companySlug: string;
  url: string;
  location: string | null;
  remote: boolean;
  workplaceType: string | null;
  compMin: number | null;
  compMax: number | null;
  compCurrency: string | null;
  publishedAt: string;
  descriptionText: string;
  labels: SpeedrunJobLabels;
  signals: RequirementSignal[];
}

/** Fetches a role by id and extracts its requirement signals in one place, so
 * every tool that needs "a role plus what it says/implies about eligibility"
 * (get_role_rubric, readiness_brief, build_trial_assessment, run_job_preview,
 * fit_debrief) shares one implementation rather than six near-duplicates.
 * Throws SpeedrunApiError on failure — callers let it propagate to callTool,
 * which already maps a 404 to a friendly not_found result. */
export async function resolveRole(roleId: string): Promise<ResolvedRole> {
  const { job } = await getJob(roleId);
  // Every role surfaced by search_defense_roles comes from an industry=defense_space
  // query, so this context is always true for a role reached through this product.
  const signals = extractRequirementSignals(job.description_text, { industry: "defense_space" });
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    companySlug: job.company_slug,
    url: job.url,
    location: job.location,
    remote: job.remote,
    workplaceType: job.workplace_type ?? null,
    compMin: job.comp_min,
    compMax: job.comp_max,
    compCurrency: job.comp_currency,
    publishedAt: job.published_at,
    descriptionText: job.description_text,
    labels: job.labels,
    signals,
  };
}

export type ClearanceFilter = "none" | "secret" | "ts" | "ts_sci";

/** A role "matches" a clearance filter when its detected level signal (stated
 * or inferred) is that exact level, or — for "secret" — an unspecified "a
 * clearance is required" signal (reads as "at least Secret" in practice).
 * "none" matches roles where no clearance_level signal was detected at all. */
export function matchesClearanceFilter(signals: RequirementSignal[], clearance: ClearanceFilter): boolean {
  const levels = signals.filter((s) => s.kind === "clearance_level").map((s) => s.value);
  if (clearance === "none") return levels.length === 0;
  if (levels.includes(clearance)) return true;
  if (clearance === "secret" && levels.includes("clearance_required_unspecified")) return true;
  return false;
}

export function looksItarRestricted(signals: RequirementSignal[]): boolean {
  return signals.some(
    (s) =>
      s.kind === "citizenship" &&
      (s.value === "us_person_required" || s.value === "us_citizen_required" || s.value === "us_person_likely"),
  );
}
