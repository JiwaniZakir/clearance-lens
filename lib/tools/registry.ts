import type { ToolDef } from "@/lib/tools/wrap";
import { explainRuleTool } from "@/lib/tools/explain-rule";
import { estimateTimelineTool } from "@/lib/tools/estimate-timeline";
import { searchDefenseRolesTool } from "@/lib/tools/search-defense-roles";
import { verifyEvidenceTool } from "@/lib/tools/verify-evidence";
import { getCompanyProfileTool } from "@/lib/tools/get-company-profile";
import { buildTrialAssessmentTool } from "@/lib/tools/build-trial-assessment";
import { runJobPreviewTool } from "@/lib/tools/run-job-preview";
import { getRoleRubricTool } from "@/lib/tools/get-role-rubric";
import { readinessBriefTool } from "@/lib/tools/readiness-brief";
import { fitDebriefTool } from "@/lib/tools/fit-debrief";
import { prepareConsentedCardTool } from "@/lib/tools/prepare-consented-card";

/**
 * The single list of every tool this server exposes. Both app/mcp/route.ts
 * (MCP transport) and app/api/tools/[name]/route.ts (web playground) iterate
 * this same array — adding a tool here is the only step needed to expose it
 * on both surfaces (spec §3.3: "no duplicated logic").
 */
// `any` here (not `unknown`) is deliberate: a heterogeneous registry of
// generically-typed definitions is contravariant in `handler`'s parameter, so
// a concrete ToolDef<I, O> is never assignable to ToolDef<unknown, unknown>.
// Type safety for each tool is enforced at its own definition site (its
// handler is fully typed against its own schemas there); this array only
// needs to be iterable and callable, which `callTool` provides generically.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_REGISTRY: ToolDef<any, any>[] = [
  explainRuleTool,
  estimateTimelineTool,
  searchDefenseRolesTool,
  verifyEvidenceTool,
  getCompanyProfileTool,
  buildTrialAssessmentTool,
  runJobPreviewTool,
  getRoleRubricTool,
  readinessBriefTool,
  fitDebriefTool,
  prepareConsentedCardTool,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getToolByName(name: string): ToolDef<any, any> | undefined {
  return TOOL_REGISTRY.find((t) => t.name === name);
}
