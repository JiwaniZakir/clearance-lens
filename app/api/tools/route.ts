import { NextResponse } from "next/server";
import { TOOL_REGISTRY } from "@/lib/tools/registry";

/** Lists every tool (name/title/description) for the /try playground's tool
 * picker, so the frontend never hardcodes a second copy of this list. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: TOOL_REGISTRY.map((t) => ({ name: t.name, title: t.title, description: t.description })),
  });
}
