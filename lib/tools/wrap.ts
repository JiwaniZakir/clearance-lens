import { z } from "zod";
import { assertNoPiiCui, PiiCuiError } from "@/lib/guard/pii";
import { SpeedrunApiError } from "@/lib/speedrun/client";
import { GitHubApiError } from "@/lib/github/client";
import { logServerError } from "@/lib/log";

/** Every tool output that cites a fact includes `sources`; this is the one
 * shape used everywhere so SOURCES.md / link-check tests can walk every tool
 * output uniformly. */
export const SourceRefSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  lastVerified: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export interface ToolDef<TInput = unknown, TOutput = unknown> {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  handler: (input: TInput) => Promise<TOutput>;
}

export type ToolErrorCode =
  | "pii_cui_rejected"
  | "invalid_input"
  | "upstream_error"
  | "not_found"
  | "internal_error";

export interface ToolError {
  code: ToolErrorCode;
  message: string;
}

export type ToolCallResult<TOutput> = { ok: true; data: TOutput } | { ok: false; error: ToolError };

// Generous for free-text fields (e.g. a bio in prepare_consented_card), far
// below anything that looks like an abuse/DoS attempt against a stateless
// per-request handler.
const MAX_INPUT_BYTES = 20_000;

class ToolInputTooLargeError extends Error {
  constructor(size: number) {
    super(`Input is too large (${size} bytes; limit is ${MAX_INPUT_BYTES} bytes).`);
    this.name = "ToolInputTooLargeError";
  }
}

function assertInputSize(raw: unknown): void {
  const size = Buffer.byteLength(JSON.stringify(raw ?? {}), "utf8");
  if (size > MAX_INPUT_BYTES) {
    throw new ToolInputTooLargeError(size);
  }
}

function formatZodError(error: z.ZodError): string {
  const issues = error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  return `Invalid input — ${issues.join("; ")}`;
}

/**
 * The single entry point every tool call goes through, from both the MCP
 * route and the /api/tools/* playground route (spec §3.3: "one shared
 * lib/tools/* used by both ... no duplicated logic"). Order matters:
 * size limit → PII/CUI guard → zod input validation → handler → zod output
 * validation. The PII guard runs on the RAW input, before zod even looks at
 * it — zod only checks shape/type, so without this step a string field would
 * happily accept an SSN.
 */
export async function callTool<TInput, TOutput>(
  def: ToolDef<TInput, TOutput>,
  rawInput: unknown,
): Promise<ToolCallResult<TOutput>> {
  try {
    assertInputSize(rawInput);
    assertNoPiiCui(rawInput);
  } catch (err) {
    if (err instanceof PiiCuiError) {
      return { ok: false, error: { code: "pii_cui_rejected", message: err.message } };
    }
    if (err instanceof ToolInputTooLargeError) {
      return { ok: false, error: { code: "invalid_input", message: err.message } };
    }
    throw err;
  }

  const parsed = def.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: { code: "invalid_input", message: formatZodError(parsed.error) } };
  }

  let result: TOutput;
  try {
    result = await def.handler(parsed.data);
  } catch (err) {
    if (err instanceof SpeedrunApiError || err instanceof GitHubApiError) {
      logServerError("upstream_error", def.name, `${err.name}:${err.status}`);
      return {
        ok: false,
        error: {
          code: err.status === 404 ? "not_found" : "upstream_error",
          message:
            err.status === 404
              ? "We couldn't find that — it may have been filled or removed since you last searched."
              : "A data source this tool depends on is temporarily unavailable. Please try again shortly.",
        },
      };
    }
    logServerError("handler_threw", def.name, err instanceof Error ? err.message : String(err));
    return {
      ok: false,
      error: {
        code: "internal_error",
        message: "Something went wrong generating this response. Please try again.",
      },
    };
  }

  const validatedOutput = def.outputSchema.safeParse(result);
  if (!validatedOutput.success) {
    logServerError("output_schema_mismatch", def.name, formatZodError(validatedOutput.error));
    return {
      ok: false,
      error: {
        code: "internal_error",
        message: "Something went wrong generating this response. Please try again.",
      },
    };
  }

  return { ok: true, data: validatedOutput.data };
}
