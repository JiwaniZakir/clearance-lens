import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE, RoleIdSchema } from "@/lib/tools/role-shared";
import { extractSections } from "@/lib/speedrun/extract-sections";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({ role_id: RoleIdSchema });

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  template: z.object({
    eligibility: z.object({ prompt: z.string(), agentFillsThisIn: z.literal(true) }),
    gaps: z.object({ prompt: z.string(), agentFillsThisIn: z.literal(true) }),
    twoWeekPrepPlan: z.object({
      prompt: z.string(),
      suggestedFocusAreas: z.array(z.string()),
      agentFillsThisIn: z.literal(true),
    }),
  }),
  // Renamed from `recruiterQuestions` (judging panel round 8, candidate_user):
  // these are questions for the candidate to ASK the recruiter, and the old
  // name read as the reverse. Matches fit_debrief's questionsToAskTheCompany.
  questionsToAskTheRecruiter: z.array(z.string()),
  evaluate_locally: z.literal(true),
  instructionsForAgent: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const readinessBriefTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "readiness_brief",
  title: "Build a readiness brief",
  description:
    "A structured brief template for YOUR AGENT to fill in locally: eligibility read, gaps, a 2-week prep plan, and ready-to-ask recruiter/FSO questions. evaluate_locally is always true — private answers stay with the agent.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id }) => {
    const role = await resolveRole(role_id);
    const sections = extractSections(role.descriptionText);
    const focusAreas = (sections.qualifications.length > 0 ? sections.qualifications : sections.rawBullets).slice(0, 6);

    const questionsToAskTheRecruiter = [
      `Does the ${role.title} role currently require an active clearance, or could I start on unclassified work while an investigation is pending?`,
      `Does ${role.company} currently hold a Facility Clearance (FCL), or would sponsorship be needed for this role?`,
      "What does the first 90 days typically look like for someone waiting on a clearance to finalize?",
      "Is there flexibility on start date if an investigation or interim determination is still in progress?",
    ];
    if (role.signals.some((s) => s.kind === "citizenship")) {
      questionsToAskTheRecruiter.push(
        "Can you confirm exactly what citizenship/US-person status this specific role requires, beyond what's in the posting?",
      );
    }

    return {
      roleTitle: role.title,
      company: role.company,
      template: {
        eligibility: {
          prompt:
            "Using what you already know about the user and the eligibility signals from get_role_rubric/search_defense_roles for this role, summarize: likely eligible, likely not eligible, or genuinely unclear — with the specific reason. Never a score.",
          agentFillsThisIn: true,
        },
        gaps: {
          prompt:
            "Name the specific gaps between what this role's posting asks for and what you know about the user (skills, clearance status, citizenship) — concretely, not generically.",
          agentFillsThisIn: true,
        },
        twoWeekPrepPlan: {
          prompt:
            "Using suggestedFocusAreas below (quoted from the posting) and what you know about the user, draft a realistic 2-week prep plan. Prioritize the areas where the user's own gap is largest.",
          suggestedFocusAreas: focusAreas,
          agentFillsThisIn: true,
        },
      },
      questionsToAskTheRecruiter,
      evaluate_locally: true,
      instructionsForAgent:
        "Fill in the three template sections yourself, locally, using what you already know about the user. " +
        DISCLAIMERS.evaluateLocally,
      sources: [SPEEDRUN_SOURCE],
      disclaimer: DISCLAIMERS.notAScore,
    };
  },
};
