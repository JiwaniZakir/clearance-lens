/**
 * Metadata-only structured logging. Hard constraint (spec §1.1): "Logs must be
 * scrubbed (no request bodies)." Every call site here passes a tool/route name
 * and small, enumerable metadata (status, latency, error code) — never the
 * input payload, never free text that could contain what a user typed.
 */

type LogFields = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  // Structured, single-line, body-free. In this deployment target, stdout is
  // Vercel's own log pipeline — no separate log database to manage or leak from.
  const line = { level, event, ...fields };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

/** Logs a server-side failure by tool/route + error kind only — never the
 * triggering input, and never the raw error message if it might embed input
 * (e.g. a zod issue path is fine; an upstream error message is fine; a raw
 * user string never reaches here because callers pass structured fields). */
export function logServerError(kind: string, toolName: string, detail?: string) {
  log.error("tool_error", { kind, tool: toolName, detail: detail?.slice(0, 300) });
}
