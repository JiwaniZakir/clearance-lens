import { describe, it, expect } from "vitest";
import { matchesClearanceFilter, looksItarRestricted } from "@/lib/tools/role-shared";
import type { RequirementSignal } from "@/lib/speedrun/infer";

function signal(kind: RequirementSignal["kind"], value: string): RequirementSignal {
  return { kind, value, basis: "stated", evidence: "test evidence" };
}

describe("matchesClearanceFilter", () => {
  it("matches a specific stated level directly", () => {
    expect(matchesClearanceFilter([signal("clearance_level", "secret")], "secret")).toBe(true);
    expect(matchesClearanceFilter([signal("clearance_level", "ts")], "secret")).toBe(false);
  });

  it("'none' matches only when no clearance_level signal is present at all", () => {
    expect(matchesClearanceFilter([], "none")).toBe(true);
    expect(matchesClearanceFilter([signal("clearance_level", "secret")], "none")).toBe(false);
  });

  it("the generic unspecified fallback matches 'secret' for a US-located role", () => {
    expect(
      matchesClearanceFilter([signal("clearance_level", "clearance_required_unspecified")], "secret", "Austin, TX"),
    ).toBe(true);
    // Also true with no location given at all (the common case callers hit).
    expect(matchesClearanceFilter([signal("clearance_level", "clearance_required_unspecified")], "secret")).toBe(
      true,
    );
  });

  // Regression for DECISIONS.md (judging panel round 5): a UK posting's
  // generic "Security Clearance" mention (clearance_required_unspecified --
  // the UK has its own, different vetting system) matched a "secret" filter
  // query as if it meant the US DoD Secret clearance this product is
  // entirely about.
  it("the generic unspecified fallback does NOT match 'secret' for a non-US-located role", () => {
    expect(
      matchesClearanceFilter(
        [signal("clearance_level", "clearance_required_unspecified")],
        "secret",
        "Newcastle, GB",
      ),
    ).toBe(false);
    expect(
      matchesClearanceFilter(
        [signal("clearance_level", "clearance_required_unspecified")],
        "secret",
        "Sydney, Australia",
      ),
    ).toBe(false);
  });
});

describe("looksItarRestricted", () => {
  it("flags a role with a US-person/citizen requirement signal", () => {
    expect(looksItarRestricted([signal("citizenship", "us_person_required")])).toBe(true);
    expect(looksItarRestricted([signal("citizenship", "us_citizen_required")])).toBe(true);
    expect(looksItarRestricted([signal("citizenship", "us_person_likely")])).toBe(true);
  });

  it("does not flag a role with no citizenship signal", () => {
    expect(looksItarRestricted([signal("clearance_level", "secret")])).toBe(false);
  });
});
