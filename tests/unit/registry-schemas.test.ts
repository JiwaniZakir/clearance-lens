import { describe, it, expect } from "vitest";
import { z } from "zod";
import { TOOL_REGISTRY } from "@/lib/tools/registry";

// Found in a local build during D-047: a `z.undefined()` field in one tool's
// input schema made the MCP SDK's JSON Schema conversion throw, which failed
// tools/list — for every tool, for every client. Unit tests that call
// handlers directly never convert schemas, so nothing else would catch it.
describe("every tool schema converts to JSON Schema (what tools/list sends)", () => {
  it.each(TOOL_REGISTRY.map((t) => [t.name, t] as const))("%s", (_name, tool) => {
    expect(() => z.toJSONSchema(tool.inputSchema as z.ZodType, { io: "input" })).not.toThrow();
    expect(() => z.toJSONSchema(tool.outputSchema as z.ZodType, { io: "output" })).not.toThrow();
  });
});
