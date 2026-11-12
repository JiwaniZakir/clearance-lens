import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));

import { getJob } from "@/lib/speedrun/client";
import { getRoleRubricTool } from "@/lib/tools/get-role-rubric";
import type { SpeedrunJobDetailResponse } from "@/lib/speedrun/types";

function detail(descriptionText: string): SpeedrunJobDetailResponse {
  return {
    job: {
      id: "job-1",
      title: "Senior Engineer",
      company: "Acme Defense",
      company_slug: "acme-defense",
      company_url: "https://speedrun-talent-network.com/companies/acme-defense",
      url: "https://speedrun-talent-network.com/jobs/job-1",
      location: "Reston, VA",
      workplace_type: "Onsite",
      employment_type: "FullTime",
      function: "engineering",
      seniority: "senior",
      remote: false,
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
  };
}

describe("get_role_rubric", () => {
  it("builds an eligibility checklist and skills rubric from a real posting, with no overall score", async () => {
    vi.mocked(getJob).mockResolvedValueOnce(
      detail("Must hold an active Secret clearance.\n\nQualifications:\n- 5+ years of systems engineering"),
    );
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    expect(result.eligibilityChecklist.length).toBeGreaterThan(0);
    expect(result.skillsRubric.length).toBeGreaterThan(0);
    expect(result.evaluate_locally).toBe(true);
    expect(result.disclaimer.toLowerCase()).toMatch(/not a score|never a score/);
  });

  // Regression for DECISIONS.md (judging panel round 5): two distinct
  // signals (here, "secret" and "ts" from two separate, legitimate
  // requirement sentences) both map to the same rule (sead4), so its 3
  // sources were pushed into the array twice -- once per signal -- with no
  // final deduplication.
  it("does not list the same source twice when two signals map to the same underlying rule", async () => {
    vi.mocked(getJob).mockResolvedValueOnce(
      detail("Must hold an active Secret clearance. A Top Secret clearance is strongly preferred."),
    );
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    const urls = result.sources.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("falls back to a generic eligibility question when no requirement signal is detected", async () => {
    vi.mocked(getJob).mockResolvedValueOnce(detail("You'll write Python and ship features weekly."));
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    expect(result.eligibilityChecklist).toHaveLength(1);
    expect(result.eligibilityChecklist[0].basis).toBe("inferred");
  });

  it("always includes the speedrun provenance source, even with no requirement signals", async () => {
    vi.mocked(getJob).mockResolvedValueOnce(detail("No requirements stated."));
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    expect(result.sources.some((s) => s.url === "https://speedrun-talent-network.com")).toBe(true);
  });
});
