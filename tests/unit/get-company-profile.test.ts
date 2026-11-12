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

  // Regression for DECISIONS.md D-016/D-017: a naive min/max across
  // different comp_period values produced an absurd range (observed live:
  // an hourly intern rate mixed with annual senior-engineer salaries into
  // one "$19-$303,600"-style figure). Reproduced live against the real feed
  // on 2026-11-11 with exactly this hour/week/year/null mix.
  it("annualizes hourly and weekly comp before computing the range, instead of mixing raw units", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(
      company([
        { comp_min: 29, comp_max: 29, comp_period: "hour" }, // 29 * 2080 = 60,320
        { comp_min: 1925, comp_max: 1925, comp_period: "week" }, // 1925 * 52 = 100,100
        { comp_min: 200000, comp_max: 270000, comp_period: null }, // already annual
        { comp_min: 130000, comp_max: 185000, comp_period: "year" }, // explicit annual
      ]),
    );
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.compRangeObserved).toEqual({ min: 60320, max: 270000, currency: null });
  });

  it("excludes a job with an unrecognized comp_period rather than guessing, and surfaces the exclusion in gaps", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(
      company([
        { comp_min: 100000, comp_max: 150000, comp_period: null },
        { comp_min: 999, comp_max: 999, comp_period: "fortnight" }, // not a unit this project has confirmed live
      ]),
    );
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.compRangeObserved).toEqual({ min: 100000, max: 150000, currency: null });
    expect(result.gaps.some((g) => g.includes("1 role(s)") && g.toLowerCase().includes("pay period"))).toBe(true);
  });

  it("covers both bounds when a job states only one of comp_min/comp_max under a non-annual period", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(company([{ comp_min: 40, comp_max: null, comp_period: "hour" }]));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    // 40 * 2080 = 83,200 on both ends — a one-sided input must not silently
    // narrow the overall range to a single unbounded side.
    expect(result.workRealities.compRangeObserved).toEqual({ min: 83200, max: 83200, currency: null });
  });

  it("currency is always null — the company-jobs endpoint has no currency field, so this isn't a fabricated value", async () => {
    vi.mocked(getCompany).mockResolvedValueOnce(company([{ comp_min: 100000, comp_max: 150000 }]));
    const result = await getCompanyProfileTool.handler({ company_slug: "acme-defense" });
    expect(result.workRealities.compRangeObserved?.currency).toBeNull();
  });
});
