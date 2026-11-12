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

// Collapses -/_/whitespace runs to a single "-" so "continuous_vetting",
// "continuous vetting", and the real id "continuous-vetting" all normalize
// identically — found live via the spec §6 judging panel round 4: the
// tool's own input description suggests "continuous_vetting" (underscore)
// as an example keyword, but the real id uses a dash, and a plain
// lowercase-only comparison treated them as different strings.
function normalizeTopicKey(s: string): string {
  return s.trim().toLowerCase().replace(/[-_\s]+/g, "-");
}

export function findRule(topic: string): RuleEntry | undefined {
  const normalized = normalizeTopicKey(topic);
  if (!normalized) return undefined;
  const byId = RULES.find((r) => normalizeTopicKey(r.id) === normalized);
  if (byId) return byId;
  const byTitle = RULES.find((r) => normalizeTopicKey(r.title) === normalized);
  if (byTitle) return byTitle;
  // Match by category, but only when it uniquely identifies one rule —
  // also found live via round 4: the description's other example keyword,
  // "reciprocity," is a *category* value (several rules can share one),
  // not a rule id, so the id-only matcher above never found it either.
  // Several categories here (e.g. "clearance-process") have multiple
  // member rules, where a bare category guess is genuinely ambiguous — in
  // that case this intentionally falls through rather than guess which one.
  const categoryMatches = RULES.filter((r) => normalizeTopicKey(r.category) === normalized);
  if (categoryMatches.length === 1) return categoryMatches[0];
  return RULES.find(
    (r) => normalizeTopicKey(r.id).includes(normalized) || normalized.includes(normalizeTopicKey(r.id)),
  );
}

export function listRuleSummaries(): { id: string; title: string; category: string }[] {
  return RULES.map((r) => ({ id: r.id, title: r.title, category: r.category }));
}
