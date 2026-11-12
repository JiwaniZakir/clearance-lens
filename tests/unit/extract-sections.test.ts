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

  // Regression for DECISIONS.md (judging panel round 1): a real Saronic
  // posting used plain Title Case headers ("Responsibilities",
  // "Qualifications", "Benefits", "Physical Demands") with no colon and no
  // ALL-CAPS. The original gate missed all of them, and even after
  // recognizing "Responsibilities"/"Qualifications" as headers, an
  // unrecognized "Benefits" header never reset currentSection, so every
  // bullet for the rest of the document (including ADA physical-demands
  // text) got wrongly attributed to "qualifications."
  it("recognizes plain Title Case headers (no colon, no ALL-CAPS), not just the original ALL-CAPS/colon convention", () => {
    const text = "Responsibilities\n\n- Ship real features to production.\n\nQualifications\n\n- Five years of backend experience.";
    const result = extractSections(text);
    expect(result.responsibilities).toEqual(["Ship real features to production."]);
    expect(result.qualifications).toEqual(["Five years of backend experience."]);
  });

  it("resets the current section on an unrecognized-but-still-a-header label (Benefits), instead of letting qualifications bleed into every later section", () => {
    const text =
      "Qualifications\n\n- Five years of backend experience.\n\nBenefits\n\n- Comprehensive health insurance plans.\n\nPhysical Demands\n\n- Occasional standing and walking within the office.";
    const result = extractSections(text);
    expect(result.qualifications).toEqual(["Five years of backend experience."]);
    // Neither the benefits bullet nor the physical-demands bullet should
    // have leaked into qualifications, AND the benefits bullet specifically
    // should be filtered out of rawBullets entirely (defense in depth).
    expect(result.rawBullets).not.toContain("Comprehensive health insurance plans.");
  });

  it("filters obvious benefits/compensation/ADA-physical-demands boilerplate out of rawBullets even with no section structure at all", () => {
    const text = [
      "- A properly long responsibility bullet line that is real content.",
      "- Medical Insurance: Comprehensive health insurance plans covering a range of services",
      "- Retirement Plan: 401(k) plan",
      "- Stock Options: Equity options to give employees a stake in the company's success",
      "- Lifting and carrying items up to 20 pounds occasionally (e.g., office supplies, packages).",
      "- Manual dexterity to operate a computer keyboard, mouse, and other office equipment.",
    ].join("\n");
    const result = extractSections(text);
    expect(result.rawBullets).toEqual(["A properly long responsibility bullet line that is real content."]);
  });
});
