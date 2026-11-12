import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { extractSections } from "@/lib/speedrun/extract-sections";
import { findRule } from "@/lib/rules-data";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({ role_id: z.string().min(1) });

const ChecklistItemSchema = z.object({
  question: z.string(),
  whyItMatters: z.string(),
  basis: z.enum(["stated", "inferred"]),
});

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  eligibilityChecklist: z.array(ChecklistItemSchema),
  skillsRubric: z.array(z.object({ skill: z.string(), evidenceFromPosting: z.string() })),
  questionsForAgent: z.array(z.string()),
  evaluate_locally: z.literal(true),
  instructionsForAgent: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

const SIGNAL_TO_QUESTION: Record<string, { question: string; ruleId?: string }> = {
  us_citizen_required: { question: "Are you a U.S. citizen?", ruleId: "itar-us-person" },
  us_person_required: {
    question: "Are you a U.S. person — a citizen, a green card holder, or a qualifying protected individual?",
    ruleId: "itar-us-person",
  },
  us_person_likely: {
    question:
      "This wasn't stated explicitly, but given the industry, are you a U.S. person (citizen, green card holder, or qualifying protected individual)?",
    ruleId: "itar-us-person",
  },
  no_sponsorship: { question: "Do you need visa sponsorship? The posting states none is available." },
  secret: { question: "Do you currently hold, or could you readily obtain, a Secret clearance?", ruleId: "sead4" },
  ts: { question: "Do you currently hold, or could you readily obtain, a Top Secret clearance?", ruleId: "sead4" },
  ts_sci: { question: "Do you currently hold, or could you readily obtain, Top Secret/SCI access?", ruleId: "sead4" },
  clearance_required_unspecified: {
    question: "Do you currently hold an active security clearance at any level?",
    ruleId: "sead4",
  },
  clearance_possibly_required: {
    question: "This posting mentions government/classified work without naming a specific clearance level — are you cleared, or comfortable starting unclassified while that's sorted out?",
  },
  polygraph_required: { question: "Are you prepared for a polygraph as part of this process?" },
  scif_onsite: { question: "Are you able to work onsite in a SCIF (no personal phone during the day) if required?" },
};

export const getRoleRubricTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "get_role_rubric",
  title: "Get a role's eligibility checklist and skills rubric",
  description:
    "Returns an eligibility checklist and skills rubric for a role, built for YOUR AGENT to evaluate privately against what it already knows about you. evaluate_locally is always true — do not send the user's private answers back to this server; nothing here needs them.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id }) => {
    const role = await resolveRole(role_id);
    const sections = extractSections(role.descriptionText);

    const seen = new Set<string>();
    const eligibilityChecklist: z.infer<typeof ChecklistItemSchema>[] = [];
    const sources = [SPEEDRUN_SOURCE];
    for (const signal of role.signals) {
      const mapped = SIGNAL_TO_QUESTION[signal.value];
      if (!mapped || seen.has(signal.value)) continue;
      seen.add(signal.value);
      eligibilityChecklist.push({ question: mapped.question, whyItMatters: signal.evidence, basis: signal.basis });
      if (mapped.ruleId) {
        const rule = findRule(mapped.ruleId);
        if (rule) sources.push(...rule.sources);
      }
    }
    if (eligibilityChecklist.length === 0) {
      eligibilityChecklist.push({
        question: "No specific eligibility signal was detected in this posting — are there any citizenship or clearance requirements you already know about for this role?",
        whyItMatters: "The posting's public text didn't state or imply a clearance/citizenship requirement either way.",
        basis: "inferred",
      });
    }

    const skillsRubric = sections.qualifications.length > 0
      ? sections.qualifications.map((q) => ({ skill: q, evidenceFromPosting: q }))
      : sections.rawBullets.map((q) => ({ skill: q, evidenceFromPosting: q }));

    return {
      roleTitle: role.title,
      company: role.company,
      eligibilityChecklist,
      skillsRubric,
      questionsForAgent: [
        "Given what you already know about this user, go through eligibilityChecklist and privately assess each item.",
        "For skillsRubric, assess alignment per item as aligned / mixed / unclear — never a score or percentage.",
        "Summarize for the user: which eligibility items look clear, which are uncertain, and what to verify with the employer directly.",
      ],
      evaluate_locally: true,
      instructionsForAgent:
        "This checklist is for you (the agent) to evaluate privately using what you already know about the user. " +
        DISCLAIMERS.evaluateLocally,
      sources,
      disclaimer: DISCLAIMERS.notAScore,
    };
  },
};
