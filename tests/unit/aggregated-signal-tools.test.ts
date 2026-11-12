import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn(), getCompany: vi.fn() }));

let testStore: import("@/lib/signal/store").InMemorySignalStore;
vi.mock("@/lib/signal/store", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/signal/store")>();
  return { ...actual, getSignalStore: () => testStore };
});

import { getJob, getCompany } from "@/lib/speedrun/client";
import { InMemorySignalStore, MIN_CONTRIBUTORS, COOLDOWN_MS, getAggregate } from "@/lib/signal/store";
import { contributeAnonymousSignalTool } from "@/lib/tools/contribute-anonymous-signal";
import { getAggregatedSignalTool } from "@/lib/tools/get-aggregated-signal";

beforeEach(() => {
  testStore = new InMemorySignalStore();
  jobsById.clear();
});

// mockImplementation keyed by id (not mockResolvedValue, which sets a
// single persistent default regardless of the id argument passed in) --
// needed so two different job ids registered via two mockJob() calls in
// the same test each resolve by their own id, instead of the later call's
// response silently winning for every subsequent call regardless of which
// id was actually requested.
type MockedJobResponse = Awaited<ReturnType<typeof getJob>>;
const jobsById = new Map<string, MockedJobResponse>();
vi.mocked(getJob).mockImplementation(async (id: string) => {
  const found = jobsById.get(id);
  if (!found) throw new Error(`mockJob() was never called for id "${id}"`);
  return found;
});

function mockJob(id: string, companySlug: string | null = "acme-defense") {
  jobsById.set(id, {
    job: {
      id,
      title: "Autonomy Engineer",
      company: "Acme Defense",
      company_slug: companySlug,
      company_url: "https://x",
      url: "https://x/jobs/" + id,
      location: "Reston, VA",
      remote: false,
      function: "engineering",
      seniority: "mid",
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      comp_period: null,
      published_at: "2026-01-01T00:00:00Z",
      stealth: companySlug === null,
      tier: "a16z",
      status: "open",
      apply: null,
      description_text: "We build things.",
      labels: {},
    },
  });
}

