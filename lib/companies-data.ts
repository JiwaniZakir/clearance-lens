import { z } from "zod";
import companiesJson from "@/data/companies.json";

/**
 * Hand-curated, per-company published hiring criteria — deliberately starts
 * EMPTY ({}), which is the honest default state for almost every company
 * (spec hard constraint #4: "If a company has no published criteria, return
 * gaps and no fit read"). An entry may only be added here if every criterion
 * carries a real source URL to the company's OWN published material and a
 * stated job-relevance reason — never a "culture fit" guess. See PLAN.md /
 * BLOCKERS.md for curation as a roadmap item, not a build-blocker.
 */
const CriterionSchema = z.object({
  criterion: z.string(),
  sourceUrl: z.string().url(),
  jobRelevanceReason: z.string(),
});
export type Criterion = z.infer<typeof CriterionSchema>;

const CompaniesFileSchema = z.record(z.string(), z.object({ criteria: z.array(CriterionSchema) }));
const parsed = CompaniesFileSchema.parse(companiesJson);

export function getCuratedCriteria(slug: string): Criterion[] {
  return parsed[slug]?.criteria ?? [];
}
