import { describe, it, expect } from "vitest";
import { z } from "zod";
import { callTool, SourceRefSchema, type ToolDef, type SourceRef } from "@/lib/tools/wrap";
import { SpeedrunApiError } from "@/lib/speedrun/client";
import { GitHubApiError } from "@/lib/github/client";

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

  // Regression for DECISIONS.md (judging panel round 1): a 404 from any
  // SpeedrunApiError/GitHubApiError used ONE generic, job-posting-flavored
  // message ("may have been filled or removed since you last searched")
  // regardless of entity type -- nonsensical for a company slug or a
  // GitHub username. Each error class's own userMessage (set at the
  // specific throw site that knows what was being looked up) must now be
  // preferred over that generic fallback.
  it("prefers a SpeedrunApiError's own userMessage over the generic 404 fallback", async () => {
    const tool: ToolDef<{ message: string }, { echoed: string; sources: SourceRef[] }> = {
      ...echoTool,
      name: "speedrun-404",
      handler: async () => {
        throw new SpeedrunApiError("no company with that slug", 404, "not_found", "Entity-specific not-found text.");
      },
    };
    const result = await callTool(tool, { message: "hi" });
    expect(result).toEqual({ ok: false, error: { code: "not_found", message: "Entity-specific not-found text." } });
  });

  it("prefers a GitHubApiError's own userMessage over the generic 404 fallback", async () => {
    const tool: ToolDef<{ message: string }, { echoed: string; sources: SourceRef[] }> = {
      ...echoTool,
      name: "github-404",
      handler: async () => {
        throw new GitHubApiError("GitHub user not found", 404, "Entity-specific GitHub not-found text.");
      },
    };
    const result = await callTool(tool, { message: "hi" });
    expect(result).toEqual({ ok: false, error: { code: "not_found", message: "Entity-specific GitHub not-found text." } });
  });

  it("falls back to the generic 404 message when an error class doesn't set its own userMessage", async () => {
    const tool: ToolDef<{ message: string }, { echoed: string; sources: SourceRef[] }> = {
      ...echoTool,
      name: "speedrun-404-no-override",
      handler: async () => {
        throw new SpeedrunApiError("not found", 404, "not_found");
      },
    };
    const result = await callTool(tool, { message: "hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("may have been filled or removed");
  });

  it("a non-404 upstream error still gets the generic upstream_error message, never a userMessage meant for 404s", async () => {
    const tool: ToolDef<{ message: string }, { echoed: string; sources: SourceRef[] }> = {
      ...echoTool,
      name: "speedrun-500",
      handler: async () => {
        throw new SpeedrunApiError("server error", 500, "upstream_error");
      },
    };
    const result = await callTool(tool, { message: "hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("upstream_error");
      expect(result.error.message).toContain("temporarily unavailable");
    }
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
