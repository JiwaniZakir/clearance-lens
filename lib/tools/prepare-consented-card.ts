import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE, RoleIdSchema } from "@/lib/tools/role-shared";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * D-047 (spec §6 judging panel round 9, plus rounds 2, 4, 5, 7 and 8 before
 * it): this tool used to take the card's field VALUES and echo them verbatim
 * into a shareable card. Every round, a judge found the next PII variant the
 * guard missed in those free-text fields — round 9 alone got 38 of 80
 * refuse-list payloads through (CUI markings, ID numbers, a name and street
 * address, religion, health details), all echoed back. Pattern-matching free
 * text can't win that race. So the card is now built the way the rest of
 * this product works: the server returns a fill-in template for the fields
 * the user approved, and the user's own agent fills in the values locally.
 * The values never reach the server, so there is nothing for it to accept,
 * echo, or leak. The fixed field order lives in CARD_FIELDS below.
 */
const CARD_FIELDS = [
  {
    name: "headline",
    label: "Headline",
    kind: "text",
    guidance: "One line on role and experience, e.g. \"Backend engineer, 6 yrs, embedded Rust\".",
  },
  {
    name: "clearance_status_self_reported",
    label: "Clearance status (self-reported)",
    kind: "text",
    guidance:
      "Level and status only, e.g. \"Active Secret\" or \"None yet\" — never record text, case numbers, or screenshots. Employers verify clearance through their Facility Security Officer, not this card.",
  },
  {
    name: "citizenship_status_self_reported",
    label: "Citizenship status (self-reported)",
    kind: "text",
    guidance:
      "General status only, e.g. \"U.S. citizen\" or \"Green card holder\" — never a document or number. Roles that require a clearance require U.S. citizenship (see explain_rule \"clearance-citizenship\").",
  },
  {
    name: "highlights",
    label: "Highlights",
    kind: "list",
    guidance: "Up to 5 lines, each starting with \"- \": concrete work that fits this role.",
  },
  {
    name: "github_username",
    label: "GitHub",
    kind: "text",
    guidance: "The public username only. verify_evidence can summarize its public signal first.",
  },
  {
    name: "availability",
    label: "Availability",
    kind: "text",
    guidance: "e.g. \"Available now\" or \"2 weeks' notice\".",
  },
  {
    name: "notes",
    label: "Notes",
    kind: "text",
    guidance: "Anything else the user wants this company to know about the role fit.",
  },
] as const;

type CardFieldName = (typeof CARD_FIELDS)[number]["name"];
const CARD_FIELD_NAMES = CARD_FIELDS.map((f) => f.name) as [CardFieldName, ...CardFieldName[]];

/** Applies to every field. Protected characteristics aren't just private —
 *  an employer can't lawfully weigh them, so they don't belong on a card. */
const NEVER_INCLUDE =
  "Never put on the card: government ID numbers (SSN, passport, A-number, DoD ID, driver's license), date of birth, home address, clearance record text or case numbers, or protected characteristics — age, race, ethnicity, religion, sex, pregnancy, disability or health, national origin, or genetic information. Employers must not consider those, and none of them helps an intro. Contact details: the user adds their own when they send it, if they choose.";

const OLD_CONTRACT_MESSAGE =
  "prepare_consented_card no longer takes field values. Send approved_fields (the names of the fields the user approved), then fill in the returned template locally — the values never need to reach this server.";

// The old contract sent values in `fields_user_approved`. That shape is
// refused with a pointer to the new one rather than silently ignored (the PII
// guard still scans it first). Done as a refinement on a passthrough object,
// not a `z.undefined()` field: the MCP SDK converts this schema to JSON
// Schema for tools/list, which can't represent `undefined` — that broke
// tools/list for every client in a local build (D-047).
const InputSchema = z
  .object({
    role_id: RoleIdSchema,
    approved_fields: z
      .array(z.enum(CARD_FIELD_NAMES), {
        // A missing approved_fields almost always means the old contract.
        error: (issue) => (issue.input === undefined ? OLD_CONTRACT_MESSAGE : undefined),
      })
      .min(1)
      .max(CARD_FIELD_NAMES.length)
      .describe("The NAMES of the fields the user approved sharing with this company — never their values. Your agent fills the values in locally."),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if ("fields_user_approved" in data) {
      ctx.addIssue({
        code: "custom",
        path: ["fields_user_approved"],
        message: OLD_CONTRACT_MESSAGE,
      });
    }
  });

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  cardTemplate: z.object({
    markdown: z.string(),
    fields: z.array(
      z.object({
        name: z.string(),
        label: z.string(),
        placeholder: z.string(),
        kind: z.enum(["text", "list"]),
        guidance: z.string(),
      }),
    ),
    neverInclude: z.string(),
  }),
  evaluate_locally: z.literal(true),
  instructionsForAgent: z.string(),
  notVerifiedNote: z.string(),
  applyLink: z.object({ url: z.string(), label: z.string() }).nullable(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const prepareConsentedCardTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "prepare_consented_card",
  title: "Prepare a consented intro card",
  description:
    "Returns a fill-in intro-card template for a role, containing ONLY the fields the user approved (pass their names in approved_fields — never the values). Your agent fills each {{placeholder}} in locally with the user's own words, shows them the finished card, and gets a final yes before they send it — the values never reach this server. States plainly what isn't verified. Never submits anything on the user's behalf; at most links to the role's own apply flow.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, approved_fields }) => {
    const role = await resolveRole(role_id);
    const approved = new Set(approved_fields);
    const fields = CARD_FIELDS.filter((f) => approved.has(f.name)).map((f) => ({
      name: f.name,
      label: f.label,
      placeholder: `{{${f.name}}}`,
      kind: f.kind,
      guidance: f.guidance,
    }));

    const lines = [`# Intro card — ${role.title} at ${role.company}`, ""];
    for (const f of fields) {
      if (f.kind === "list") lines.push(`**${f.label}:**`, f.placeholder);
      else lines.push(`**${f.label}:** ${f.placeholder}`);
    }
    lines.push("", `Interested in: [${role.title}](${role.url})`);

    const selfReported = fields.filter((f) => f.name.endsWith("_self_reported")).map((f) => f.label);
    const notVerifiedNote =
      selfReported.length > 0
        ? `${selfReported.join(" and ")} ${selfReported.length === 1 ? "is" : "are"} self-reported by the candidate and NOT verified by Clearance Lens. Clearance status in particular can only be verified by the employer's Facility Security Officer (FSO) at the offer stage — never from a self-report or a screenshot. ${DISCLAIMERS.neverVerifiesClearance}`
        : `Nothing on this card is verified by Clearance Lens — it reflects only what the candidate chose to share. ${DISCLAIMERS.neverVerifiesClearance}`;

    return {
      roleTitle: role.title,
      company: role.company,
      cardTemplate: { markdown: lines.join("\n"), fields, neverInclude: NEVER_INCLUDE },
      evaluate_locally: true,
      instructionsForAgent:
        "Fill in each {{placeholder}} in cardTemplate.markdown yourself, locally, with what the user approved for THIS company, following each field's guidance and cardTemplate.neverInclude. Don't add anything they didn't approve. Show them the finished card and get a final yes before they send it themselves. Never send the filled-in values back to Clearance Lens — nothing here needs them. " +
        DISCLAIMERS.evaluateLocally,
      notVerifiedNote,
      applyLink: { url: role.url, label: `Apply via ${role.company}'s listing` },
      sources: [SPEEDRUN_SOURCE],
      disclaimer: DISCLAIMERS.neverSubmitsOnUserBehalf,
    };
  },
};
