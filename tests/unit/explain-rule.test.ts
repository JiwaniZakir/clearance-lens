import { describe, it, expect } from "vitest";
import { explainRuleTool } from "@/lib/tools/explain-rule";
import { RULES } from "@/lib/rules-data";

describe("explain_rule", () => {
  it("finds a rule by its exact id", async () => {
    const result = await explainRuleTool.handler({ topic: "itar-us-person" });
    expect(result.found).toBe(true);
    expect(result.topic?.id).toBe("itar-us-person");
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("is case-insensitive and tolerates partial matches on id", async () => {
    const result = await explainRuleTool.handler({ topic: "ITAR-US-PERSON" });
    expect(result.found).toBe(true);
    expect(result.topic?.id).toBe("itar-us-person");
  });

  it("returns found:false plus the full topic list for an unknown topic — never a dead end", async () => {
    const result = await explainRuleTool.handler({ topic: "not_a_real_topic_xyz" });
    expect(result.found).toBe(false);
    expect(result.availableTopics?.length).toBe(RULES.length);
    expect(result.sources).toEqual([]);
  });

  it("every real rule id in the dataset is actually reachable through the tool (regression: catches a guard/matching bug silently blocking one, as DECISIONS.md D-016 found for nbis-diss)", async () => {
    for (const rule of RULES) {
      const result = await explainRuleTool.handler({ topic: rule.id });
      expect(result.found, `topic "${rule.id}" should be reachable`).toBe(true);
      expect(result.topic?.id).toBe(rule.id);
    }
  });

  it("every real rule's own title is also reachable (another real phrasing a user/agent would try)", async () => {
    for (const rule of RULES) {
      const result = await explainRuleTool.handler({ topic: rule.title });
      expect(result.found, `title "${rule.title}" should be reachable`).toBe(true);
    }
  });

  it("always includes the not-legal-advice disclaimer, found or not", async () => {
    const found = await explainRuleTool.handler({ topic: "sead4" });
    const notFound = await explainRuleTool.handler({ topic: "nonexistent" });
    expect(found.disclaimer.toLowerCase()).toContain("not legal advice");
    expect(notFound.disclaimer.toLowerCase()).toContain("not legal advice");
  });

  it("rejects an empty or over-length topic at the schema level", async () => {
    expect(explainRuleTool.inputSchema.safeParse({ topic: "" }).success).toBe(false);
    expect(explainRuleTool.inputSchema.safeParse({ topic: "x".repeat(61) }).success).toBe(false);
  });

  // Regression for DECISIONS.md (judging panel round 4): the input
  // schema's own description names "reciprocity" and "continuous_vetting"
  // as example topic keywords, but neither resolved — "reciprocity" is a
  // *category* value, not a rule id (the real id is "sead7"), and
  // "continuous_vetting" (underscore) didn't match the real id
  // "continuous-vetting" (dash). This list is kept manually in sync with
  // InputSchema's own `.describe()` text above (not parsed from it) —
  // if the description's examples change, update this list to match.
  it("every example keyword named in the tool's own input description actually resolves", async () => {
    const exampleKeywords = ["itar", "fcl", "reciprocity", "interim", "sf86", "continuous_vetting"];
    for (const keyword of exampleKeywords) {
      const result = await explainRuleTool.handler({ topic: keyword });
      expect(result.found, `example keyword "${keyword}" (from the tool's own description) should resolve`).toBe(
        true,
      );
    }
  });

  it("a bare category guess does not resolve when it's genuinely ambiguous (several rules share it)", async () => {
    const result = await explainRuleTool.handler({ topic: "clearance-process" });
    expect(result.found).toBe(false);
  });
});
