import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { callTool } from "@/lib/tools/wrap";
import { RULES, RULES_LAST_VERIFIED } from "@/lib/rules-data";
import { TIMELINES, TIMELINES_LAST_VERIFIED } from "@/lib/timelines-data";
import { DISCLAIMERS } from "@/lib/disclaimers";

function promptMessage(text: string) {
  return { messages: [{ role: "user" as const, content: { type: "text" as const, text } }] };
}

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
      "timelines",
      "clearance-lens://timelines.json",
      {
        title: "Clearance investigation timelines dataset",
        description: `Machine-readable timelines dataset backing estimate_timeline, last verified ${TIMELINES_LAST_VERIFIED}.`,
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(TIMELINES, null, 2) }],
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

    // One-click flows for clients that support MCP prompts (spec §3.1). Each
    // just gives the agent a clear multi-tool sequence to run — all private
    // reasoning still happens in the agent, never here.
    server.registerPrompt(
      "check_my_eligibility",
      {
        title: "Check my eligibility for a role",
        description: "Walks through whether you're likely eligible for a specific defense-tech role.",
        argsSchema: z.object({
          role_id: z
            .string()
            .optional()
            .describe("A role id from search_defense_roles. If omitted, search first."),
        }),
      },
      ({ role_id }) =>
        promptMessage(
          role_id
            ? `Call get_role_rubric with role_id="${role_id}", then evaluate the eligibilityChecklist privately against what you already know about me — do not send my private answers back to the server. Summarize which items look clear, which are uncertain, and what I should verify directly with the employer. Never give me a score.`
            : `Ask me what kind of defense-tech role I'm interested in, call search_defense_roles to find candidates, then for the role I pick, call get_role_rubric and evaluate its eligibilityChecklist privately against what you already know about me. Never give me a score.`,
        ),
    );

    server.registerPrompt(
      "prep_for_role",
      {
        title: "Prep for a role",
        description: "Builds a 2-week prep plan and the right questions to ask the recruiter/FSO for a specific role.",
        argsSchema: z.object({ role_id: z.string().describe("A role id from search_defense_roles.") }),
      },
      ({ role_id }) =>
        promptMessage(
          `Call readiness_brief and estimate_timeline (pick sensible target_level/current_status based on what you know about me) with role_id="${role_id}". Fill in the readiness_brief template privately using what you know about me, then give me: an eligibility read, concrete gaps, a 2-week prep plan, a timeline estimate with its uncertainty note, and the ready-to-ask recruiter questions. Never a score.`,
        ),
    );

    server.registerPrompt(
      "preview_the_job",
      {
        title: "Preview the first week",
        description: "Runs the interactive first-week job preview simulation for a role, scene by scene.",
        argsSchema: z.object({
          role_id: z.string().describe("A role id from search_defense_roles."),
          minutes: z.enum(["20", "30"]).optional().describe("20 = 4 scenes, 30 = all 6 scenes."),
        }),
      },
      ({ role_id, minutes }) =>
        promptMessage(
          `Call run_job_preview with role_id="${role_id}" and minutes=${minutes ?? "30"}. Follow its instructionsForAgent exactly: run one scene at a time, withhold each choice's outcome until I actually pick, ask the debrief prompts conversationally, and ask the aggregateDebriefPrompt at the end. Then call fit_debrief with whatever tags I loved/disliked based on how I reacted, and show me the resulting summary, questions to ask the company, and share draft.`,
        ),
    );
  },
  {
    serverInfo: { name: "clearance-lens", version: "0.1.0" },
  },
);

export { handler as GET, handler as POST };
