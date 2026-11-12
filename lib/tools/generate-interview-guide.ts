import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { extractSections } from "@/lib/speedrun/extract-sections";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * Compliant alternative to "AI recruiter panels"/multi-agent hiring
 * committees (explicitly declined — DECISIONS.md D-032/D-035/D-036: that
 * category of request conflicts with this project's own hard constraint
 * and with employment-AI law regardless of whether the scoring is one
 * model or a committee of them). This tool never sees, touches, or asks
 * about any candidate at all — it is built ONLY from the role's own public
 * posting text, exactly like build_trial_assessment, just producing a
 * structure for a HUMAN panel to run a live conversation instead of an
 * async work sample. It takes the "can't afford a staffed recruiting
 * function" burden off a small team's human interviewers without ever
 * becoming the thing that scores or ranks a person.
 */

const InputSchema = z.object({
  role_id: z.string().min(1),
  minutes: z.union([z.literal(30), z.literal(45), z.literal(60)], {
    error: "minutes must be one of 30, 45, or 60",
  }),
});

const EvaluationGuidanceSchema = z.object({
  strongAnswerLooksLike: z.string(),
  weakAnswerLooksLike: z.string(),
  followUpProbe: z.string(),
});

const QuestionSchema = z.object({
  question: z.string(),
  tracedToQuote: z.string(),
  evaluationGuidance: EvaluationGuidanceSchema,
});

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  minutes: z.number(),
  questions: z.array(QuestionSchema),
  guardrailsForThePanel: z.array(z.string()),
  itarSafetyNote: z.string(),
  limitsNote: z.string(),
  neverAScoreNote: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

type QuestionCountSpec = { count: number; note: string };

// A live conversation fits fewer, deeper questions than an async work
// sample covers in the same nominal time — these buckets are this
// project's own reasoned pacing assumption (standard interview-slot
// lengths), not a number any cited study measures directly, same caveat
// as build_trial_assessment's own SCOPE_BY_MINUTES.
const QUESTIONS_BY_MINUTES: Record<30 | 45 | 60, QuestionCountSpec> = {
  30: { count: 4, note: "A short screen — enough time for 4 questions plus brief follow-ups, not a deep-dive." },
  45: { count: 6, note: "A standard single-round interview — 6 questions leaves room for real follow-up on 2-3 of them." },
  60: { count: 8, note: "A longer loop slot — 8 questions, with explicit room to go deep on whichever 2-3 the candidate's answers make most worth probing." },
};

function buildGuidance(quote: string): z.infer<typeof EvaluationGuidanceSchema> {
  return {
    strongAnswerLooksLike: `Gives a concrete, specific example connected to "${quote}" — names what they actually did, why, and at least one tradeoff or thing they'd do differently.`,
    weakAnswerLooksLike: `Stays abstract/hypothetical, never connects back to "${quote}" with a real example, or describes someone else's work as their own without being pressed.`,
    followUpProbe: `"What specifically did YOU do there, versus the team?" / "What would you do differently now?" — either probe surfaces whether the first answer was concrete or rehearsed.`,
  };
}

export const generateInterviewGuideTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "generate_interview_guide",
  title: "Generate a structured interview guide for a role",
  description:
    "Generates a structured-interview question set (behaviorally-anchored evaluation guidance per question, never a numeric score) built only from a role's public posting text — for a startup's own human panel to run themselves. Never accepts, asks about, or produces anything about any specific candidate; this is a role-side prep tool only, same traced-to-the-posting discipline as build_trial_assessment. Grounded in Schmidt & Hunter (1998)'s meta-analytic validity estimate for structured interviews (.51) vs. unstructured ones (.38) — see sources[].",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, minutes }) => {
    const role = await resolveRole(role_id);
    const sections = extractSections(role.descriptionText);
    const spec = QUESTIONS_BY_MINUTES[minutes];

    // Qualifications first (what the posting says a candidate needs to
    // bring) read more naturally as interview-question seeds than
    // responsibilities (what the job involves day to day, which
    // build_trial_assessment already prioritizes for its own, different
    // purpose) -- the inverse preference order is deliberate, not a copy
    // of that file's own choice.
    const pool =
      sections.qualifications.length >= spec.count
        ? sections.qualifications
        : [...sections.qualifications, ...sections.responsibilities, ...sections.rawBullets];
    const uniquePool = [...new Set(pool)];
    const chosen = uniquePool.slice(0, spec.count);

    const questions: z.infer<typeof QuestionSchema>[] = chosen.map((quote) => ({
      question: `Tell me about a time your work connected to: "${quote}". Walk me through a specific example.`,
      tracedToQuote: quote,
      evaluationGuidance: buildGuidance(quote),
    }));

    return {
      roleTitle: role.title,
      company: role.company,
      minutes,
      questions,
      guardrailsForThePanel: [
        `${spec.note} Every question below traces to this posting's own stated requirements — if the conversation drifts, these are the anchors to come back to.`,
        "Never ask about, or let the conversation drift into, a candidate's age, race, color, religion, sex, national origin, disability, genetic information, pregnancy, or veteran status — federal law (Title VII, the ADA, the ADEA, GINA, USERRA) protects every one of these, and an informal-sounding rapport question (\"when did you graduate,\" \"do you have kids\") can be exactly as legally risky as a direct one.",
        "Never ask a candidate to describe, confirm, or produce real classified, CUI, or export-controlled technical information — even if they volunteer a clearance-related story, redirect to what they can discuss at the unclassified level.",
        "This guide produces structure and evaluation anchors for YOUR panel's own judgment — it never scores, ranks, or recommends a hire/no-hire decision itself. That call is yours.",
      ],
      itarSafetyNote: DISCLAIMERS.itarSafeTrial,
      limitsNote:
        "Structured interviews (questions determined by job analysis, asked consistently, evaluated against predetermined criteria) are one of the most validated predictors of job performance in the personnel-selection literature — Schmidt & Hunter's (1998) meta-analysis estimates a validity of .51, versus .38 for unstructured interviews (see sources[]). That evidence licenses the design choices above (job-traced, consistent, criteria stated up front), not a claim that this specific generated guide reproduces any particular validity number.",
      neverAScoreNote:
        "No field anywhere in this output is a score, rating, or ranking of any candidate — this tool has never seen, and cannot see, any candidate's answers. " +
        DISCLAIMERS.noDemographicInference,
      sources: [
        SPEEDRUN_SOURCE,
        {
          title: "Schmidt & Hunter (1998) — The Validity and Utility of Selection Methods in Personnel Psychology",
          url: "https://stafforini.com/works/schmidt-1998-validity-and-utility/",
        },
      ],
      disclaimer: DISCLAIMERS.itarSafeTrial,
    };
  },
};
