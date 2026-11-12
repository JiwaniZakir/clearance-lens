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
    for (const m of TIMELINES.modifiers) for (const s of [m.source, ...(m.additionalSources ?? [])]) allUrls.add(s.url);

    const missing = [...allUrls].filter((url) => !sourcesMd.includes(url));
    expect(missing, `URLs missing from SOURCES.md: ${missing.join(", ")}`).toEqual([]);
  });
});

// Found via the spec §6 judging panel round 8 (trust_skeptic flagged one
// tool-cited source missing from /sources; a systematic check then found the
// a16z speedrun Talent Network — cited by nearly every tool — was missing
// too). The /sources page keeps its own row list instead of generating from
// SOURCES.md, so the two can drift silently. This walks every URL literal any
// tool cites and requires it in BOTH places.
describe("every URL a tool cites inline is listed on /sources and in SOURCES.md", () => {
  const toolsDir = path.join(process.cwd(), "lib/tools");
  const cited = new Map<string, string>();
  for (const file of fs.readdirSync(toolsDir).filter((f) => f.endsWith(".ts"))) {
    const text = fs.readFileSync(path.join(toolsDir, file), "utf8");
    for (const m of text.matchAll(/url:\s*"(https?:\/\/[^"]+)"/g)) cited.set(m[1], file);
  }
  const sourcesMd = fs.readFileSync(path.join(process.cwd(), "SOURCES.md"), "utf8");
  // What /sources actually renders: its own static rows, plus every rule
  // and timeline source (rendered dynamically from these data files).
  const pageRendered = [
    fs.readFileSync(path.join(process.cwd(), "app/sources/page.tsx"), "utf8"),
    ...RULES.flatMap((r) => r.sources.map((s) => s.url)),
    ...Object.values(TIMELINES.investigations).map((i) => i.source.url),
    ...TIMELINES.modifiers.flatMap((m) => [m.source, ...(m.additionalSources ?? [])].map((s) => s.url)),
  ].join("\n");

  it("finds a non-trivial number of cited URLs (guards against the scan silently matching nothing)", () => {
    expect(cited.size).toBeGreaterThanOrEqual(5);
  });

  it("every tool-cited URL appears in SOURCES.md", () => {
    const missing = [...cited].filter(([url]) => !sourcesMd.includes(url)).map(([url, f]) => `${url} (${f})`);
    expect(missing, `missing from SOURCES.md: ${missing.join(", ")}`).toEqual([]);
  });

  it("every tool-cited URL is rendered on the /sources page", () => {
    const missing = [...cited].filter(([url]) => !pageRendered.includes(url)).map(([url, f]) => `${url} (${f})`);
    expect(missing, `missing from /sources: ${missing.join(", ")}`).toEqual([]);
  });
});
