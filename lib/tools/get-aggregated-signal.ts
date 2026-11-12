import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { getCompany } from "@/lib/speedrun/client";
import { getSignalStore, getAggregate, MIN_CONTRIBUTORS, type AggregateBreakdown } from "@/lib/signal/store";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * Clearance Lens v2 piece #4 (read side): companion to
 * contribute_anonymous_signal. Anyone can call this — there's no recruiter
 * login anywhere in this product (see DECISIONS.md D-001/D-002), so the
 * privacy protection comes from the k-anonymity floor itself
 * (MIN_CONTRIBUTORS, lib/signal/store.ts), not from gating who asks.
 *
 * Honesty, not false precision: this reflects unauthenticated,
 * self-reported contributions with no protection against duplicates or
 * bad-faith submissions — every response says so. It is a rough,
 * directional signal, never a rigorous survey, and never a ranking of any
 * individual (see DECISIONS.md D-032/D-035/D-036).
 */

const InputSchema = z
  .object({
    role_id: z.string().min(1).optional(),
    company_slug: z.string().min(1).optional(),
  })
  .strict()
  .refine((obj) => (obj.role_id ? 1 : 0) + (obj.company_slug ? 1 : 0) === 1, {
    message: "Pass exactly one of role_id or company_slug, not both and not neither.",
  });

const BreakdownFieldSchema = z.record(z.string(), z.number()).nullable();

const OutputSchema = z.object({
  scope: z.object({ type: z.enum(["role", "company"]), label: z.string() }),
  totalContributions: z.number(),
  meetsFloor: z.boolean(),
  percentages: z
    .object({
      clearanceLevel: BreakdownFieldSchema,
      citizenshipStatus: BreakdownFieldSchema,
      yearsExperience: BreakdownFieldSchema,
    })
    .nullable(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

function toPercentages(counts: Partial<Record<string, number>> | null, total: number): Record<string, number> | null {
  if (!counts) return null;
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    if (count === undefined) continue;
    out[key] = Math.round((count / total) * 100);
  }
  return out;
}

export const getAggregatedSignalTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "get_aggregated_signal",
  title: "Read a role or company's aggregated anonymous signal",
  description:
    "Reads back the anonymous signal pool contribute_anonymous_signal writes to, as rounded percentages — never an individual record, and never before at least 5 people have contributed for this exact role or company (a k-anonymity floor: below that, or for any specific bucket value with fewer than 5 contributors, this returns nothing for it rather than a number that could single someone out). Pass exactly one of role_id (that specific posting only) or company_slug (every contribution across all of that company's postings).",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, company_slug }) => {
    const store = getSignalStore();
    let scopeType: "role" | "company";
    let scopeId: string;
    let label: string;

    if (role_id) {
      const role = await resolveRole(role_id);
      scopeType = "role";
      scopeId = role.id;
      label = `${role.title} at ${role.company}`;
    } else {
      // company_slug is guaranteed set here by InputSchema's refine.
      const slug = company_slug as string;
      const { company } = await getCompany(slug);
      label = company.name;
      scopeType = "company";
      scopeId = slug;
    }

    const breakdown: AggregateBreakdown = await getAggregate(store, scopeType, scopeId);

    const notDurableNote =
      store.backend === "in-memory"
        ? " This instance is currently running on non-durable, in-memory storage (no persistent store is configured yet) — contribution counts may reset between deployments rather than accumulating reliably."
        : "";

    return {
      scope: { type: scopeType, label },
      totalContributions: breakdown.totalContributions,
      meetsFloor: breakdown.meetsFloor,
      percentages: breakdown.meetsFloor
        ? {
            clearanceLevel: toPercentages(breakdown.clearanceLevel, breakdown.totalContributions),
            citizenshipStatus: toPercentages(breakdown.citizenshipStatus, breakdown.totalContributions),
            yearsExperience: toPercentages(breakdown.yearsExperience, breakdown.totalContributions),
          }
        : null,
      sources: [SPEEDRUN_SOURCE],
      disclaimer:
        (breakdown.meetsFloor
          ? `Reflects ${breakdown.totalContributions} anonymous contributions for this ${scopeType}. Any individual bucket value with fewer than ${MIN_CONTRIBUTORS} contributors is folded into "otherBelowFloor" rather than shown on its own, so no reader can single out a small subgroup. `
          : `Fewer than ${MIN_CONTRIBUTORS} people have contributed for this ${scopeType} yet, so no breakdown is shown — this protects the few contributors who do exist from being identifiable. `) +
        "This reflects unauthenticated, self-reported contributions with no protection against duplicates or bad-faith submissions — treat it as a rough, directional signal, never a rigorous survey, and never a ranking or score of any individual candidate." +
        notDurableNote +
        " " +
        DISCLAIMERS.noDemographicInference,
    };
  },
};
