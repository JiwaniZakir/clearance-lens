import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));
import { getJob } from "@/lib/speedrun/client";
import { prepareConsentedCardTool } from "@/lib/tools/prepare-consented-card";

function mockJob(id: string, overrides: Partial<{ title: string; company: string; url: string }> = {}) {
  vi.mocked(getJob).mockResolvedValueOnce({
    job: {
      id,
      title: overrides.title ?? "Autonomy Engineer",
      company: overrides.company ?? "Acme Defense",
      company_slug: "acme-defense",
      company_url: "https://x",
      url: overrides.url ?? "https://x/jobs/" + id,
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
      description_text: "We build things.",
      labels: {},
    },
  });
}

describe("prepare_consented_card", () => {
  it("builds a card from only the fields explicitly approved", async () => {
    mockJob("job-1");
    const result = await prepareConsentedCardTool.handler({
      role_id: "job-1",
      fields_user_approved: { headline: "ML engineer, 5 YOE" },
    });
    expect(result.card.markdown).toContain("ML engineer, 5 YOE");
    expect(result.card.json).toEqual({ headline: "ML engineer, 5 YOE" });
  });

  it("flags self-reported fields as unverified, naming the FSO as the only real verification path", async () => {
    mockJob("job-1");
    const result = await prepareConsentedCardTool.handler({
      role_id: "job-1",
      fields_user_approved: { clearance_status_self_reported: "Active Secret" },
    });
    expect(result.notVerifiedNote).toMatch(/self-reported/i);
    expect(result.notVerifiedNote).toMatch(/Facility Security Officer/i);
  });

  it("never submits anything on the candidate's behalf — only ever links to the role's own apply page", async () => {
    mockJob("job-1", { url: "https://speedrun-talent-network.com/jobs/job-1" });
    const result = await prepareConsentedCardTool.handler({
      role_id: "job-1",
      fields_user_approved: { headline: "x" },
    });
    expect(result.applyLink?.url).toBe("https://speedrun-talent-network.com/jobs/job-1");
    expect(result.disclaimer.toLowerCase()).toContain("never submit");
  });

  it("rejects an unknown field key rather than silently dropping it (this tool's own .strict(), unlike most others)", () => {
    const parsed = prepareConsentedCardTool.inputSchema.safeParse({
      role_id: "job-1",
      fields_user_approved: { not_a_real_field: "x" },
    });
    expect(parsed.success).toBe(false);
  });

  // Regression for DECISIONS.md D-034: confirming the v2 "per-company
  // re-consent" model needs no new code, because this tool was never
  // capable of persisting consent across calls in the first place.
  describe("no persistence across calls (D-034 — this IS the 'per-company re-consent' model)", () => {
    it("rejects a call missing fields_user_approved — there is no implicit carry-over from a prior call", () => {
      const parsed = prepareConsentedCardTool.inputSchema.safeParse({ role_id: "job-1" });
      expect(parsed.success).toBe(false);
    });

    it("two calls for two different roles are fully independent — approving fields for one role never leaks into a card for another", async () => {
      mockJob("job-1", { company: "Acme Defense" });
      const first = await prepareConsentedCardTool.handler({
        role_id: "job-1",
        fields_user_approved: { headline: "Backend engineer", notes: "Prefers remote" },
      });
      expect(first.card.markdown).toContain("Backend engineer");

      mockJob("job-2", { company: "Other Co" });
      const second = await prepareConsentedCardTool.handler({
        role_id: "job-2",
        fields_user_approved: { headline: "Frontend engineer" },
      });
      // The second call never approved "notes" at all -- if consent were
      // somehow cached by a prior call, this would leak "Prefers remote"
      // into a card for a company the candidate never consented to share
      // that with.
      expect(second.card.markdown).not.toContain("Prefers remote");
      expect(second.card.json).toEqual({ headline: "Frontend engineer" });
      expect(second.company).toBe("Other Co");
    });
  });
});
