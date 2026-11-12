import { NextResponse } from "next/server";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { RULES_LAST_VERIFIED } from "@/lib/rules-data";
import { TIMELINES_LAST_VERIFIED } from "@/lib/timelines-data";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "clearance-lens",
    toolCount: TOOL_REGISTRY.length,
    dataLastVerified: { rules: RULES_LAST_VERIFIED, timelines: TIMELINES_LAST_VERIFIED },
    timestamp: new Date().toISOString(),
  });
}
