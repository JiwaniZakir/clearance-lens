// Throwaway eval script for the Persona A (Jordan) agent-in-the-loop eval.
// Connects a REAL @modelcontextprotocol/client to the already-running local
// MCP server and exercises the 10 Persona A scenarios from
// research/R3-user-studies.md §3. Deleted after the eval run completes.
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { writeFileSync } from "node:fs";

const MCP_URL = "http://localhost:3200/mcp";
const log = []; // flat chronological log of every real tool call made, tagged by scenario

async function call(client, scenario, name, args) {
  const entry = { scenario, tool: name, args };
  try {
    const result = await client.callTool({ name, arguments: args });
    entry.isError = result.isError ?? false;
    entry.content = result.content;
    entry.structuredContent = result.structuredContent;
    log.push(entry);
    return result;
  } catch (err) {
    entry.isError = true;
    entry.threw = String(err?.message ?? err);
    log.push(entry);
    throw err;
  }
}

function pickRole(roles, needle) {
  const n = needle.toLowerCase();
  return roles.find((r) => (r.company ?? "").toLowerCase().includes(n));
}

async function findRoleForCompany(client, scenario, companyNeedle, fallbackQueries) {
  const attempts = [];
  let res = await call(client, scenario, "search_defense_roles", { query: companyNeedle, limit: 10 });
  attempts.push({ query: companyNeedle, rolesReturned: res.structuredContent?.roles?.length ?? 0 });
  let role = pickRole(res.structuredContent?.roles ?? [], companyNeedle);
  if (!role) {
    for (const q of fallbackQueries) {
      res = await call(client, scenario, "search_defense_roles", { query: q, limit: 25 });
      attempts.push({ query: q, rolesReturned: res.structuredContent?.roles?.length ?? 0 });
      role = pickRole(res.structuredContent?.roles ?? [], companyNeedle);
      if (role) break;
    }
  }
  return { role, attempts, lastSearchResult: res.structuredContent };
}

