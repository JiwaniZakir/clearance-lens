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
    tier: "a16z",
    cohort: null,
    ...overrides,
  };
}

function detail(descriptionText: string, overrides: Partial<SpeedrunJobSummary> = {}): SpeedrunJobDetailResponse {
  // SpeedrunJobDetail genuinely has no `cohort` field (see lib/speedrun/types.ts) —
  // omit it explicitly when spreading from summary(), which does have one.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarded on purpose
  const { cohort: _cohort, ...summaryWithoutCohort } = summary(overrides);
  return {
    job: {
      ...summaryWithoutCohort,
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

  // Regression for DECISIONS.md (judging panel round 3): up to 4 sequential
  // page fetches, each with its own retry/backoff budget, could compound to
  // a 20+ second worst case on a transient upstream slowdown (reproduced
  // live: 22.4s and 11.0s outliers against a sub-400ms baseline). A deadline
  // on the page-scan loop bounds this.
  it("stops scanning early and notes it when the upstream responds too slowly (deadline guard)", async () => {
    let callCount = 0;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      callCount++;
      // Call 1 computes the deadline (returns 0 -> deadline = 8000ms). Every
      // call after that simulates 5 seconds having passed since the
      // previous page fetch, so the loop's 2nd deadline check (10000ms) is
      // already past it.
      return callCount === 1 ? 0 : (callCount - 1) * 5000;
    });
    try {
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

      const result = await searchDefenseRolesTool.handler({ limit: 25 });
      expect(vi.mocked(searchJobs)).toHaveBeenCalledTimes(1);
      expect(result.note).toContain("responded slowly");
    } finally {
      dateNowSpy.mockRestore();
    }
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

  it("a zero-result query gets actionable broadening guidance, not a bare empty list (regression for DECISIONS.md D-016 — a real company name routinely returns zero hits with no explanation)", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 0,
      page: 0,
      page_size: 50,
      total_pages: 0,
      has_more: false,
      next_page: null,
      jobs: [],
    });

    const result = await searchDefenseRolesTool.handler({ query: "Shield AI", limit: 10 });
    expect(result.roles).toEqual([]);
    expect(result.note).toContain('the keyword "Shield AI"');
    expect(result.note.toLowerCase()).toContain("role type");
    expect(result.note).toContain("get_company_profile");
  });

  // Regression for DECISIONS.md (judging panel round 1): a location-only
  // zero-result used to be blamed on the keyword (e.g. "No postings
  // matched \"engineer\"") even when the keyword was never the actual
  // cause — reproduced live: filtering on a state name like "Texas"
  // zeroes results while the identical keyword alone returns plenty.
  it("a zero-result caused by location alone blames the location, not an absent or unrelated keyword", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 0,
      page: 0,
      page_size: 50,
      total_pages: 0,
      has_more: false,
      next_page: null,
      jobs: [],
    });

    const result = await searchDefenseRolesTool.handler({ location: "Texas", limit: 10 });
    expect(result.note).toContain('the location filter "Texas"');
    expect(result.note).not.toContain("the keyword");
    expect(result.note.toLowerCase()).toContain("exact city string");
  });

  it("a zero-result with BOTH a keyword and a location names both as possible causes, rather than confidently blaming just one", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 0,
      page: 0,
      page_size: 50,
      total_pages: 0,
      has_more: false,
      next_page: null,
      jobs: [],
    });

    const result = await searchDefenseRolesTool.handler({ query: "engineer", location: "Texas", limit: 10 });
    expect(result.note).toContain('the keyword "engineer"');
    expect(result.note).toContain('the location filter "Texas"');
    expect(result.note.toLowerCase()).toContain("one filter at a time");
  });

  it("results that exist but are all filtered out by clearance/itar_only get their own distinct guidance (not the zero-match message)", async () => {
    vi.mocked(searchJobs).mockResolvedValueOnce({
      total: 1,
      page: 0,
      page_size: 50,
      total_pages: 1,
      has_more: false,
      next_page: null,
      jobs: [summary({ id: "no-clearance-job" })],
    });
    vi.mocked(getJob).mockResolvedValueOnce(detail("Build dashboards, no clearance needed.", { id: "no-clearance-job" }));

    const result = await searchDefenseRolesTool.handler({ clearance: "ts_sci", limit: 10 });
    expect(result.roles).toEqual([]);
    expect(result.note).not.toContain("No postings matched");
    expect(result.note.toLowerCase()).toContain("loosening or removing it");
  });
});
