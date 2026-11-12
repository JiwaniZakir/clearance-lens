import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const client = new Client({ name: "clearance-lens-eval-explore", version: "0.0.1" });
const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3200/mcp"));

await client.connect(transport);

const toolsList = await client.listTools();
console.log("=== TOOLS ===");
console.log(toolsList.tools.map((t) => t.name).join(", "));

async function call(name, args) {
  console.log(`\n=== CALL ${name} ${JSON.stringify(args)} ===`);
  try {
    const res = await client.callTool({ name, arguments: args });
    const text = res.content?.map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n") ?? "";
    console.log(text.slice(0, 4000));
    return res;
  } catch (err) {
    console.log("ERROR:", err?.message ?? err);
    return null;
  }
}

// Broad scan, no query filter, max limit, to see what's live right now.
await call("search_defense_roles", { limit: 25 });

for (const q of ["Anduril", "maritime", "Shield AI", "autonomy", "Saronic", "surface vessel", "Hadrian", "manufacturing", "Castelion", "hypersonic", "integration engineer"]) {
  await call("search_defense_roles", { query: q, limit: 10 });
}

await client.close();
console.log("\nDONE");
