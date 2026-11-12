import { describe, it, expect } from "vitest";
import { extractSections } from "@/lib/speedrun/extract-sections";

describe("extractSections", () => {
  it("extracts bullets under a responsibilities-like header", () => {
    const text = "WHAT YOU'LL DO\n\n- Build the thing.\n- Ship the thing.\n\nQUALIFICATIONS\n\n- Know Python.";
    const result = extractSections(text);
    expect(result.responsibilities).toEqual(["Build the thing.", "Ship the thing."]);
    expect(result.qualifications).toEqual(["Know Python."]);
  });

  it("falls back to rawBullets when no recognizable header is present", () => {
    const text = "- A bullet with no header above it that is long enough.";
    const result = extractSections(text);
    expect(result.responsibilities).toEqual([]);
    expect(result.rawBullets).toEqual(["A bullet with no header above it that is long enough."]);
  });

  it("ignores stray short fragments that aren't real bullets", () => {
    const text = "WHAT YOU'LL DO\n\n- ok\n- A properly long responsibility bullet line.";
    const result = extractSections(text);
    expect(result.responsibilities).toEqual(["A properly long responsibility bullet line."]);
  });

  it("returns empty arrays for a posting with no bullets at all", () => {
    const result = extractSections("Just a paragraph of prose with no bullets whatsoever.");
    expect(result.responsibilities).toEqual([]);
    expect(result.qualifications).toEqual([]);
    expect(result.rawBullets).toEqual([]);
  });
});