async function main() {
  const client = new Client({ name: "persona-a-jordan-eval", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);

  const serverVersion = client.getServerVersion();
  const toolsList = await client.listTools();
  const resourcesList = await client.listResources();
  const promptsList = await client.listPrompts();

  const scenarios = {};

  // ---------- A1: Anduril Maritime Application Team SWE ----------
  {
    const s = "A1";
    const { role, attempts } = await findRoleForCompany(client, s, "Anduril", ["Maritime", "software engineer", "autonomy"]);
    scenarios[s] = { roleFound: role ?? null, searchAttempts: attempts };
    if (role) {
      await call(client, s, "get_role_rubric", { role_id: role.id });
      await call(client, s, "explain_rule", { topic: "itar" });
    }
  }

  // ---------- A2: Secret-required role, offer today, zero prior investigation ----------
  {
    const s = "A2";
    const est = await call(client, s, "estimate_timeline", {
      target_level: "secret",
      current_status: "none",
      employer_has_fcl: "unknown",
    });
    // Generic "a Secret-required role" with no named company -> ground the
    // readiness brief in one real, currently-open Secret-clearance defense role.
    const search = await call(client, s, "search_defense_roles", { clearance: "secret", limit: 5 });
    const role = search.structuredContent?.roles?.[0] ?? null;
    scenarios[s] = { roleUsedForReadinessBrief: role ?? null };
    if (role) {
      await call(client, s, "readiness_brief", { role_id: role.id });
    }
  }

  // ---------- A3: Shield AI Hivemind autonomy software role, 90-min trial ----------
  {
    const s = "A3";
    const { role, attempts } = await findRoleForCompany(client, s, "Shield AI", ["Hivemind", "autonomy software", "autonomy"]);
    scenarios[s] = { roleFound: role ?? null, searchAttempts: attempts };
    if (role) {
      await call(client, s, "build_trial_assessment", { role_id: role.id, minutes: 90 });
    }
  }

  // ---------- A4: Castelion hypersonics, 20-min first-week preview ----------
  {
    const s = "A4";
    const { role, attempts } = await findRoleForCompany(client, s, "Castelion", ["hypersonic", "Blackbeard", "missile"]);
    scenarios[s] = { roleFound: role ?? null, searchAttempts: attempts };
    if (role) {
      await call(client, s, "run_job_preview", { role_id: role.id, minutes: 20 });
    }
  }

  // ---------- A5: Hadrian manufacturing engineer, stated-vs-enforced discrepancy ----------
  {
    const s = "A5";
    const { role, attempts } = await findRoleForCompany(client, s, "Hadrian", ["manufacturing engineer", "precision manufacturing"]);
    scenarios[s] = { roleFound: role ?? null, searchAttempts: attempts };
    if (role) {
      await call(client, s, "get_role_rubric", { role_id: role.id });
      await call(client, s, "explain_rule", { topic: "sead4" });
    }
  }

  // ---------- A6: contradictory forum timeline claims, zero record ----------
  {
    const s = "A6";
    await call(client, s, "estimate_timeline", {
      target_level: "secret",
      current_status: "none",
      employer_has_fcl: "unknown",
    });
    await call(client, s, "explain_rule", { topic: "dcsa-timeliness" });
    scenarios[s] = {};
  }

  // ---------- A7: Saronic controls-eng role vs big-tech cleared SRE (work-reality compare) ----------
  {
    const s = "A7";
    const { role, attempts } = await findRoleForCompany(client, s, "Saronic", ["autonomous surface vessel", "controls engineer", "maritime autonomy"]);
    scenarios[s] = { roleFound: role ?? null, searchAttempts: attempts };
    if (role) {
      if (role.companySlug) {
        await call(client, s, "get_company_profile", { company_slug: role.companySlug });
      } else {
        scenarios[s].companyProfileSkippedReason = "role.companySlug is null (stealth posting, no public company page to slug)";
      }
      await call(client, s, "run_job_preview", { role_id: role.id, minutes: 20 });
    }
  }

  // ---------- A8: Shield AI debrief after a 30-min preview ----------
  {
    const s = "A8";
    // Reuse the Shield AI role already found in A3 if present; else look it up fresh.
    let role = scenarios["A3"]?.roleFound ?? null;
    if (!role) {
      const found = await findRoleForCompany(client, s, "Shield AI", ["autonomy"]);
      role = found.role;
      scenarios[s] = { roleFound: role ?? null, searchAttempts: found.attempts, reusedFromA3: false };
    } else {
      scenarios[s] = { roleFound: role, reusedFromA3: true };
    }
    if (role) {
      const preview = await call(client, s, "run_job_preview", { role_id: role.id, minutes: 30 });
      scenarios[s].previewScenesSeen = (preview.structuredContent?.scenes ?? []).map((sc) => sc.id);
      // Jordan's own local reaction to a Shield AI autonomy role, reasoned
      // privately from the scene content and his profile -- these FIT_TAGS are
      // a closed public vocabulary describing work REALITIES, not private facts.
      const loved = ["mission_driven_focus", "high_autonomy"];
      const disliked = ["long_investigation_timeline", "clearance_wait_patience"];
      await call(client, s, "fit_debrief", { role_id: role.id, loved, disliked });
      // Deliberately omit clearance_status_self_reported / citizenship_status_self_reported:
      // the user only asked for a debrief draft, never separately confirmed sharing those
      // specific self-reported fields, and the eval's own privacy rule forbids the agent
      // from injecting them unprompted.
      await call(client, s, "prepare_consented_card", {
        role_id: role.id,
        fields_user_approved: {
          headline: "New-grad SWE interested in autonomy work",
          highlights: ["Completed a 30-minute realistic job preview for this role"],
        },
      });
    }
  }

  // ---------- A9: Anduril automated rejection, no feedback ----------
  {
    const s = "A9";
    // Reuse the Anduril role already found in A1 if present; else look it up fresh.
    let role = scenarios["A1"]?.roleFound ?? null;
    if (!role) {
      const found = await findRoleForCompany(client, s, "Anduril", ["software engineer"]);
      role = found.role;
      scenarios[s] = { roleFound: role ?? null, searchAttempts: found.attempts, reusedFromA1: false };
    } else {
      scenarios[s] = { roleFound: role, reusedFromA1: true };
    }
    if (role) {
      await call(client, s, "get_role_rubric", { role_id: role.id });
      await call(client, s, "explain_rule", { topic: "sead4" });
    }
  }

  // ---------- A10: legal definition of "eligible for a clearance" for a US citizen ----------
  {
    const s = "A10";
    await call(client, s, "explain_rule", { topic: "sead4" });
    scenarios[s] = {};
  }

  await client.close();

  writeFileSync(
    "/Users/zakirjiwani/speedrunapps/scripts/_tmp-persona-a-eval-output.json",
    JSON.stringify(
      {
        serverVersion,
        toolNames: toolsList.tools.map((t) => ({ name: t.name, description: t.description })),
        resourceUris: resourcesList.resources.map((r) => r.uri),
        promptNames: promptsList.prompts.map((p) => p.name),
        scenarios,
        log,
      },
      null,
      2,
    ),
  );
  console.log("DONE. Total tool calls logged:", log.length);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exitCode = 1;
});
