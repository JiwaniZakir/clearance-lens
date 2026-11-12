import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));
import { getJob } from "@/lib/speedrun/client";
import { prepareConsentedCardTool } from "@/lib/tools/prepare-consented-card";
import { callTool } from "@/lib/tools/wrap";

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
  // D-047: the card is a template the user's own agent fills in locally — the
  // server receives field NAMES only, so it never sees (or echoes) a value.
  it("returns a template with a placeholder for exactly the approved fields, in a fixed order", async () => {
    mockJob("job-1");
    const result = await prepareConsentedCardTool.handler({ role_id: "job-1", approved_fields: ["notes", "headline"] });
    expect(result.cardTemplate.fields.map((f) => f.name)).toEqual(["headline", "notes"]);
    expect(result.cardTemplate.markdown).toContain("**Headline:** {{headline}}");
    expect(result.cardTemplate.markdown).toContain("**Notes:** {{notes}}");
    expect(result.cardTemplate.markdown).not.toContain("{{availability}}");
    expect(result.evaluate_locally).toBe(true);
    expect(result.instructionsForAgent).toMatch(/Never send the filled-in values back/);
  });

  it("tells the agent what never belongs on a card — IDs, DOB, address, and protected characteristics", async () => {
    mockJob("job-1");
    const result = await prepareConsentedCardTool.handler({ role_id: "job-1", approved_fields: ["notes"] });
    for (const term of [/SSN/, /date of birth/, /home address/, /religion/, /disability/, /national origin/, /age/]) {
      expect(result.cardTemplate.neverInclude).toMatch(term);
    }
  });

  it("rejects the old contract's field values, pointing to the new one — the values are never echoed", async () => {
    const r = await callTool(prepareConsentedCardTool, { role_id: "job-1", fields_user_approved: { headline: "ML engineer, 5 YOE" } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("invalid_input");
      expect(r.error.message).toMatch(/no longer takes field values/);
      expect(JSON.stringify(r)).not.toContain("ML engineer, 5 YOE");
    }
  });

  it("rejects an unknown field name", () => {
    const parsed = prepareConsentedCardTool.inputSchema.safeParse({ role_id: "job-1", approved_fields: ["not_a_real_field"] });
    expect(parsed.success).toBe(false);
  });

  it("flags self-reported fields as unverified, naming the FSO as the only real verification path", async () => {
    mockJob("job-1");
    const result = await prepareConsentedCardTool.handler({ role_id: "job-1", approved_fields: ["clearance_status_self_reported"] });
    expect(result.notVerifiedNote).toMatch(/self-reported/i);
    expect(result.notVerifiedNote).toMatch(/Facility Security Officer/i);
  });

  it("never submits anything on the candidate's behalf — only ever links to the role's own apply page", async () => {
    mockJob("job-1", { url: "https://speedrun-talent-network.com/jobs/job-1" });
    const result = await prepareConsentedCardTool.handler({ role_id: "job-1", approved_fields: ["headline"] });
    expect(result.applyLink?.url).toBe("https://speedrun-talent-network.com/jobs/job-1");
    expect(result.disclaimer.toLowerCase()).toContain("never submit");
  });

  // Regression for DECISIONS.md D-034 (per-company re-consent): nothing
  // carries over between calls.
  describe("no persistence across calls (D-034)", () => {
    it("rejects a call with no approved_fields — there is no implicit carry-over from a prior call", () => {
      const parsed = prepareConsentedCardTool.inputSchema.safeParse({ role_id: "job-1" });
      expect(parsed.success).toBe(false);
    });

    it("two calls for two roles are independent — fields approved for one never appear in the other's template", async () => {
      mockJob("job-1", { company: "Acme Defense" });
      const first = await prepareConsentedCardTool.handler({ role_id: "job-1", approved_fields: ["headline", "notes"] });
      expect(first.cardTemplate.markdown).toContain("{{notes}}");
      mockJob("job-2", { company: "Other Co" });
      const second = await prepareConsentedCardTool.handler({ role_id: "job-2", approved_fields: ["headline"] });
      expect(second.cardTemplate.markdown).not.toContain("{{notes}}");
      expect(second.company).toBe("Other Co");
    });
  });
});
