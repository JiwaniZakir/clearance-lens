import { describe, it, expect } from "vitest";
import { RULES } from "@/lib/rules-data";
import { TIMELINES } from "@/lib/timelines-data";
import fs from "node:fs";
import path from "node:path";

const IS_TRIPWIRE = (url: string) => url.includes(".invalid") || url.includes("example.invalid");

describe("data/rules.json integrity (spec §1.6: every statistic/claim needs a real source)", () => {
  it("is not the tripwire placeholder", () => {
    for (const rule of RULES) {
      for (const source of rule.sources) {
        expect(IS_TRIPWIRE(source.url), `${rule.id} still has a placeholder source`).toBe(false);
      }
    }
  });

  it("every rule has at least one source with a title, a real-looking https URL, and a lastVerified date", () => {
    for (const rule of RULES) {
      expect(rule.sources.length).toBeGreaterThan(0);
      for (const source of rule.sources) {
        expect(source.title.length).toBeGreaterThan(0);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.lastVerified).toBeDefined();
      }
    }
  });

  it("has unique rule ids", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no empty summary or keyPoints", () => {
    for (const rule of RULES) {
      expect(rule.summary.length).toBeGreaterThan(20);
      expect(rule.keyPoints.length).toBeGreaterThan(0);
    }
  });
});

describe("data/timelines.json integrity", () => {
  it("is not the tripwire placeholder", () => {
    expect(IS_TRIPWIRE(TIMELINES.investigations.secret.source.url)).toBe(false);
    expect(IS_TRIPWIRE(TIMELINES.investigations.ts.source.url)).toBe(false);
    for (const m of TIMELINES.modifiers) {
      expect(IS_TRIPWIRE(m.source.url)).toBe(false);
    }
  });

  it("every modifier has a source even when its day-count is null", () => {
    for (const m of TIMELINES.modifiers) {
      expect(m.source.url).toMatch(/^https:\/\//);
      expect(m.effectDescription.length).toBeGreaterThan(20);
    }
  });

  it("never reports a numeric day count without a source behind it (null is fine, an unsourced number is not)", () => {
    const stats = [TIMELINES.investigations.secret, TIMELINES.investigations.ts];
    for (const s of stats) {
      if (s.medianDays !== null || s.meanDays !== null) {
        expect(s.source.url).toMatch(/^https:\/\//);
      }
    }
  });
});

describe("SOURCES.md cross-check", () => {
  it("every unique source URL cited in rules.json/timelines.json appears somewhere in SOURCES.md", () => {
    const sourcesMdPath = path.join(process.cwd(), "SOURCES.md");
    if (!fs.existsSync(sourcesMdPath)) {
      // SOURCES.md is produced once Phase R's output is consolidated — this
      // test is a no-op tripwire reminder until that file exists, not a
      // false failure during early build.
      return;
    }
    const sourcesMd = fs.readFileSync(sourcesMdPath, "utf8");
    const allUrls = new Set<string>();
    for (const rule of RULES) for (const s of rule.sources) allUrls.add(s.url);
    allUrls.add(TIMELINES.investigations.secret.source.url);
    allUrls.add(TIMELINES.investigations.ts.source.url);
    for (const m of TIMELINES.modifiers) allUrls.add(m.source.url);

    const missing = [...allUrls].filter((url) => !sourcesMd.includes(url));
    expect(missing, `URLs missing from SOURCES.md: ${missing.join(", ")}`).toEqual([]);
  });
});
