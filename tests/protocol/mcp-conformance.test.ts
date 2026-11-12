import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { TOOL_REGISTRY } from "@/lib/tools/registry";

/**
 * Protocol conformance test (spec §5): connects a REAL MCP client to a REAL
 * running server — not a mock of the SDK — and exercises the full surface:
 * handshake, tools/list, resources/list, prompts/list, and every tool with
 * both valid and invalid input. Defaults to the local dev server; point
 * MCP_URL at a deployed preview/production URL to run the same suite there
 * (spec explicitly calls for running this against the deployed /mcp).
 *
 * Run: MCP_URL=https://clearance-lens.vercel.app/mcp npx vitest run tests/protocol
 * (requires the target server to already be running/deployed — this test
 * does not start one itself).
 */

const MCP_URL = process.env.MCP_URL ?? "http://localhost:3200/mcp";

let client: Client;

beforeAll(async () => {
  client = new Client({ name: "protocol-conformance-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);
}, 30_000);

afterAll(async () => {
  await client?.close();
});

describe(`MCP protocol conformance against ${MCP_URL}`, () => {
  it("completes the initialize handshake and reports server info", () => {
    const version = client.getServerVersion();
    expect(version?.name).toBe("clearance-lens");
  });

  it("sets CORS headers for a browser-based MCP client (found missing live, D-012 — mcp-handler doesn't add these by default)", async () => {
    const preflight = await fetch(MCP_URL, {
      method: "OPTIONS",
      headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" },
    });
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-methods")).toContain("POST");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("Mcp-Session-Id");

    const actual = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "cors-test", version: "1.0" } },
      }),
    });
    expect(actual.headers.get("access-control-allow-origin")).toBe("*");
    // The CORS wrapper must not break the streaming transport it wraps.
    expect(actual.headers.get("content-type")).toContain("text/event-stream");
  });

  it("lists exactly the tools in the registry, matching names 1:1", async () => {
    const { tools } = await client.listTools();
    const listedNames = tools.map((t) => t.name).sort();
    const registryNames = TOOL_REGISTRY.map((t) => t.name).sort();
    expect(listedNames).toEqual(registryNames);
    // Derived from the registry itself, not hardcoded — found live (Clearance
    // Lens v2): a hardcoded "11" here silently went stale the moment a 12th
    // tool was registered, since toEqual(registryNames) alone would still
    // pass if BOTH sides were wrong in the same way.
    expect(listedNames).toHaveLength(TOOL_REGISTRY.length);
  });

  it("every tool advertises a non-empty description and an inputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description, `${tool.name} has no description`).toBeTruthy();
      expect(tool.inputSchema, `${tool.name} has no inputSchema`).toBeTruthy();
    }
  });

  it("lists the rules, timelines, and disclaimers resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri).sort();
    expect(uris).toEqual(
      ["clearance-lens://disclaimers.json", "clearance-lens://rules.json", "clearance-lens://timelines.json"].sort(),
    );
  });

  it("reads the rules resource and gets back valid JSON with real entries", async () => {
    const { contents } = await client.readResource({ uri: "clearance-lens://rules.json" });
    const first = contents[0];
    // Our resource always serves text (JSON), never a binary blob — assert
    // that rather than casting past the SDK's correctly-modeled union type.
    expect(first).toHaveProperty("text");
    const parsed = JSON.parse((first as { text: string }).text);
    expect(Array.isArray(parsed.rules)).toBe(true);
    expect(parsed.rules.length).toBeGreaterThan(0);
  });

  it("lists the 3 named prompts", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(
      ["check_my_eligibility", "prep_for_role", "preview_the_job"].sort(),
    );
  });

  it("explain_rule: valid call returns structured content with sources", async () => {
    const result = await client.callTool({ name: "explain_rule", arguments: { topic: "itar" } });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toBeDefined();
    expect((result.structuredContent as { sources: unknown[] }).sources).toBeDefined();
  });

  it("explain_rule: invalid input (wrong type) is rejected by schema validation", async () => {
    const result = await client.callTool({ name: "explain_rule", arguments: { topic: 42 } });
    expect(result.isError).toBe(true);
  });

  it("estimate_timeline: invalid enum value is rejected", async () => {
    const result = await client.callTool({
      name: "estimate_timeline",
      arguments: { target_level: "not_a_real_level", current_status: "none" },
    });
    expect(result.isError).toBe(true);
  });

  it("rejects PII in a declared field with a friendly, non-raw-error message", async () => {
    const result = await client.callTool({ name: "explain_rule", arguments: { topic: "my ssn is 123-45-6789" } });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? "";
    expect(text).not.toContain("123-45-6789");
    expect(text.toLowerCase()).toMatch(/social security|ssn/);
  });

  it("calling an unknown tool name fails cleanly (not a crash)", async () => {
    await expect(client.callTool({ name: "not_a_real_tool", arguments: {} })).rejects.toBeTruthy();
  });

  // One representative, fast, side-effect-free call per remaining tool, to
  // confirm each is actually reachable end-to-end through the real
  // transport — not just unit-tested against a mocked client.
  it.each([
    ["verify_evidence", { github_username_or_url: "octocat" }],
    ["search_defense_roles", { limit: 1 }],
  ])("%s: a valid call succeeds end-to-end through the real transport", async (name, args) => {
    const result = await client.callTool({ name: name as string, arguments: args as Record<string, unknown> });
    expect(result.isError).toBeFalsy();
  }, 20_000);
});
