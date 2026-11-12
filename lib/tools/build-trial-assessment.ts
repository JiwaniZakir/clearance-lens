import { z } from "zod";
import { resolveRole, SPEEDRUN_SOURCE } from "@/lib/tools/role-shared";
import { extractSections } from "@/lib/speedrun/extract-sections";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({
  role_id: z.string().min(1),
  // Explicit error message: found live via the spec §6 judging panel round
  // 4 — a numeric literal union's default error ("Invalid input") doesn't
  // name the allowed values the way a string z.enum's does elsewhere in
  // this file.
  minutes: z.union([z.literal(60), z.literal(90), z.literal(180)], {
    error: "minutes must be one of 60, 90, or 180",
  }),
});

const BandsSchema = z.object({
  exceptional: z.string(),
  proficient: z.string(),
  developing: z.string(),
  notDemonstrated: z.string(),
});

const CriterionSchema = z.object({
  criterion: z.string(),
  tracedToQuote: z.string(),
  bands: BandsSchema,
});

const OutputSchema = z.object({
  roleTitle: z.string(),
  company: z.string(),
  minutes: z.number(),
  taskShape: z.string(),
  brief: z.string(),
  deliverableRequirement: z.string(),
  outOfScope: z.array(z.string()),
  rubric: z.array(CriterionSchema),
  rubricRefinementNote: z.string(),
  itarSafetyNote: z.string(),
  limitsNote: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

type ScopeSpec = {
  taskShape: string;
  predictorAnalogue: string;
  rubricCount: number;
  why: string;
};

// research/R5-assessment-science.md §B4 — "no study measures optimal
// minute-counts; this translates the fixed-shape/scaled-scope standardization
// principle" [inference, explicitly labeled as such in the source research].
const SCOPE_BY_MINUTES: Record<60 | 90 | 180, ScopeSpec> = {
  60: {
    taskShape:
      "One narrow, already-decomposed task tied directly to a single named responsibility below — not an open-ended project.",
    predictorAnalogue: "job-knowledge test (applied, correct use of domain concepts under time pressure)",
    rubricCount: 3,
    why: "Matches tight time to a bounded, gradable unit of work; avoids penalizing candidates for lacking a large uninterrupted block.",
  },
  90: {
    taskShape: "One small end-to-end deliverable, plus a short rationale memo explaining your approach and one tradeoff.",
    predictorAnalogue: "job-knowledge + work-sample blend",
    rubricCount: 5,
    why: "Adds a tradeoffs-explanation component — the cheapest way to approximate structured-interview-style reasoning without a live conversation.",
  },
  180: {
    taskShape:
      "A scoped mini-project mirroring a real first task, plus an explicit \"here's what I'd do next and the two riskiest unknowns\" memo.",
    predictorAnalogue: "work-sample + a structured-interview-like reasoning component (written, not spoken)",
    rubricCount: 6,
    why: "Tests judgment under ambiguity and prioritization — closer to the actual breadth of job performance.",
  },
};

function buildBands(quote: string): z.infer<typeof BandsSchema> {
  return {
    exceptional: `Explicitly addresses "${quote}" with a stated approach, and names at least one tradeoff, edge case, or assumption.`,
    proficient: `Addresses "${quote}" with a reasonable approach, but doesn't name a tradeoff, edge case, or assumption.`,
    developing: `Only partially addresses "${quote}", or addresses it without connecting it back to what the brief asked for.`,
    notDemonstrated: `Does not address "${quote}" at all.`,
  };
}

export const buildTrialAssessmentTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "build_trial_assessment",
  title: "Build a trial work-sample assessment",
  description:
    "Generates an ITAR-safe, time-boxed work-sample exercise (brief, deliverable requirement, behaviorally-anchored rubric, 'what great looks like' bands) built only from a role's public posting text — never invented technical specifications. Grounded in Sackett et al. (2022) and the work-sample design literature; see sources[].",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ role_id, minutes }) => {
    const role = await resolveRole(role_id);
    const sections = extractSections(role.descriptionText);
    const scope = SCOPE_BY_MINUTES[minutes];

    // Prefer responsibilities (the "sample, not sign" principle, R5 §B1);
    // fall back to qualifications, then any bullet, so a thinly-structured
    // posting still produces a usable, job-specific rubric rather than an
    // empty one.
    const pool =
      sections.responsibilities.length >= scope.rubricCount
        ? sections.responsibilities
        : [...sections.responsibilities, ...sections.qualifications, ...sections.rawBullets];
    const uniquePool = [...new Set(pool)];
    const chosen = uniquePool.slice(0, scope.rubricCount);

    const rubric: z.infer<typeof CriterionSchema>[] = chosen.map((quote) => ({
      criterion: `Addresses: "${quote}"`,
      tracedToQuote: quote,
      bands: buildBands(quote),
    }));

    if (minutes === 180) {
      rubric.push({
        criterion: "Next-steps / riskiest-unknowns memo",
        tracedToQuote: "(scope-level requirement, not tied to a single bullet)",
        bands: {
          exceptional: "Names concrete next steps AND the two riskiest unknowns, each with why it's risky.",
          proficient: "Names next steps and at least one real risk or unknown.",
          developing: "Names next steps only, with no risk/unknown discussion.",
          notDemonstrated: "No next-steps or risk discussion included.",
        },
      });
    }

    const briefLines = [
      `Hey — welcome to a quick trial project modeled on the "${role.title}" role at ${role.company}.`,
      `Time box: ${minutes} minutes. ${scope.taskShape}`,
      "",
      "This is built only from the public job posting below — nothing here asks for or should produce export-controlled technical data, drawings, or specifications.",
      "",
      "Named responsibilities this exercise is scoped against (quoted from the posting):",
      ...chosen.map((q) => `  - "${q}"`),
    ];

    return {
      roleTitle: role.title,
      company: role.company,
      minutes,
      taskShape: scope.taskShape,
      brief: briefLines.join("\n"),
      deliverableRequirement:
        "Produce an artifact — code, a design doc with explicit tradeoffs, a test plan, or a short technical memo — not an opinion essay. The rubric below is disclosed up front, not hidden.",
      outOfScope: [
        "Anything requiring access to real classified, CUI, or export-controlled technical data.",
        "Anything not traceable to a bullet quoted above — scope-fencing is itself a standardization feature, not a limitation.",
      ],
      rubric,
      rubricRefinementNote:
        "These bands are a deterministic starting shape (so this works with no LLM key in the /try playground). Your own agent may sharpen the band language with more job-specific detail if useful — keep the Exceptional/Developing boundary anchored to the quoted requirement, not a generic trait.",
      itarSafetyNote: DISCLAIMERS.itarSafeTrial,
      limitsNote:
        "Work-sample tests are a strong predictor of job performance in the research literature when professionally built, standardized, and behaviorally scored at scale (Sackett, Zhang, Berry & Lievens, 2022 — see sources[]) — that evidence licenses the design choices above (job-specific, traceable, behaviorally anchored), not a claim that this specific generated exercise reproduces any particular validity number.",
      sources: [
        SPEEDRUN_SOURCE,
        {
          title: "Sackett, Zhang, Berry & Lievens (2022) — revisited meta-analytic validity estimates",
          url: "https://gwern.net/doc/statistics/meta-analysis/2021-sackett.pdf",
        },
        {
          title: "Callinan & Robertson (2000) — Work sample testing design principles",
          url: "https://psychology.iresearchnet.com/industrial-organizational-psychology/individual-differences/work-samples/",
        },
      ],
      disclaimer: DISCLAIMERS.itarSafeTrial,
    };
  },
};
