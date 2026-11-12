import { describe, it, expect } from "vitest";
import { estimateTimelineTool } from "@/lib/tools/estimate-timeline";
import { TIMELINES } from "@/lib/timelines-data";

describe("estimate_timeline", () => {
  it("current_status=none: returns a point estimate derived from real baseline data, never minDays>maxDays", async () => {
    const result = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "none",
      employer_has_fcl: "unknown",
    });
    expect(result.estimate.minDays).not.toBeNull();
    expect(result.estimate.minDays).toBe(result.estimate.maxDays);
    expect(result.estimate.minDays).toBe(TIMELINES.investigations.secret.medianDays ?? TIMELINES.investigations.secret.meanDays);
  });

  it("current_status=none: surfaces the interim-eligibility driver (regression for DECISIONS.md D-016 — a zero-history caller used to never see this)", async () => {
    const result = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "none",
      employer_has_fcl: "unknown",
    });
    const interimDriver = result.keyDrivers.find((d) => d.label.toLowerCase().includes("interim"));
    expect(interimDriver).toBeDefined();
    // Must not silently change the numeric estimate — interim has no
    // day-count of its own; it's informational only for "none".
    expect(result.estimate.minDays).toBe(result.estimate.maxDays);
  });

  it("current_status=active: never fabricates a day-count, cites SEAD 7 reciprocity", async () => {
    const result = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "active",
      employer_has_fcl: "unknown",
    });
    expect(result.estimate).toEqual({ minDays: null, maxDays: null, medianDays: null });
    expect(result.keyDrivers.some((d) => d.detail.toLowerCase().includes("reciprocity"))).toBe(true);
  });

  it("current_status=lapsed_lt_2y: uses the modifier's real range, replacing the baseline", async () => {
    const result = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "lapsed_lt_2y",
      employer_has_fcl: "unknown",
    });
    const modifier = TIMELINES.modifiers.find((m) => m.id === "lapsed_lt_2y")!;
    expect(result.estimate.minDays).toBe(modifier.typicalDaysMin);
    expect(result.estimate.maxDays).toBe(modifier.typicalDaysMax);
  });

  it("employer_has_fcl=no: adds a distinct, more specific FCL driver than the 'unknown' case, without changing the base estimate", async () => {
    // Both "unknown" and "no" each add exactly one FCL-related driver (same
    // count), but with meaningfully different content — "no" is specific and
    // actionable, "unknown" just flags the uncertainty.
    const withUnknownFcl = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "none",
      employer_has_fcl: "unknown",
    });
    const withNoFcl = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "none",
      employer_has_fcl: "no",
    });
    expect(withNoFcl.estimate).toEqual(withUnknownFcl.estimate);
    expect(withNoFcl.keyDrivers.some((d) => d.label.toLowerCase().includes("no facility clearance"))).toBe(true);
    expect(withUnknownFcl.keyDrivers.some((d) => d.label.toLowerCase().includes("fcl status unknown"))).toBe(true);
    expect(withNoFcl.keyDrivers.find((d) => d.label.toLowerCase().includes("facility clearance"))?.detail).not.toBe(
      withUnknownFcl.keyDrivers.find((d) => d.label.toLowerCase().includes("fcl status unknown"))?.detail,
    );
  });

  it("target_level=ts_sci: adds an SCI caveat and reuses the TS baseline (no separate ts_sci data claimed)", async () => {
    const ts = await estimateTimelineTool.handler({ target_level: "ts", current_status: "none", employer_has_fcl: "unknown" });
    const tsSci = await estimateTimelineTool.handler({ target_level: "ts_sci", current_status: "none", employer_has_fcl: "unknown" });
    expect(tsSci.estimate).toEqual(ts.estimate);
    expect(tsSci.keyDrivers.some((d) => d.label.toLowerCase().includes("sci"))).toBe(true);
  });

  it("every driver's source is deduplicated by URL", async () => {
    const result = await estimateTimelineTool.handler({
      target_level: "secret",
      current_status: "lapsed_lt_2y",
      employer_has_fcl: "no",
    });
    const urls = result.sources.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("always includes the not-legal-advice disclaimer", async () => {
    const result = await estimateTimelineTool.handler({ target_level: "secret", current_status: "none", employer_has_fcl: "unknown" });
    expect(result.disclaimer.toLowerCase()).toContain("not legal advice");
  });

  it("rejects an invalid target_level/current_status at the schema level", async () => {
    const parsed = estimateTimelineTool.inputSchema.safeParse({ target_level: "not_real", current_status: "none" });
    expect(parsed.success).toBe(false);
  });
});
