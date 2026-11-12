import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { FIT_TAGS, FIT_TAG_LABELS, FIT_TAG_QUESTIONS, type FitTag } from "@/data/fit-tags";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const TagEnum = z.enum(FIT_TAGS);

const InputSchema = z.object({
  role_id: z.string().min(1),
  loved: z.array(TagEnum).max(FIT_TAGS.length).default([]),
  disliked: z.array(TagEnum).max(FIT_TAGS.length).default([]),
});

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  summaryTemplate: z.string(),
  questionsToAskTheCompany: z.array(z.string()),
  shareDraft: z.object({ markdown: z.string(), note: z.string() }),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

function label(tag: FitTag): string {
  return FIT_TAG_LABELS[tag];
}

export const fitDebriefTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "fit_debrief",
  title: "Debrief what you loved/disliked",
  description:
    "Turns loved/disliked work-reality tags (from run_job_preview or your own reflection) into a summary template, concrete questions to ask the company, and an editable share-draft. Never a score — work-style tags only, never demographic or personality-typed.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, loved, disliked }) => {
    const role = await resolveRole(role_id);

    const lovedLabels = loved.map(label);
    const dislikedLabels = disliked.map(label);
    const overlap = loved.filter((t) => disliked.includes(t));

    const summaryTemplate = [
      `Using what you know about the user, write a short, honest summary of their reaction to the "${role.title}" role at ${role.company}:`,
      lovedLabels.length ? `What they responded well to: ${lovedLabels.join(", ")}.` : "They didn't flag anything they particularly responded well to.",
      dislikedLabels.length ? `What gave them pause: ${dislikedLabels.join(", ")}.` : "They didn't flag anything that gave them pause.",
      overlap.length ? `Note: ${overlap.map(label).join(", ")} was flagged as BOTH loved and disliked — surface that tension explicitly rather than averaging it away.` : "",
      "Report this as aligned / mixed / unclear per theme, in the user's own terms — never a score, never a percentage, never a hire/no-hire read.",
    ]
      .filter(Boolean)
      .join(" ");

    const questionsToAskTheCompany = [...new Set([...disliked, ...overlap])].map((tag) => FIT_TAG_QUESTIONS[tag]);

    const shareDraftLines = [
      `# Interest note — ${role.title} at ${role.company}`,
      "",
      "*Draft for the candidate to review and edit before sharing. Nothing here was verified by Clearance Lens.*",
      "",
      lovedLabels.length ? `**What stood out positively:** ${lovedLabels.join(", ")}` : "",
      dislikedLabels.length ? `**Open questions / reservations:** ${dislikedLabels.join(", ")}` : "",
      "",
      `Role: [${role.title}](${role.url})`,
    ].filter(Boolean);

    return {
      roleTitle: role.title,
      company: role.company,
      summaryTemplate,
      questionsToAskTheCompany,
      shareDraft: {
        markdown: shareDraftLines.join("\n"),
        note: "This is a draft. Review and edit every line before sending it to anyone — nothing in it was verified by Clearance Lens, and it is never a score.",
      },
      sources: [SPEEDRUN_SOURCE],
      disclaimer: DISCLAIMERS.notAScore,
    };
  },
};