describe("contribute_anonymous_signal", () => {
  it("records a contribution and confirms it, with an output shape that has no field for any candidate identifier", async () => {
    mockJob("job-1");
    const result = await contributeAnonymousSignalTool.handler({
      role_id: "job-1",
      contribution: { clearance_level: "secret" },
    });
    expect(result.recorded).toBe(true);
    // The OutputSchema itself only has recorded/roleTitle/company/sources/
    // disclaimer -- nothing shaped to hold a name, contact info, or any
    // other per-candidate identifier.
    expect(Object.keys(result).sort()).toEqual(["company", "disclaimer", "recorded", "roleTitle", "sources"]);
  });

  // Regression for DECISIONS.md (judging panel round 7, recruiter_user,
  // directly demonstrated): with no accounts, nothing stopped one script
  // from pushing a role's pool from 0 to 10 contributions in under 2
  // seconds. This cooldown directly defeats that exact burst pattern.
  it("rejects a second contribution to the same role within the cooldown window, without throwing an error", async () => {
    mockJob("job-1");
    const first = await contributeAnonymousSignalTool.handler({
      role_id: "job-1",
      contribution: { clearance_level: "secret" },
    });
    expect(first.recorded).toBe(true);

    const second = await contributeAnonymousSignalTool.handler({
      role_id: "job-1",
      contribution: { clearance_level: "secret" },
    });
    expect(second.recorded).toBe(false);
    expect(second.disclaimer).toMatch(/not recorded/i);

    // The rejected attempt must not have been silently counted anyway — read
    // from the store itself, since the tool reports no count below the floor (D-048).
    const agg = await getAggregate(testStore, "role", "job-1");
    expect(agg.totalContributions).toBe(1);
    expect((await getAggregatedSignalTool.handler({ role_id: "job-1" })).totalContributions).toBeNull();
  });

  it("allows a new contribution once the cooldown window has passed", async () => {
    mockJob("job-1");
    await contributeAnonymousSignalTool.handler({ role_id: "job-1", contribution: { clearance_level: "secret" } });

    vi.useFakeTimers();
    try {
      await vi.advanceTimersByTimeAsync(COOLDOWN_MS);
      const afterCooldown = await contributeAnonymousSignalTool.handler({
        role_id: "job-1",
        contribution: { clearance_level: "secret" },
      });
      expect(afterCooldown.recorded).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a different role's cooldown is independent -- contributing to one role never blocks another", async () => {
    mockJob("job-1");
    mockJob("job-2");
    await contributeAnonymousSignalTool.handler({ role_id: "job-1", contribution: { clearance_level: "secret" } });
    const result = await contributeAnonymousSignalTool.handler({
      role_id: "job-2",
      contribution: { clearance_level: "secret" },
    });
    expect(result.recorded).toBe(true);
  });

  it("rejects a call with no buckets at all", () => {
    const parsed = contributeAnonymousSignalTool.inputSchema.safeParse({ role_id: "job-1", contribution: {} });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown contribution key rather than silently dropping it", () => {
    const parsed = contributeAnonymousSignalTool.inputSchema.safeParse({
      role_id: "job-1",
      contribution: { favorite_color: "blue" },
    });
    expect(parsed.success).toBe(false);
  });

  it("notes the role-only scope (no company-wide rollup) for a stealth posting with no company slug", async () => {
    mockJob("stealth-job", null);
    const result = await contributeAnonymousSignalTool.handler({
      role_id: "stealth-job",
      contribution: { clearance_level: "secret" },
    });
    expect(result.disclaimer).toMatch(/stealth listing/i);
  });
});

describe("get_aggregated_signal", () => {
  it("rejects a call with both role_id and company_slug", () => {
    expect(
      getAggregatedSignalTool.inputSchema.safeParse({ role_id: "job-1", company_slug: "acme" }).success,
    ).toBe(false);
  });

  it("rejects a call with neither", () => {
    expect(getAggregatedSignalTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it("reports meetsFloor:false and no percentages before MIN_CONTRIBUTORS", async () => {
    mockJob("job-1");
    await contributeAnonymousSignalTool.handler({ role_id: "job-1", contribution: { clearance_level: "secret" } });

    const result = await getAggregatedSignalTool.handler({ role_id: "job-1" });
    expect(result.meetsFloor).toBe(false);
    expect(result.percentages).toBeNull();
    expect(result.disclaimer).toMatch(/fewer than 5/i);
  });

  it("reports rounded percentages once MIN_CONTRIBUTORS is reached for a role", async () => {
    mockJob("job-1");
    vi.useFakeTimers();
    try {
      for (let i = 0; i < MIN_CONTRIBUTORS; i++) {
        // Each role has a short anti-burst cooldown (D-037/round 7) --
        // advance past it between contributions so this test exercises
        // aggregation, not the cooldown (which has its own dedicated test).
        if (i > 0) await vi.advanceTimersByTimeAsync(COOLDOWN_MS);
        await contributeAnonymousSignalTool.handler({ role_id: "job-1", contribution: { clearance_level: "secret" } });
      }
    } finally {
      vi.useRealTimers();
    }
    const result = await getAggregatedSignalTool.handler({ role_id: "job-1" });
    expect(result.meetsFloor).toBe(true);
    expect(result.percentages?.clearanceLevel).toEqual({ secret: 100 });
    expect(result.scope).toEqual({ type: "role", label: "Autonomy Engineer at Acme Defense" });
  });

  it("aggregates at the company level across multiple roles there", async () => {
    mockJob("job-1", "acme-defense");
    mockJob("job-2", "acme-defense");
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 3; i++) {
        if (i > 0) await vi.advanceTimersByTimeAsync(COOLDOWN_MS);
        await contributeAnonymousSignalTool.handler({ role_id: "job-1", contribution: { clearance_level: "secret" } });
      }
      // A different role_id has its own, independent cooldown bucket, so
      // this one starts fresh without needing to advance time again.
      for (let i = 0; i < 2; i++) {
        if (i > 0) await vi.advanceTimersByTimeAsync(COOLDOWN_MS);
        await contributeAnonymousSignalTool.handler({ role_id: "job-2", contribution: { clearance_level: "secret" } });
      }
    } finally {
      vi.useRealTimers();
    }
    vi.mocked(getCompany).mockResolvedValueOnce({
      company: {
        slug: "acme-defense",
        name: "Acme Defense",
        url: "https://x",
        tier: "a16z",
        cohort: null,
        open_roles: 2,
        location: null,
        industries: [],
        blurb: null,
        logo: null,
        labels: {},
        jobs: [],
      },
    });

    const result = await getAggregatedSignalTool.handler({ company_slug: "acme-defense" });
    expect(result.totalContributions).toBe(5);
    expect(result.meetsFloor).toBe(true);
    expect(result.scope).toEqual({ type: "company", label: "Acme Defense" });
  });

  it("surfaces the non-durable-storage caveat when running on the in-memory fallback", async () => {
    mockJob("job-1");
    const result = await getAggregatedSignalTool.handler({ role_id: "job-1" });
    expect(result.disclaimer).toMatch(/non-durable/i);
  });
});
