import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));
import { getJob } from "@/lib/speedrun/client";
import { runJobPreviewTool } from "@/lib/tools/run-job-preview";
import { JOB_PREVIEW_SCENES, SHORT_VERSION_SCENE_COUNT } from "@/data/job-preview-scenes";

function mockJob() {
  vi.mocked(getJob).mockResolvedValueOnce({
    job: {
      id: "job-1",
      title: "Engineer",
      company: "Acme Defense",
      company_slug: "acme-defense",
      company_url: "https://x",
      url: "https://x",
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
      description_text: "No requirements stated.",
      labels: {},
    },
  });
}

describe("run_job_preview", () => {
  it("returns exactly the short-version scene count at minutes=20, and all 6 at minutes=30", async () => {
    mockJob();
    const short = await runJobPreviewTool.handler({ role_id: "job-1", minutes: 20 });
    expect(short.scenes).toHaveLength(SHORT_VERSION_SCENE_COUNT);

    mockJob();
    const full = await runJobPreviewTool.handler({ role_id: "job-1", minutes: 30 });
    expect(full.scenes).toHaveLength(JOB_PREVIEW_SCENES.length);
  });

  it("includes the ITAR moment scene in both versions, flagged as requiring a stated rationale", async () => {
    mockJob();
    const short = await runJobPreviewTool.handler({ role_id: "job-1", minutes: 20 });
    const itarScene = short.scenes.find((s) => s.id === "itar_moment");
    expect(itarScene).toBeDefined();
    expect(itarScene!.requiresStatedRationale).toBe(true);
  });

  it("never pre-reveals outcomes alongside choice labels (instructs the agent to withhold them until after the user picks)", async () => {
    mockJob();
    const result = await runJobPreviewTool.handler({ role_id: "job-1", minutes: 30 });
    expect(result.instructionsForAgent).toMatch(/withhold/i);
    for (const scene of result.scenes) {
      for (const choice of scene.choices) {
        // The choice label itself must not leak its own consequence text.
        expect(choice).not.toHaveProperty("whatRealTeamsReport");
      }
      expect(Object.keys(scene.whatRealTeamsReportByChoice).sort()).toEqual(
        scene.choices.map((c) => c.id).sort(),
      );
    }
  });

  it("every scene has at least 2 differentiated choices (never a disguised single-path quiz)", () => {
    for (const scene of JOB_PREVIEW_SCENES) {
      expect(scene.choices.length).toBeGreaterThanOrEqual(2);
      const consequences = scene.choices.map((c) => c.whatRealTeamsReport);
      expect(new Set(consequences).size).toBe(consequences.length);
    }
  });

  it("every scene's debrief includes an honesty-check prompt (the one evidence-backed mediator, R5 §A2/§C4)", () => {
    for (const scene of JOB_PREVIEW_SCENES) {
      expect(scene.debriefPrompts.some((p) => /honest/i.test(p))).toBe(true);
    }
  });

  it("describes a polygraph but never simulates one", async () => {
    mockJob();
    const result = await runJobPreviewTool.handler({ role_id: "job-1", minutes: 30 });
    expect(result.polygraphNote).toMatch(/never simulates/i);
  });
});
