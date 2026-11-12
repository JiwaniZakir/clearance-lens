import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));
import { getJob } from "@/lib/speedrun/client";
import { getRoleRubricTool } from "@/lib/tools/get-role-rubric";
import { readinessBriefTool } from "@/lib/tools/readiness-brief";
import { fitDebriefTool } from "@/lib/tools/fit-debrief";
import { prepareConsentedCardTool } from "@/lib/tools/prepare-consented-card";
import { callTool } from "@/lib/tools/wrap";

function mockJob(descriptionText: string) {
  vi.mocked(getJob).mockResolvedValueOnce({
    job: {
      id: "job-1",
      title: "Engineer",
      company: "Acme Defense",
      company_slug: "acme-defense",
      company_url: "https://x",
      url: "https://speedrun-talent-network.com/jobs/job-1",
      location: null,
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
      description_text: descriptionText,
      labels: {},
    },
  });
}

describe("get_role_rubric", () => {
  it("always sets evaluate_locally: true and instructs the agent not to send private facts back", async () => {
    mockJob("Must be a U.S. Citizen. Active Secret clearance required.");
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    expect(result.evaluate_locally).toBe(true);
    expect(result.instructionsForAgent).toMatch(/do not send|not send/i);
  });

  it("maps detected signals to checklist questions with correct basis labeling", async () => {
    mockJob("Must be a U.S. Citizen. Active Secret clearance required.");
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    const citizenship = result.eligibilityChecklist.find((c) => c.question.includes("U.S. citizen"));
    expect(citizenship?.basis).toBe("stated");
  });

  it("never emits an empty checklist, even for a posting with no detectable signals", async () => {
    mockJob("Write dashboards. No special requirements mentioned.");
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    expect(result.eligibilityChecklist.length).toBeGreaterThan(0);
  });
});

describe("readiness_brief", () => {
  it("marks every template section agentFillsThisIn: true (never fills private info itself)", async () => {
    mockJob("WHAT YOU'LL DO\n\n- Build things.\n\nQUALIFICATIONS\n\n- Know Rust well enough to ship it.");
    const result = await readinessBriefTool.handler({ role_id: "job-1" });
    expect(result.template.eligibility.agentFillsThisIn).toBe(true);
    expect(result.template.gaps.agentFillsThisIn).toBe(true);
    expect(result.template.twoWeekPrepPlan.agentFillsThisIn).toBe(true);
  });

  it("adds a citizenship-confirmation recruiter question whenever a citizenship signal (stated OR inferred) was detected", async () => {
    // Every role here is resolved with industry: "defense_space" hardcoded
    // (role-shared.ts) — so a posting with no explicit citizenship language
    // still gets an INFERRED us_person_likely signal, by design, and the
    // question should still appear. "No citizenship signal at all" isn't a
    // reachable case for a role surfaced through this product.
    mockJob("Must be a U.S. Citizen for this role.");
    const withStated = await readinessBriefTool.handler({ role_id: "job-1" });
    expect(withStated.recruiterQuestions.some((q) => q.includes("citizenship"))).toBe(true);

    mockJob("A posting with no citizenship language at all.");
    const withInferred = await readinessBriefTool.handler({ role_id: "job-1" });
    expect(withInferred.recruiterQuestions.some((q) => q.includes("citizenship/US-person"))).toBe(true);
  });
});

describe("fit_debrief", () => {
  it("never produces a score — only template text and tag labels", async () => {
    mockJob("desc");
    const result = await fitDebriefTool.handler({ role_id: "job-1", loved: ["high_autonomy"], disliked: ["scif_lifestyle"] });
    expect(JSON.stringify(result)).not.toMatch(/\bscore\b\s*:\s*\d/i);
    expect(result.disclaimer).toMatch(/not a score/i);
  });

  it("surfaces an explicit tension note when the same tag is both loved and disliked", async () => {
    mockJob("desc");
    const result = await fitDebriefTool.handler({
      role_id: "job-1",
      loved: ["onsite_culture"],
      disliked: ["onsite_culture"],
    });
    expect(result.summaryTemplate).toMatch(/BOTH loved and disliked/);
  });

  it("only asks company-questions for disliked tags, not loved ones", async () => {
    mockJob("desc");
    const result = await fitDebriefTool.handler({ role_id: "job-1", loved: ["high_autonomy"], disliked: ["itar_process_rigor"] });
    expect(result.questionsToAskTheCompany).toHaveLength(1);
  });

  it("rejects a tag outside the closed vocabulary (no personality/demographic tags possible)", async () => {
    mockJob("desc");
    // .parseAsync's parameter type is `unknown` by design (zod validates
    // arbitrary runtime input), so there's no compile-time error to suppress
    // here — the enforcement is the runtime rejection this asserts.
    await expect(
      fitDebriefTool.inputSchema.parseAsync({ role_id: "job-1", loved: ["extroverted"], disliked: [] }),
    ).rejects.toBeTruthy();
  });
});

describe("prepare_consented_card", () => {
  it("includes ONLY the fields the user explicitly approved — nothing added", async () => {
    mockJob("desc");
    const result = await prepareConsentedCardTool.handler({
      role_id: "job-1",
      fields_user_approved: { headline: "Engineer" },
    });
    expect(result.card.json).toEqual({ headline: "Engineer" });
    expect(result.card.markdown).not.toMatch(/clearance/i);
  });

  it("flags self-reported fields as explicitly not verified, naming FSO verification as the real path", async () => {
    mockJob("desc");
    const result = await prepareConsentedCardTool.handler({
      role_id: "job-1",
      fields_user_approved: { clearance_status_self_reported: "Active Secret" },
    });
    expect(result.notVerifiedNote).toMatch(/not verified/i);
    expect(result.notVerifiedNote).toMatch(/FSO/);
  });

  it("never auto-submits — applyLink only ever points at the role's own listing", async () => {
    mockJob("desc");
    const result = await prepareConsentedCardTool.handler({
      role_id: "job-1",
      fields_user_approved: {},
    });
    expect(result.applyLink?.url).toBe("https://speedrun-talent-network.com/jobs/job-1");
    expect(result.disclaimer).toMatch(/never submits/i);
  });

  it("rejects an unrecognized field at the schema level rather than silently dropping it", async () => {
    await expect(
      prepareConsentedCardTool.inputSchema.parseAsync({
        role_id: "job-1",
        fields_user_approved: { not_a_real_field: "x" },
      }),
    ).rejects.toBeTruthy();
  });
});

describe("prepare_consented_card — cross-field PII evasion (BLOCKERS.md B-001)", () => {
  it("catches an SSN deliberately split across two sibling fields", async () => {
    mockJob("desc");
    const result = await callTool(prepareConsentedCardTool, {
      role_id: "job-1",
      fields_user_approved: { headline: "call me at 123-45", notes: "6789 thanks" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("pii_cui_rejected");
  });

  it("does not flag ordinary, unrelated field values that merely concatenate into something SSN-shaped only under forced adjacency it would never otherwise see", async () => {
    mockJob("desc");
    // headline/notes are the two fields actually joined; an ordinary
    // headline and an ordinary availability note must still pass.
    const result = await callTool(prepareConsentedCardTool, {
      role_id: "job-1",
      fields_user_approved: { headline: "Senior SDET", availability: "Available in 2 weeks" },
    });
    expect(result.ok).toBe(true);
  });
});
