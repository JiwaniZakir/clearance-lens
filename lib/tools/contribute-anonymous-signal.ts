import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE, RoleIdSchema } from "@/lib/tools/role-shared";
import { getSignalStore, MIN_CONTRIBUTORS, COOLDOWN_MS, type SignalContribution } from "@/lib/signal/store";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * Clearance Lens v2 piece #4 (write side): the candidate's own agent
 * explicitly opts this one role-interest into the aggregated signal pool —
 * nothing happens unless this tool is called directly, deliberately, same
 * as every other opt-in tool in this product. Carries no name, contact
 * info, GitHub/Cosign handle, or any other identifier — only a handful of
 * closed-enum buckets, by design (see lib/signal/store.ts's module comment
 * for why this is the one stateful tool in an otherwise stateless product,
 * and DECISIONS.md D-032/D-035/D-036 for why this, not candidate
 * ranking, is what got built).
 */

const ContributionSchema = z
  .object({
    clearance_level: z.enum(["none", "interim", "secret", "ts", "ts_sci"]).optional(),
    citizenship_status: z.enum(["us_citizen", "green_card", "other_protected_individual", "not_us_person"]).optional(),
    years_experience_bucket: z.enum(["0-2", "3-5", "6-10", "10+"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, { message: "At least one bucket is required" });

const InputSchema = z.object({
  role_id: RoleIdSchema,
  contribution: ContributionSchema,
});

const OutputSchema = z.object({
  recorded: z.boolean(),
  roleTitle: z.string(),
  company: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const contributeAnonymousSignalTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "contribute_anonymous_signal",
  title: "Contribute to a role's anonymous aggregate signal",
  description:
    "Opts this one role-interest into an anonymous, aggregated signal pool other tools (get_aggregated_signal) can read back as a rounded percentage once enough people have contributed — never as an individual record. Carries no name, contact info, or identifier of any kind, only closed-enum buckets (clearance_level, citizenship_status, years_experience_bucket) you explicitly choose to include. Call this only when the candidate has explicitly agreed to contribute — it is never implied by calling any other tool.",
  // Writes to the shared pool, so it must not claim to be read-only — a
  // client that auto-approves read-only tools would skip the user's consent
  // (judging panel round 9; DECISIONS.md D-048).
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, contribution }) => {
    const role = await resolveRole(role_id);
    const store = getSignalStore();
    const contributionToStore: SignalContribution = contribution;

    // Found live via the spec §6 judging panel round 7 (recruiter_user,
    // directly demonstrated): with no accounts, nothing stopped a script
    // from pushing 10 contributions to one role in under 2 seconds. This
    // scope-level cooldown directly defeats that exact burst pattern — not
    // a complete fix (a patient adversary spacing calls out still isn't
    // stopped), which the disclaimer below says plainly rather than
    // overclaiming data-integrity protection this doesn't fully provide.
    const accepted = await store.tryAcquireCooldown(role.id);
    if (!accepted) {
      return {
        recorded: false,
        roleTitle: role.title,
        company: role.company,
        sources: [SPEEDRUN_SOURCE],
        disclaimer: `Not recorded — another contribution for this exact role was accepted within the last ${Math.round(COOLDOWN_MS / 1000)} second(s). This is a basic anti-burst safeguard, not a full anti-fabrication system (see get_aggregated_signal's own disclaimer) — wait a moment and try again if this was a genuine, one-time contribution.`,
      };
    }

    await store.addContribution({ roleId: role.id, companySlug: role.companySlug }, contributionToStore);

    return {
      recorded: true,
      roleTitle: role.title,
      company: role.company,
      sources: [SPEEDRUN_SOURCE],
      disclaimer:
        (role.companySlug
          ? "This contribution was recorded anonymously against this specific role and its company's aggregate pool. "
          : "This posting has no public company page (a stealth listing), so this contribution is recorded only against the role itself, not a company-wide aggregate. ") +
        `No name, contact info, or identifier of any kind was recorded. Nothing is readable back as an individual record — only a rounded aggregate percentage, and only once at least ${MIN_CONTRIBUTORS} people have contributed (see get_aggregated_signal). ` +
        DISCLAIMERS.noDemographicInference,
    };
  },
};
