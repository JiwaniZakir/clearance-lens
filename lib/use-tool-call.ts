"use client";

import { useCallback, useRef, useState } from "react";
import type { ToolErrorShape } from "@/lib/try-tool-types";

type ToolCallResult<TOutput> = { ok: true; data: TOutput } | { ok: false; error: ToolErrorShape };

export interface UseToolCallState<TOutput> {
  data: TOutput | null;
  error: ToolErrorShape | null;
  loading: boolean;
}

/**
 * Thin client wrapper around `POST /api/tools/{name}`, matching the exact
 * `{ok:true,data} | {ok:false,error:{code,message}}` contract that
 * app/api/tools/[name]/route.ts always returns (status code already set
 * appropriately by the route — we only read the body here, never `res.ok`,
 * since the route returns a well-formed JSON body on every status).
 *
 * One hook instance = one independent in-flight call + its own
 * data/error/loading state, so a page can mount several (one per tab, one
 * per role-picker, etc.) without them fighting over state. A monotonically
 * increasing request id guards against a slow, superseded call overwriting
 * the result of a newer one fired from the same hook instance.
 */
export function useToolCall<TInput, TOutput>(toolName: string) {
  const [state, setState] = useState<UseToolCallState<TOutput>>({
    data: null,
    error: null,
    loading: false,
  });
  const requestId = useRef(0);

  const call = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      const id = ++requestId.current;
      setState((s) => ({ ...s, loading: true, error: null }));

      let res: Response;
      try {
        res = await fetch(`/api/tools/${toolName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch {
        if (id !== requestId.current) return null;
        const error: ToolErrorShape = {
          code: "network_error",
          message: "Couldn't reach Clearance Lens. Check your connection and try again.",
        };
        setState({ data: null, error, loading: false });
        return null;
      }

      let json: ToolCallResult<TOutput>;
      try {
        json = (await res.json()) as ToolCallResult<TOutput>;
      } catch {
        if (id !== requestId.current) return null;
        const error: ToolErrorShape = {
          code: "parse_error",
          message: "The server sent back something we couldn't read. Please try again.",
        };
        setState({ data: null, error, loading: false });
        return null;
      }

      if (id !== requestId.current) return null; // superseded by a newer call

      if (json.ok) {
        setState({ data: json.data, error: null, loading: false });
        return json.data;
      }
      setState({ data: null, error: json.error, loading: false });
      return null;
    },
    [toolName],
  );

  const reset = useCallback(() => setState({ data: null, error: null, loading: false }), []);

  return { ...state, call, reset };
}
