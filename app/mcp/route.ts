import { createMcpHandler } from "mcp-handler";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { callTool } from "@/lib/tools/wrap";
import { RULES, RULES_LAST_VERIFIED } from "@/lib/rules-data";
import { DISCLAIMERS } from "@/lib/disclaimers";

/**
 * The remote MCP server (spec §3.1-3.2): Streamable HTTP, mounted at /mcp by
 * virtue of this file's path (app/mcp/route.ts). Stateless by default — see
 * DECISIONS.md D-003b for why this is built on @modelcontextprotocol/server
 * v2 (via mcp-handler) rather than the legacy v1 @modelcontextprotocol/sdk.
 *
 * Every tool call goes through the exact same `callTool` pipeline the /api
 * playground route uses — PII/CUI guard, zod validation, structured errors —
 * so there is no behavioral drift between the two surfaces.
 */
const handler = createMcpHandler(
  (server) => {
    for (const def of TOOL_REGISTRY) {
      server.registerTool(
        def.name,
        {
          title: def.title,
          description: def.description,
          inputSchema: def.inputSchema,
          outputSchema: def.outputSchema,
        },
        async (input: unknown) => {
          const result = await callTool(def, input);
          if (!result.ok) {
            return {
              content: [{ type: "text" as const, text: result.error.message }],
              isError: true,
            };
          }
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
            structuredContent: result.data,
          };
        },
      );
    }

    server.registerResource(
      "rules",
      "clearance-lens://rules.json",
      {
        title: "Clearance & ITAR rules dataset",
        description: `Machine-readable rules dataset backing explain_rule, last verified ${RULES_LAST_VERIFIED}.`,
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ lastVerified: RULES_LAST_VERIFIED, rules: RULES }, null, 2),
          },
        ],
      }),
    );

    server.registerResource(
      "disclaimers",
      "clearance-lens://disclaimers.json",
      {
        title: "Standard disclaimers",
        description: "The canonical disclaimer strings used across every tool output.",
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(DISCLAIMERS, null, 2) }],
      }),
    );
  },
  {
    serverInfo: { name: "clearance-lens", version: "0.1.0" },
  },
);

export { handler as GET, handler as POST };
