import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getCompany: vi.fn() }));

import { getCompany } from "@/lib/speedrun/client";
import { getCompanyProfileTool } from "@/lib/tools/get-company-profile";

function company(jobs: Array<Partial<Record<string, unknown>>>, openRoles?: number) {
  return {
    company: {
      slug: "acme-defense",
      name: "Acme Defense",
      url: "https://speedrun-talent-network.com/companies/acme-defense",
      tier: "a16z",
      cohort: null,
      open_roles: openRoles ?? jobs.length,
      location: "Reston, VA",
      industries: ["Defense & Space"],
      blurb: "Builds things.",
      logo: null,
      labels: { stage: "growth", size: "201-500", business_model: "hardware" },
      jobs: jobs.map((j, i) => ({
        id: `job-${i}`,
        title: "Engineer",
        url: "https://x",
        location: "Reston, VA",
        workplace_type: "Onsite",
        employment_type: "FullTime",
        comp_summary: null,
        comp_min: null,
        comp_max: null,
        comp_period: null,
        published_at: "2026-01-01T00:00:00Z",
        ...j,
      })),
    },
  };
}

describe("get_company_profile", () => {
  it("returns gaps and an empty criteria array for a company with no curated criteria (the default, honest state)", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(company([{}]));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.criteria).toEqual([]);
    expect(result.gaps.some((g) => g.includes("not independently sourced"))).toBe(true);
  });

  it("correctly reports isFullRoster when the job sample matches open_roles exactly", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(company([{}, {}], 2));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.isFullRoster).toBe(true);
    expect(result.gaps.some((g) => g.includes("reflect all"))).toBe(true);
  });

  it("correctly reports a partial sample when open_roles exceeds the returned job list", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(company([{}, {}], 500));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.isFullRoster).toBe(false);
    expect(result.gaps.some((g) => g.includes("sample of 2 of this company's 500"))).toBe(true);
  });

  it("caps topLocations and still reports the true unique count", async () => {
    const jobs = Array.from({ length: 20 }, (_, i) => ({ location: `City ${i}` }));
    vi.mocked(getCompany).mockResolvedValueOnce(company(jobs));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.topLocations.length).toBeLessThanOrEqual(8);
    expect(result.workRealities.uniqueLocationCount).toBe(20);
  });

  it("never fabricates a compRangeObserved when no job has comp data", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(company([{ comp_min: null, comp_max: null }]));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.compRangeObserved).toBeNull();
  });
});
