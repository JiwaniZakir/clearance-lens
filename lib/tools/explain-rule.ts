import { z } from "zod";
import { findRule, listRuleSummaries } from "@/lib/rules-data";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({
  topic: z
    .string()
    .min(1)
    .max(60)
    .describe(
      "A topic id or keyword, e.g. \"itar\", \"fcl\", \"reciprocity\", \"interim\", \"sf86\", \"continuous_vetting\". If unsure, call this tool with any guess — a miss returns the full list of available topics.",
    ),
});

const OutputSchema = z.object({
  found: z.boolean(),
  topic: z
    .object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    })
    .optional(),
  availableTopics: z.array(z.object({ id: z.string(), title: z.string(), category: z.string() })).optional(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const explainRuleTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "explain_rule",
  title: "Explain a clearance/ITAR rule",
  description:
    "Plain-English explanation of a clearance or export-control rule (ITAR, FCL sponsorship, SEAD 4, SEAD 7 reciprocity, interim clearances, continuous vetting, SF-86/NBIS, deemed exports, etc.) with primary-source links. Not legal advice — always verify with your FSO or counsel.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ topic }) => {
    const rule = findRule(topic);
    if (!rule) {
      return {
        found: false,
        availableTopics: listRuleSummaries(),
        sources: [],
        disclaimer: DISCLAIMERS.notLegalAdvice,
      };
    }
    return {
      found: true,
      topic: {
        id: rule.id,
        title: rule.title,
        category: rule.category,
        summary: rule.summary,
        keyPoints: rule.keyPoints,
      },
      sources: rule.sources,
      disclaimer: DISCLAIMERS.notLegalAdvice,
    };
  },
};
