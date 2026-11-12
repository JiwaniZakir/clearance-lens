import { z } from "zod";
import { SourceRefSchema } from "@/lib/tools/wrap";
import rulesJson from "@/data/rules.json";

export const RuleCategorySchema = z.enum([
  "itar",
  "eligibility",
  "clearance-process",
  "sponsorship",
  "reciprocity",
  "continuous-vetting",
  "verification-tech",
]);

export const RuleEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: RuleCategorySchema,
  summary: z.string(),
  keyPoints: z.array(z.string()),
  sources: z.array(SourceRefSchema).min(1),
});
export type RuleEntry = z.infer<typeof RuleEntrySchema>;

const RulesFileSchema = z.object({
  lastVerified: z.string(),
  rules: z.array(RuleEntrySchema).min(1),
});

// Fail fast at import time, not at request time, if the data file doesn't
// match its own contract — see data/rules.json for the tripwire placeholder
// this validates against until research/R4 lands.
const parsed = RulesFileSchema.parse(rulesJson);

export const RULES: RuleEntry[] = parsed.rules;
export const RULES_LAST_VERIFIED: string = parsed.lastVerified;

export function findRule(topic: string): RuleEntry | undefined {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) return undefined;
  return (
    RULES.find((r) => r.id.toLowerCase() === normalized) ??
    RULES.find((r) => r.title.toLowerCase() === normalized) ??
    RULES.find((r) => r.id.toLowerCase().includes(normalized) || normalized.includes(r.id.toLowerCase()))
  );
}

export function listRuleSummaries(): { id: string; title: string; category: string }[] {
  return RULES.map((r) => ({ id: r.id, title: r.title, category: r.category }));
}
