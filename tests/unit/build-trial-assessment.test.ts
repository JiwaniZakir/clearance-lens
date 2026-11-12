import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));
import { getJob } from "@/lib/speedrun/client";
import { buildTrialAssessmentTool } from "@/lib/tools/build-trial-assessment";

const DESCRIPTION = `
ABOUT THE JOB
We build things.

WHAT YOU'LL DO

- Execute manual tests and root-cause issues with developers.
- Develop automated test scripts across the stack.
- Maintain the regression suite and nightly runs.
- Convert manual cases into automated coverage.
- Drive defects through to resolution.

REQUIRED QUALIFICATIONS

- Strong Python skills.
`;

function mockJob(id = "job-1") {
  vi.mocked(getJob).mockResolvedValueOnce({
    job: {
      id,
      title: "SDET",
      company: "Acme Defense",
      company_slug: "acme-defense",
      company_url: "https://x",
      url: "https://x",
      location: "Reston, VA",
      remote: false,
      function: "engineering",
      seniority: "mid",
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      comp_period: null,
      published_at: "2026-01-01T00:00:00Z",
      stealth: false,
      tier: "a16z",
      status: "open",
      apply: null,
      description_text: DESCRIPTION,
      labels: {},
    },
  });
}

describe("build_trial_assessment", () => {
  it("scales rubric size by time box per research/R5 §B4 (60→3, 90→5, 180→6)", async () => {
    mockJob();
    const r60 = await buildTrialAssessmentTool.handler({ role_id: "job-1", minutes: 60 });
    expect(r60.rubric).toHaveLength(3);

    mockJob();
    const r90 = await buildTrialAssessmentTool.handler({ role_id: "job-1", minutes: 90 });
    expect(r90.rubric).toHaveLength(5);

    mockJob();
    const r180 = await buildTrialAssessmentTool.handler({ role_id: "job-1", minutes: 180 });
    // scope.rubricCount is 6 for 180min; the fixture has only 5 responsibility
    // bullets, so the handler's documented fallback tops up from qualification
    // bullets (1 available) to reach 6 content criteria, THEN always appends
    // the "next steps / riskiest unknowns" criterion on top of that at 180min.
    expect(r180.rubric).toHaveLength(7);
    expect(r180.rubric.at(-1)?.criterion).toMatch(/next-steps/i);
  });

  it("every rubric criterion traces to a verbatim quote from the posting (never fabricated)", async () => {
    mockJob();
    const result = await buildTrialAssessmentTool.handler({ role_id: "job-1", minutes: 60 });
    for (const criterion of result.rubric) {
      if (criterion.tracedToQuote.startsWith("(scope-level")) continue;
      expect(DESCRIPTION).toContain(criterion.tracedToQuote);
    }
  });

  it("never requests or produces export-controlled technical content, and says so explicitly", async () => {
    mockJob();
    const result = await buildTrialAssessmentTool.handler({ role_id: "job-1", minutes: 90 });
    expect(result.brief).toMatch(/export-controlled/i);
    expect(result.itarSafetyNote.length).toBeGreaterThan(0);
  });

  it("falls back gracefully when a posting has fewer bullets than the rubric size calls for", async () => {
    vi.mocked(getJob).mockResolvedValueOnce({
      job: {
        id: "thin-job",
        title: "Role",
        company: "Co",
        company_slug: "co",
        company_url: "https://x",
        url: "https://x",
        location: null,
        remote: false,
        function: "engineering",
        seniority: null,
        comp_min: null,
        comp_max: null,
        comp_currency: null,
        comp_period: null,
        published_at: "2026-01-01T00:00:00Z",
        stealth: false,
        tier: "a16z",
        status: "open",
        apply: null,
        description_text: "A short posting with no bullets at all.",
        labels: {},
      },
    });
    const result = await buildTrialAssessmentTool.handler({ role_id: "thin-job", minutes: 180 });
    // Still returns a valid (possibly shorter) rubric rather than throwing.
    expect(result.rubric.length).toBeGreaterThan(0);
  });

  // Regression for DECISIONS.md (judging panel round 4): an invalid
  // `minutes` value produced a bare "Invalid input" with no indication of
  // what values ARE valid, unlike this product's string-enum fields
  // elsewhere, which name their allowed options.
  it("names the allowed values when minutes is invalid", () => {
    const result = buildTrialAssessmentTool.inputSchema.safeParse({ role_id: "job-1", minutes: 45 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /60, 90, or 180/.test(i.message))).toBe(true);
    }
  });
});
