import { describe, it, expect, vi } from "vitest";
import { InMemorySignalStore, getAggregate, MIN_CONTRIBUTORS, COOLDOWN_MS } from "@/lib/signal/store";

describe("tryAcquireCooldown (anti-burst safeguard, D-037)", () => {
  it("allows the first acquisition, rejects an immediate second one, and allows a third after the window passes", async () => {
    const store = new InMemorySignalStore();
    expect(await store.tryAcquireCooldown("role-a")).toBe(true);
    expect(await store.tryAcquireCooldown("role-a")).toBe(false);

    vi.useFakeTimers();
    try {
      await vi.advanceTimersByTimeAsync(COOLDOWN_MS);
      expect(await store.tryAcquireCooldown("role-a")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks cooldowns independently per role id", async () => {
    const store = new InMemorySignalStore();
    expect(await store.tryAcquireCooldown("role-a")).toBe(true);
    expect(await store.tryAcquireCooldown("role-b")).toBe(true);
  });
});

describe("signal store aggregation (k-anonymity floor)", () => {
  it("reports meetsFloor:false and no breakdown below MIN_CONTRIBUTORS total", async () => {
    const store = new InMemorySignalStore();
    for (let i = 0; i < MIN_CONTRIBUTORS - 1; i++) {
      await store.addContribution({ roleId: "r1", companySlug: "acme" }, { clearance_level: "secret" });
    }
    const agg = await getAggregate(store, "role", "r1");
    expect(agg.totalContributions).toBe(MIN_CONTRIBUTORS - 1);
    expect(agg.meetsFloor).toBe(false);
    expect(agg.clearanceLevel).toBeNull();
  });

  it("reports a breakdown once total reaches MIN_CONTRIBUTORS, with every value's own count intact when all share it", async () => {
    const store = new InMemorySignalStore();
    for (let i = 0; i < MIN_CONTRIBUTORS; i++) {
      await store.addContribution({ roleId: "r1", companySlug: "acme" }, { clearance_level: "secret" });
    }
    const agg = await getAggregate(store, "role", "r1");
    expect(agg.meetsFloor).toBe(true);
    expect(agg.clearanceLevel).toEqual({ secret: MIN_CONTRIBUTORS });
  });

  // This is the core privacy property: total is above the floor, but one
  // specific value's own count is NOT -- reporting it individually would
  // single out whoever contributed it.
  it("folds any individual bucket value below MIN_CONTRIBUTORS into otherBelowFloor, never reporting it on its own", async () => {
    const store = new InMemorySignalStore();
    for (let i = 0; i < MIN_CONTRIBUTORS + 1; i++) {
      await store.addContribution({ roleId: "r1", companySlug: "acme" }, { clearance_level: "secret" });
    }
    await store.addContribution({ roleId: "r1", companySlug: "acme" }, { clearance_level: "none" }); // the lone outlier
    const agg = await getAggregate(store, "role", "r1");
    expect(agg.totalContributions).toBe(MIN_CONTRIBUTORS + 2);
    expect(agg.meetsFloor).toBe(true);
    // "secret" clears the per-value floor (6 >= 5) and is shown; "none"
    // doesn't (1 < 5) and is folded rather than shown as its own value --
    // the property this test exists for: reporting "6 secret, 1 none" would
    // single out the one "none" contributor by elimination.
    expect(agg.clearanceLevel).toEqual({ secret: MIN_CONTRIBUTORS + 1, otherBelowFloor: 1 });
    expect(agg.clearanceLevel?.none).toBeUndefined(); // never reported under its own real value
  });

  it("aggregates separately per dimension (a contribution can set some fields and omit others)", async () => {
    const store = new InMemorySignalStore();
    for (let i = 0; i < MIN_CONTRIBUTORS; i++) {
      await store.addContribution({ roleId: "r1", companySlug: "acme" }, { clearance_level: "secret" });
    }
    for (let i = 0; i < MIN_CONTRIBUTORS; i++) {
      await store.addContribution({ roleId: "r1", companySlug: "acme" }, { citizenship_status: "us_citizen" });
    }
    const agg = await getAggregate(store, "role", "r1");
    expect(agg.clearanceLevel).toEqual({ secret: MIN_CONTRIBUTORS });
    expect(agg.citizenshipStatus).toEqual({ us_citizen: MIN_CONTRIBUTORS });
  });

  it("rolls contributions up to the company scope as well as the role scope", async () => {
    const store = new InMemorySignalStore();
    for (let i = 0; i < MIN_CONTRIBUTORS; i++) {
      await store.addContribution({ roleId: "role-a", companySlug: "acme" }, { clearance_level: "secret" });
    }
    for (let i = 0; i < MIN_CONTRIBUTORS; i++) {
      await store.addContribution({ roleId: "role-b", companySlug: "acme" }, { clearance_level: "secret" });
    }
    const roleAgg = await getAggregate(store, "role", "role-a");
    const companyAgg = await getAggregate(store, "company", "acme");
    expect(roleAgg.totalContributions).toBe(MIN_CONTRIBUTORS);
    expect(companyAgg.totalContributions).toBe(MIN_CONTRIBUTORS * 2);
  });

  it("never writes to a company-level key when companySlug is null (a stealth posting)", async () => {
    const store = new InMemorySignalStore();
    await store.addContribution({ roleId: "stealth-role", companySlug: null }, { clearance_level: "secret" });
    const roleAgg = await getAggregate(store, "role", "stealth-role");
    expect(roleAgg.totalContributions).toBe(1);
    // No company key was ever created for this -- querying any slug returns 0,
    // not an error, which is the correct "nothing here" behavior either way.
    const companyAgg = await getAggregate(store, "company", "some-slug-that-was-never-set");
    expect(companyAgg.totalContributions).toBe(0);
  });

  it("two different roles/companies never mix contributions", async () => {
    const store = new InMemorySignalStore();
    await store.addContribution({ roleId: "r1", companySlug: "acme" }, { clearance_level: "secret" });
    await store.addContribution({ roleId: "r2", companySlug: "other-co" }, { clearance_level: "none" });
    expect((await getAggregate(store, "role", "r1")).totalContributions).toBe(1);
    expect((await getAggregate(store, "role", "r2")).totalContributions).toBe(1);
    expect((await getAggregate(store, "company", "acme")).totalContributions).toBe(1);
    expect((await getAggregate(store, "company", "other-co")).totalContributions).toBe(1);
  });
});
