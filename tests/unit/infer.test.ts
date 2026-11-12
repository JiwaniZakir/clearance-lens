import { describe, it, expect } from "vitest";
import { extractRequirementSignals, extractStatedSignals } from "@/lib/speedrun/infer";

describe("extractStatedSignals", () => {
  it("extracts a verbatim excerpt, not a paraphrase", () => {
    const text = "Some intro. This role requires an active Secret clearance. Some outro.";
    const signals = extractStatedSignals(text);
    const secret = signals.find((s) => s.value === "secret");
    expect(secret).toBeDefined();
    expect(secret!.basis).toBe("stated");
    expect(text).toContain(secret!.evidence.replace("…", ""));
  });

  it("classifies TS/SCI distinctly from bare Top Secret", () => {
    expect(extractStatedSignals("Requires Top Secret/SCI.").map((s) => s.value)).toContain("ts_sci");
    expect(extractStatedSignals("Requires Top Secret/SCI.").map((s) => s.value)).not.toContain("ts");
    expect(extractStatedSignals("Requires an active Top Secret clearance.").map((s) => s.value)).toContain("ts");
  });

  it("detects citizenship, polygraph, and SCIF signals", () => {
    const text = "Must be a U.S. Citizen. No visa sponsorship. Polygraph required. Work is in a SCIF.";
    const values = extractStatedSignals(text).map((s) => s.value);
    expect(values).toEqual(
      expect.arrayContaining(["us_citizen_required", "no_sponsorship", "polygraph_required", "scif_onsite"]),
    );
  });

  it("returns no signals for a posting with no requirement language", () => {
    expect(extractStatedSignals("You'll write Python and ship features weekly.")).toHaveLength(0);
  });

  it("never fabricates a value that isn't a direct textual match", () => {
    const signals = extractStatedSignals("We require an active Secret clearance.");
    for (const s of signals) {
      // the evidence must be a real substring of the source (modulo the … truncation marker)
      expect("We require an active Secret clearance.").toContain(s.evidence.replace("…", ""));
    }
  });

  // Regression for DECISIONS.md (judging panel round 2): "an active Top
  // Secret security clearance" independently matched both the specific
  // "ts" pattern (via "Top Secret") and the generic
  // "clearance_required_unspecified" fallback (via "security clearance"),
  // citing the identical evidence quote twice as if they were two
  // distinct, possibly-conflicting requirements rather than one.
  it("does not also emit the generic clearance_required_unspecified signal once a specific level is already detected", () => {
    const text = "Must hold an active Top Secret security clearance to be considered.";
    const values = extractStatedSignals(text).map((s) => s.value);
    expect(values).toContain("ts");
    expect(values).not.toContain("clearance_required_unspecified");
    expect(values.filter((v) => v === "ts" || v === "clearance_required_unspecified")).toHaveLength(1);
  });

  it("still emits clearance_required_unspecified on its own when no specific level is stated", () => {
    const values = extractStatedSignals("Must hold an active security clearance.").map((s) => s.value);
    expect(values).toContain("clearance_required_unspecified");
  });
});

describe("extractInferredSignals via extractRequirementSignals", () => {
  it("infers US-person-likely only when defense industry AND no stated citizenship signal", () => {
    const signals = extractRequirementSignals("We build autonomous systems for national security.", {
      industry: "defense_space",
    });
    const inferred = signals.find((s) => s.value === "us_person_likely");
    expect(inferred).toBeDefined();
    expect(inferred!.basis).toBe("inferred");
    expect(inferred!.evidence).toMatch(/confirm directly/i);
  });

  it("does NOT add an inferred citizenship signal when one is already stated", () => {
    const signals = extractRequirementSignals("Must be a U.S. Citizen to work on this defense program.", {
      industry: "defense_space",
    });
    expect(signals.filter((s) => s.kind === "citizenship")).toHaveLength(1);
    expect(signals.find((s) => s.kind === "citizenship")!.basis).toBe("stated");
  });

  it("does NOT infer anything defense-related for a non-defense posting", () => {
    const signals = extractRequirementSignals("You'll build dashboards for a fintech SaaS product.", {
      industry: "computer_software",
    });
    expect(signals).toHaveLength(0);
  });

  // Regression for DECISIONS.md (judging panel round 2): a real posting
  // based in Sydney, Australia (asking for an Australian NV2 clearance,
  // not a US one) was tagged with the same inferred ITAR/US-person flag
  // this function applies to domestic roles — ITAR's "US person" test is
  // a US-law-specific concept that doesn't apply to a role based abroad.
  it("does NOT infer us_person_likely for a defense-industry role explicitly based in a non-US location", () => {
    const signals = extractRequirementSignals("We build autonomous systems for national security.", {
      industry: "defense_space",
      location: "Sydney, Australia",
    });
    expect(signals.find((s) => s.value === "us_person_likely")).toBeUndefined();
  });

  it("does NOT infer us_person_likely when the posting itself names a foreign clearance system", () => {
    const signals = extractRequirementSignals(
      "This role requires an Australian NV2 clearance due to program requirements.",
      { industry: "defense_space", location: "Remote" },
    );
    expect(signals.find((s) => s.value === "us_person_likely")).toBeUndefined();
  });

  it("still infers us_person_likely normally for a domestic (or location-unspecified) defense role", () => {
    const signals = extractRequirementSignals("We build autonomous systems for national security.", {
      industry: "defense_space",
      location: "Austin, TX",
    });
    expect(signals.find((s) => s.value === "us_person_likely")).toBeDefined();
  });

  it("every inferred signal explicitly says to confirm with the employer", () => {
    const signals = extractRequirementSignals(
      "This program supports a classified DoD government customer.",
      { industry: "defense_space" },
    );
    const inferredOnly = signals.filter((s) => s.basis === "inferred");
    expect(inferredOnly.length).toBeGreaterThan(0);
    for (const s of inferredOnly) {
      expect(s.evidence.toLowerCase()).toMatch(/confirm|ask the recruiter/);
    }
  });
});
