import { z } from "zod";
import { searchJobs } from "@/lib/speedrun/client";
import { extractRequirementSignals } from "@/lib/speedrun/infer";
import type { SpeedrunJobSummary } from "@/lib/speedrun/types";
import { SPEEDRUN_SOURCE, matchesClearanceFilter, looksItarRestricted } from "@/lib/tools/role-shared";
import { getJob } from "@/lib/speedrun/client";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({
  query: z.string().max(200).optional().describe("Free-text search, e.g. \"autonomy\" or \"software engineer\"."),
  clearance: z
    .enum(["none", "secret", "ts", "ts_sci"])
    .optional()
    .describe("Filter to roles whose detected clearance signal matches this level. \"none\" = no clearance signal detected."),
  itar_only: z.boolean().optional().describe("Only roles that appear to require US-person/citizenship status."),
  location: z.string().max(100).optional(),
  remote: z.boolean().optional(),
  limit: z.number().int().min(1).max(25).optional().default(10),
});

const RequirementSignalSchema = z.object({
  kind: z.string(),
  value: z.string(),
  basis: z.enum(["stated", "inferred"]),
  evidence: z.string(),
});

const RoleResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  companySlug: z.string().nullable(), // null for a stealth posting — no public company page to slug
  url: z.string(),
  location: z.string().nullable(),
  remote: z.boolean(),
  workplaceType: z.string().nullable(),
  compMin: z.number().nullable(),
  compMax: z.number().nullable(),
  compCurrency: z.string().nullable(),
  publishedAt: z.string(),
  requirementSignals: z.array(RequirementSignalSchema),
});

const OutputSchema = z.object({
  roles: z.array(RoleResultSchema),
  rolesScanned: z.number(),
  note: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

const MAX_PAGES_SCANNED = 4; // 4 * 50 = up to 200 postings — handles upstream pagination robustly
const MAX_DETAIL_FETCHES = 25; // bounds latency: at most this many parallel per-job detail calls

async function fetchCandidateSummaries(query: string | undefined, location: string | undefined) {
  const all: SpeedrunJobSummary[] = [];
  let page = 0;
  for (let i = 0; i < MAX_PAGES_SCANNED; i++) {
    const res = await searchJobs({ q: query, industry: "defense_space", loc: location, page, scope: "portfolio" });
    all.push(...res.jobs);
    if (!res.has_more || res.next_page == null) break;
    page = res.next_page;
  }
  return all;
}

export const searchDefenseRolesTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "search_defense_roles",
  title: "Search defense-tech roles",
  description:
    "Searches live defense/hard-tech roles from the a16z speedrun Talent Network's public API. Each result includes requirement signals labeled 'stated' (a verbatim quote from the posting) or 'inferred' (a pattern-based judgment call to confirm with the employer) — never a guess presented as fact.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ query, clearance, itar_only, location, remote, limit }) => {
    let candidates = await fetchCandidateSummaries(query, location);

    if (remote === true) candidates = candidates.filter((c) => c.remote);
    else if (remote === false) candidates = candidates.filter((c) => !c.remote);

    const rolesScanned = candidates.length;
    const toDetail = candidates.slice(0, MAX_DETAIL_FETCHES);

    const detailed = await Promise.allSettled(
      toDetail.map(async (summary) => {
        const { job } = await getJob(summary.id);
        const signals = extractRequirementSignals(job.description_text, {
          industry: "defense_space",
          location: job.location,
        });
        return { summary, signals };
      }),
    );

    let results = detailed
      .filter((r): r is PromiseFulfilledResult<{ summary: SpeedrunJobSummary; signals: ReturnType<typeof extractRequirementSignals> }> => r.status === "fulfilled")
      .map((r) => r.value);

    if (clearance) results = results.filter((r) => matchesClearanceFilter(r.signals, clearance));
    if (itar_only) results = results.filter((r) => looksItarRestricted(r.signals));

    const page = results.slice(0, limit);

    const notes: string[] = [`Scanned ${rolesScanned} posting${rolesScanned === 1 ? "" : "s"} matching your search terms.`];
    if (clearance || itar_only) {
      notes.push(
        `Checked requirement signals on the first ${toDetail.length} of those; narrower or broader search terms may surface more matches than this single call checked.`,
      );
    }
    // Found live via the spec §5 agent-in-the-loop eval (DECISIONS.md D-016):
    // a specific company's own public name (e.g. "Shield AI", "Castelion")
    // routinely returns zero hits even when that company is real and does
    // post roles elsewhere on the board — the underlying search appears to
    // match only a narrow set of indexed fields, not the full description
    // body. With no guidance, a zero-result reads as "that company/role
    // doesn't exist" rather than "this specific query didn't match." Say so
    // explicitly rather than let an empty list speak for itself.
    //
    // Found live via the spec §6 judging panel (DECISIONS.md): when BOTH
    // query and location are set, a zero result's real cause could be
    // either one (confirmed live: a state name like "Texas" zeroes
    // location matching while the exact same query alone returns plenty)
    // — confidently blaming query alone, as the original fix did, is
    // actively misleading when location was the actual cause. Name
    // whichever filter(s) are actually active rather than guessing which
    // one is at fault.
    if (rolesScanned === 0 && (query || location)) {
      const activeFilters = [
        query ? `the keyword "${query}"` : null,
        location ? `the location filter "${location}"` : null,
      ].filter((f): f is string => f !== null);
      const filterList = activeFilters.join(" and ");
      const suggestion =
        query && location
          ? `Try removing one filter at a time to isolate which is causing the mismatch — a company name alone often won't match on keyword, and a state/region name (vs. an exact city) often won't match on location.`
          : location
            ? `Location matching looks for an exact city string (e.g. "Austin, TX"), not a state or region name — try the specific city, or drop the location filter to browse all locations.`
            : `A company name alone often won't match — try a role type instead (e.g. "autonomy engineer" or "manufacturing engineer"), drop the query to browse everything in this industry, or check get_company_profile for that company directly. A real company can still have zero live postings right now even when it's actively hiring elsewhere.`;
      notes.push(`No postings matched ${filterList} at all. ${suggestion}`);
    } else if (page.length === 0 && rolesScanned > 0) {
      notes.push(`${rolesScanned} postings matched the search terms, but none passed the clearance/itar_only filter — try loosening or removing it.`);
    }

    return {
      roles: page.map(({ summary, signals }) => ({
        id: summary.id,
        title: summary.title,
        company: summary.company,
        companySlug: summary.company_slug,
        url: summary.url,
        location: summary.location,
        remote: summary.remote,
        workplaceType: summary.workplace_type ?? null,
        compMin: summary.comp_min,
        compMax: summary.comp_max,
        compCurrency: summary.comp_currency,
        publishedAt: summary.published_at,
        requirementSignals: signals,
      })),
      rolesScanned,
      note: notes.join(" "),
      sources: [SPEEDRUN_SOURCE],
      disclaimer: DISCLAIMERS.statedVsInferred,
    };
  },
};
