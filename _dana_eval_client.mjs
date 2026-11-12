// Temporary eval script for the Persona D (Dana) agent-in-the-loop eval.
// Connects a real MCP client to the live Clearance Lens server and runs
// the tool calls for scenarios D1-D10. Deleted after the run.
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { writeFileSync } from "node:fs";

const BASE_URL = "http://localhost:3200/mcp";
const results = {};

function short(obj, n = 2000) {
  const s = JSON.stringify(obj, null, 2);
  return s.length > n ? s.slice(0, n) + `\n... [truncated, ${s.length} chars total]` : s;
}

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(BASE_URL));
  const client = new Client({ name: "dana-persona-eval-agent", version: "0.1.0" });
  await client.connect(transport);
  console.log("Connected to", BASE_URL);

  const toolsList = await client.listTools();
  results.tools_list = toolsList.tools.map((t) => t.name);
  console.log("Tools available:", results.tools_list.join(", "));

  async function call(name, args) {
    const startedAt = Date.now();
    try {
      const res = await client.callTool({ name, arguments: args });
      const entry = {
        name,
        args,
        isError: !!res.isError,
        structuredContent: res.structuredContent ?? null,
        textContent: res.content?.map((c) => c.text).join("\n") ?? null,
        ms: Date.now() - startedAt,
      };
      return entry;
    } catch (err) {
      return { name, args, threw: true, message: err?.message ?? String(err), ms: Date.now() - startedAt };
    }
  }

  function record(key, entry) {
    results[key] = entry;
    console.log(`\n=== ${key} :: ${entry.name} ===`);
    console.log("args:", JSON.stringify(entry.args));
    if (entry.threw) console.log("THREW:", entry.message);
    else if (entry.isError) console.log("TOOL ERROR:", entry.textContent);
    else console.log(short(entry.structuredContent));
  }

  // ---- Discovery: find real, live roles/companies for named-company scenarios ----
  record("discover_anduril", await call("search_defense_roles", { query: "Anduril", limit: 10 }));
  record("discover_shieldai", await call("search_defense_roles", { query: "Shield AI", limit: 10 }));
  record("discover_saronic", await call("search_defense_roles", { query: "Saronic", limit: 10 }));
  record("discover_hadrian", await call("search_defense_roles", { query: "Hadrian", limit: 10 }));
  record("discover_castelion", await call("search_defense_roles", { query: "Castelion", limit: 10 }));
  record("discover_ts_clearance", await call("search_defense_roles", { clearance: "ts", limit: 10 }));
  record("discover_broad", await call("search_defense_roles", { limit: 25 }));
  record("discover_autonomy_surface", await call("search_defense_roles", { query: "autonomous surface vessel software", limit: 10 }));
  record("discover_manufacturing", await call("search_defense_roles", { query: "manufacturing engineer", limit: 10 }));

  writeFileSync(
    process.argv[2] ?? "/tmp/dana-eval-discovery.json",
    JSON.stringify(results, null, 2),
  );
  console.log("\n\nWrote discovery results.");

  await client.close();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exitCode = 1;
});
