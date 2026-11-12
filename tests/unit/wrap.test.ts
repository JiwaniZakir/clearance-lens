import { describe, it, expect } from "vitest";
import { z } from "zod";
import { callTool, SourceRefSchema, type ToolDef, type SourceRef } from "@/lib/tools/wrap";

const EchoInput = z.object({ message: z.string().max(100) });
const EchoOutput = z.object({ echoed: z.string(), sources: z.array(SourceRefSchema) });

const echoTool: ToolDef<z.infer<typeof EchoInput>, z.infer<typeof EchoOutput>> = {
  name: "echo",
  title: "Echo",
  description: "test-only tool",
  inputSchema: EchoInput,
  outputSchema: EchoOutput,
  handler: async ({ message }) => ({ echoed: message, sources: [] }),
};

const throwingTool: ToolDef<z.infer<typeof EchoInput>, z.infer<typeof EchoOutput>> = {
  ...echoTool,
  name: "throwing",
  handler: async () => {
    throw new Error("boom");
  },
};

const badOutputTool: ToolDef<z.infer<typeof EchoInput>, z.infer<typeof EchoOutput>> = {
  ...echoTool,
  name: "bad-output",
  // @ts-expect-error intentionally wrong shape to exercise output validation
  handler: async () => ({ notEchoed: "oops" }),
};

describe("callTool pipeline", () => {
  it("round-trips valid input through handler to validated output", async () => {
    const result = await callTool(echoTool, { message: "hello" });
    expect(result).toEqual({ ok: true, data: { echoed: "hello", sources: [] } });
  });

  it("rejects PII in input before the handler ever runs (invalid-shape handler input would otherwise throw)", async () => {
    const result = await callTool(echoTool, { message: "my ssn is 123-45-6789" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("pii_cui_rejected");
      expect(result.error.message).not.toContain("123-45-6789");
    }
  });

  it("rejects input that fails zod validation with a friendly message", async () => {
    const result = await callTool(echoTool, { message: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_input");
  });

  it("rejects oversized input", async () => {
    const result = await callTool(echoTool, { message: "x".repeat(50_000) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_input");
  });

  it("converts a thrown handler error into an internal_error result, not an unhandled rejection", async () => {
    const result = await callTool(throwingTool, { message: "hi" });
    expect(result).toEqual({
      ok: false,
      error: { code: "internal_error", message: expect.stringContaining("Something went wrong") },
    });
  });

  it("catches a handler that returns output violating its own outputSchema", async () => {
    const result = await callTool(badOutputTool, { message: "hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("internal_error");
  });

  it("scans nested object fields for PII, not just top-level strings", async () => {
    const NestedInput = z.object({ nested: z.object({ note: z.string() }) });
    const nestedTool: ToolDef<{ nested: { note: string } }, { ok: boolean; sources: SourceRef[] }> = {
      name: "nested",
      title: "Nested",
      description: "test",
      inputSchema: NestedInput,
      outputSchema: z.object({ ok: z.boolean(), sources: z.array(SourceRefSchema) }),
      handler: async () => ({ ok: true, sources: [] }),
    };
    const result = await callTool(nestedTool, { nested: { note: "DOB: 01/01/1999" } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("pii_cui_rejected");
  });
});
