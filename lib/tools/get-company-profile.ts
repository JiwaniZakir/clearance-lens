import { z } from "zod";
import { getCompany } from "@/lib/speedrun/client";
import { getCuratedCriteria } from "@/lib/companies-data";
import { SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({
  company_slug: z.string().min(1).max(100).describe("The company's speedrun-talent-network.com slug, e.g. \"anduril-industries\"."),
});

const OutputSchema = z.object({
  company: z.object({
    slug: z.string(),
    name: z.string(),
    url: z.string(),
    blurb: z.string().nullable(),
    industries: z.array(z.string()),
    stage: z.string().nullable(),
    size: z.string().nullable(),
    businessModel: z.string().nullable(),
  }),
  criteria: z.array(
    z.object({ criterion: z.string(), sourceUrl: z.string(), jobRelevanceReason: z.string() }),
  ),
  workRealities: z.object({
    sampleSize: z.number(),
    isFullRoster: z.boolean(),
    workplaceMix: z.record(z.string(), z.number()),
    topLocations: z.array(z.object({ location: z.string(), count: z.number() })),
    uniqueLocationCount: z.number(),
    compRangeObserved: z
      .object({ min: z.number().nullable(), max: z.number().nullable(), currency: z.string().nullable() })
      .nullable(),
  }),
  gaps: z.array(z.string()),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const getCompanyProfileTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "get_company_profile",
  title: "Get company profile",
  description:
    "Published facts about a company plus computed work realities from its currently-open roles. Returns a 'fit' read ONLY when a criterion has a real source link to the company's own published material and a stated job-relevance reason — otherwise returns gaps and no fit claim at all, by design.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ company_slug }) => {
    const { company } = await getCompany(company_slug);
    const criteria = getCuratedCriteria(company_slug);

    const sample = company.jobs;
    const workplaceMix: Record<string, number> = {};
    const locationCounts = new Map<string, number>();
    for (const job of sample) {
      const key = (job.workplace_type ?? "unspecified").toLowerCase();
      workplaceMix[key] = (workplaceMix[key] ?? 0) + 1;
      if (job.location) locationCounts.set(job.location, (locationCounts.get(job.location) ?? 0) + 1);
    }
    const topLocations = [...locationCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([location, count]) => ({ location, count }));
    // Whether `jobs` is the company's complete open-role list or a capped
    // sample isn't documented by the upstream API — compare against its own
    // open_roles count rather than asserting either way.
    const isFullRoster = sample.length === company.open_roles;
    const compValues = sample.filter((j) => j.comp_min != null || j.comp_max != null);
    const compRangeObserved =
      compValues.length > 0
        ? {
            min: Math.min(...compValues.map((j) => j.comp_min ?? j.comp_max ?? Infinity)),
            max: Math.max(...compValues.map((j) => j.comp_max ?? j.comp_min ?? -Infinity)),
            currency: null,
          }
        : null;

    const gaps: string[] = [];
    if (criteria.length === 0) {
      gaps.push(
        "Clearance Lens has not independently sourced published hiring criteria for this company. Treat any \"culture fit\" claims you see elsewhere with skepticism — ask the recruiter directly what they evaluate for and why, and ask for a source.",
      );
    }
    gaps.push(
      isFullRoster
        ? `Work realities below reflect all ${sample.length} currently open role(s) at this company.`
        : `Work realities below are computed from a sample of ${sample.length} of this company's ${company.open_roles} listed open role(s), not a census of all of them.`,
    );

    return {
      company: {
        slug: company.slug,
        name: company.name,
        url: company.url,
        blurb: company.blurb,
        industries: company.industries,
        stage: company.labels.stage ?? null,
        size: company.labels.size ?? null,
        businessModel: company.labels.business_model ?? null,
      },
      criteria,
      workRealities: {
        sampleSize: sample.length,
        isFullRoster,
        workplaceMix,
        topLocations,
        uniqueLocationCount: locationCounts.size,
        compRangeObserved,
      },
      gaps,
      sources: [SPEEDRUN_SOURCE, { title: `${company.name} on speedrun`, url: company.url }, ...criteria.map((c) => ({ title: c.criterion, url: c.sourceUrl }))],
      disclaimer: DISCLAIMERS.noDemographicInference,
    };
  },
};
