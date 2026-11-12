import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({
  searchJobs: vi.fn(),
  getJob: vi.fn(),
}));

import { searchJobs, getJob } from "@/lib/speedrun/client";
import { searchDefenseRolesTool } from "@/lib/tools/search-defense-roles";
import type { SpeedrunJobSummary, SpeedrunJobDetailResponse } from "@/lib/speedrun/types";

function summary(overrides: Partial<SpeedrunJobSummary> = {}): SpeedrunJobSummary {
  return {
    id: "job-1",
    title: "Engineer",
    company: "Acme Defense",
    company_slug: "acme-defense",
    company_url: "https://speedrun-talent-network.com/companies/acme-defense",
    url: "https://speedrun-talent-network.com/jobs/job-1",
    location: "Reston, VA",
    workplace_type: "Onsite",
    employment_type: "FullTime",
    function: "engineering",
    seniority: "mid",
    remote: false,
    comp_min: null,
    comp_max: null,
    comp_currency: null,
    comp_period: null,
    published_at: "2026-01-01T00:00:00Z",
    stealth: false,
    cohort: null,
    tier: "a16z",
    ...overrides,
  };
}

function detail(descriptionText: string, overrides: Partial<SpeedrunJobSummary> = {}): SpeedrunJobDetailResponse {
  return {
    job: {
      ...summary(overrides),
      status: "open",
      apply: null,
      description_text: descriptionText,
      labels: {},
    },
  };
}

describe("search_defense_roles", () => {
  it("scans pages until has_more is false and returns requirement signals per role", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 1,
      page: 0,
      page_size: 50,
      total_pages: 1,
      has_more: false,
      next_page: null,
      jobs: [summary({ id: "job-1" })],
    });
    vi.mocked(getJob).mockResolvedValueOnce(detail("Must be a U.S. Citizen. Active Secret clearance required."));

    const result = await searchDefenseRolesTool.handler({ limit: 10 });
    expect(result.roles).toHaveLength(1);
    expect(result.roles[0].requirementSignals.map((s) => s.value)).toEqual(
      expect.arrayContaining(["us_citizen_required", "secret"]),
    );
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("stops scanning at the page cap even if has_more stays true (the historical 159-of-209 pagination bug this guards against)", async () => {
    vi.mocked(searchJobs).mockImplementation(async ({ page }) => ({
      total: 1000,
      page: page ?? 0,
      page_size: 50,
      total_pages: 20,
      has_more: true,
      next_page: (page ?? 0) + 1,
      jobs: [summary({ id: `job-${page}` })],
    }));
    vi.mocked(getJob).mockImplementation(async (id: string) => detail("No requirements stated.", { id }));

    await searchDefenseRolesTool.handler({ limit: 25 });
    // 4 page fetches (MAX_PAGES_SCANNED), not an unbounded/infinite loop.
    expect(vi.mocked(searchJobs)).toHaveBeenCalledTimes(4);
  });

  it("filters by clearance level using detected signals, not upstream facets (upstream has no clearance param)", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 2,
      page: 0,
      page_size: 50,
      total_pages: 1,
      has_more: false,
      next_page: null,
      jobs: [summary({ id: "secret-job" }), summary({ id: "no-clearance-job" })],
    });
    vi.mocked(getJob).mockImplementation(async (id: string) =>
      id === "secret-job"
        ? detail("Requires an active Secret clearance.", { id })
        : detail("Build dashboards, no clearance needed.", { id }),
    );

    const result = await searchDefenseRolesTool.handler({ clearance: "secret", limit: 10 });
    expect(result.roles.map((r) => r.id)).toEqual(["secret-job"]);
  });

  it("tolerates an individual job-detail fetch failure without failing the whole search", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 2,
      page: 0,
      page_size: 50,
      total_pages: 1,
      has_more: false,
      next_page: null,
      jobs: [summary({ id: "ok-job" }), summary({ id: "broken-job" })],
    });
    vi.mocked(getJob).mockImplementation(async (id: string) => {
      if (id === "broken-job") throw new Error("boom");
      return detail("No requirements stated.", { id });
    });

    const result = await searchDefenseRolesTool.handler({ limit: 10 });
    expect(result.roles.map((r) => r.id)).toEqual(["ok-job"]);
  });
});
