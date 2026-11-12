import { NextResponse } from "next/server";
import { getToolByName } from "@/lib/tools/registry";
import { callTool, type ToolErrorCode } from "@/lib/tools/wrap";

/**
 * The /try playground calls this route, which runs the EXACT same
 * lib/tools/* implementations as the MCP route via the same callTool
 * pipeline (spec §3.3) — no second copy of any tool's logic.
 */

const STATUS_BY_CODE: Record<ToolErrorCode, number> = {
  pii_cui_rejected: 400,
  invalid_input: 400,
  not_found: 404,
  upstream_error: 502,
  internal_error: 500,
};

const MAX_BODY_BYTES = 20_000;

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const def = getToolByName(name);
  if (!def) {
    return NextResponse.json(
      { ok: false, error: { code: "not_found", message: `Unknown tool "${name}".` } },
      { status: 404 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_input", message: "Request body is too large." } },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_input", message: "Request body must be valid JSON." } },
      { status: 400 },
    );
  }

  const result = await callTool(def, body);
  if (!result.ok) {
    return NextResponse.json(result, { status: STATUS_BY_CODE[result.error.code] });
  }
  return NextResponse.json(result, { status: 200 });
}

/** Metadata for this one tool (see app/api/tools/route.ts for the full list). */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const def = getToolByName(name);
  if (!def) {
    return NextResponse.json(
      { ok: false, error: { code: "not_found", message: `Unknown tool "${name}".` } },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: { name: def.name, title: def.title, description: def.description } });
}
