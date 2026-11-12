import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

// .strict() deliberately: unlike most tool inputs, every field here is
// something the user is about to make public. An unknown key should be a
// clear validation error, not silently stripped (see DECISIONS.md D-005) —
// silently dropping part of what someone meant to share is the wrong failure
// mode for a sharing tool specifically.
const ApprovedFieldsSchema = z
  .object({
    headline: z.string().max(200).optional(),
    clearance_status_self_reported: z.string().max(200).optional(),
    citizenship_status_self_reported: z.string().max(200).optional(),
    highlights: z.array(z.string().max(300)).max(5).optional(),
    github_username: z.string().max(100).optional(),
    availability: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

const InputSchema = z.object({
  role_id: z.string().min(1),
  fields_user_approved: ApprovedFieldsSchema,
});

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  card: z.object({ markdown: z.string(), json: z.record(z.string(), z.unknown()) }),
  notVerifiedNote: z.string(),
  applyLink: z.object({ url: z.string(), label: z.string() }).nullable(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

const FIELD_LABELS: Record<string, string> = {
  headline: "Headline",
  clearance_status_self_reported: "Clearance status (self-reported)",
  citizenship_status_self_reported: "Citizenship status (self-reported)",
  highlights: "Highlights",
  github_username: "GitHub",
  availability: "Availability",
  notes: "Notes",
};

export const prepareConsentedCardTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "prepare_consented_card",
  title: "Prepare a consented intro card",
  description:
    "Builds a shareable intro card from ONLY the fields the user explicitly approved — nothing is added, inferred, or verified. States plainly what wasn't verified. Never submits anything on the user's behalf; at most links to the role's own apply flow.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, fields_user_approved }) => {
    const role = await resolveRole(role_id);

    const present = Object.entries(fields_user_approved).filter(([, v]) => v !== undefined) as [string, unknown][];
    const lines = [`# Intro card — ${role.title} at ${role.company}`, ""];
    for (const [key, value] of present) {
      const label = FIELD_LABELS[key] ?? key;
      if (Array.isArray(value)) {
        lines.push(`**${label}:**`);
        for (const item of value) lines.push(`- ${item}`);
      } else {
        lines.push(`**${label}:** ${value}`);
      }
    }
    lines.push("", `Interested in: [${role.title}](${role.url})`);

    const selfReportedFields = present
      .filter(([key]) => key.endsWith("_self_reported"))
      .map(([key]) => FIELD_LABELS[key] ?? key);

    const notVerifiedNote =
      selfReportedFields.length > 0
        ? `${selfReportedFields.join(" and ")} ${selfReportedFields.length === 1 ? "is" : "are"} self-reported by the candidate and NOT verified by Clearance Lens. Clearance status in particular can only be verified by the employer's Facility Security Officer (FSO) at the offer stage — never from a self-report or a screenshot. ${DISCLAIMERS.neverVerifiesClearance}`
        : `Nothing on this card was verified by Clearance Lens — it reflects only what the candidate explicitly chose to share. ${DISCLAIMERS.neverVerifiesClearance}`;

    return {
      roleTitle: role.title,
      company: role.company,
      card: { markdown: lines.join("\n"), json: fields_user_approved },
      notVerifiedNote,
      applyLink: { url: role.url, label: `Apply via ${role.company}'s listing` },
      sources: [SPEEDRUN_SOURCE],
      disclaimer: DISCLAIMERS.neverSubmitsOnUserBehalf,
    };
  },
};
