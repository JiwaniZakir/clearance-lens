import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));
import { getJob } from "@/lib/speedrun/client";
import { generateInterviewGuideTool } from "@/lib/tools/generate-interview-guide";

const DESCRIPTION = `
ABOUT THE JOB
We build things.

WHAT YOU'LL DO

- Execute manual tests and root-cause issues with developers.
- Develop automated test scripts across the stack.

REQUIRED QUALIFICATIONS

- 5+ years of Python in a production test environment.
- Experience owning a regression suite end to end.
- Comfort debugging embedded or hardware-in-the-loop systems.
- Clear written communication with cross-functional teams.
`;

function mockJob(description = DESCRIPTION) {
  vi.mocked(getJob).mockResolvedValueOnce({
    job: {
      id: "job-1",
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
      description_text: description,
      labels: {},
    },
  });
}

describe("generate_interview_guide", () => {
  it("scales question count by interview length (30→4, 45→6, 60→8)", async () => {
    mockJob();
    expect((await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 30 })).questions).toHaveLength(4);
    mockJob();
    // 4 qualifications + 2 responsibilities = 6 unique bullets available
    expect((await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 45 })).questions).toHaveLength(6);
  });

  it("never invents a question — every one traces verbatim to a bullet in the real posting", async () => {
    mockJob();
    const result = await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 45 });
    for (const q of result.questions) {
      expect(DESCRIPTION).toContain(q.tracedToQuote);
      expect(q.question).toContain(q.tracedToQuote);
    }
  });

  it("prefers qualifications over responsibilities as question seeds (the inverse of build_trial_assessment, deliberately)", async () => {
    mockJob();
    const result = await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 30 });
    expect(result.questions[0].tracedToQuote).toBe("5+ years of Python in a production test environment.");
  });

  it("returns fewer questions rather than inventing filler when the posting is thin", async () => {
    mockJob("REQUIRED QUALIFICATIONS\n\n- Strong Python skills across the stack.\n");
    const result = await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 60 });
    expect(result.questions).toHaveLength(1);
  });

  // The hard constraint this tool exists specifically to respect: a role-side
  // prep artifact, never a candidate evaluation.
  it("has no output field shaped to hold a score, rating, or ranking, and says so explicitly", async () => {
    mockJob();
    const result = await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 30 });
    // neverAScoreNote is the prose disclaimer SAYING there's no score —
    // every other key must not be shaped to hold one.
    const dataKeys = Object.keys(result).filter((k) => k !== "neverAScoreNote");
    expect(JSON.stringify(dataKeys)).not.toMatch(/score|rating|rank/i);
    expect(result.neverAScoreNote).toMatch(/no field anywhere in this output is a score/i);
  });

  it("includes guardrails for the human panel: protected characteristics and ITAR-controlled information", async () => {
    mockJob();
    const result = await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 30 });
    const guardrails = result.guardrailsForThePanel.join(" ");
    expect(guardrails).toMatch(/age/i);
    expect(guardrails).toMatch(/national origin/i);
    expect(guardrails).toMatch(/export-controlled/i);
    expect(guardrails).toMatch(/never scores, ranks, or recommends a hire\/no-hire/i);
  });

  it("cites the structured-interview validity research it relies on", async () => {
    mockJob();
    const result = await generateInterviewGuideTool.handler({ role_id: "job-1", minutes: 30 });
    expect(result.sources.some((s) => s.title.includes("Schmidt & Hunter (1998)"))).toBe(true);
    expect(result.limitsNote).toMatch(/\.51/);
  });

  it("accepts no candidate input at all — the schema has no field for one", () => {
    expect(
      generateInterviewGuideTool.inputSchema.safeParse({ role_id: "job-1", minutes: 30, candidate_name: "x" }).success,
    ).toBe(true); // non-strict: extra keys are stripped, never reach the handler
    const parsed = generateInterviewGuideTool.inputSchema.safeParse({ role_id: "job-1", minutes: 30, candidate_name: "x" });
    expect(parsed.success && "candidate_name" in parsed.data).toBe(false);
  });

  it("rejects an unsupported interview length with a message naming the allowed values", () => {
    const parsed = generateInterviewGuideTool.inputSchema.safeParse({ role_id: "job-1", minutes: 90 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toMatch(/30, 45, or 60/);
  });
});
