import type {
  SpeedrunCompanyResponse,
  SpeedrunJobDetailResponse,
  SpeedrunJobSearchParams,
  SpeedrunJobSearchResponse,
} from "./types";

const BASE_URL = "https://speedrun-talent-network.com/api/v1";
/** Identifies us to the upstream per their fair-use docs ("optional ?source= for
 * attribution and better treatment") — never the user's query text, just our
 * own app name. This is the only "identifier" that crosses this boundary. */
const SOURCE = "clearance-lens";
/** Matches the upstream's own edge-cache window (1-5 min per their docs), so we
 * are never serving staler data than they would anyway. */
const REVALIDATE_SECONDS = 300;
const MAX_RETRIES = 3;

export class SpeedrunApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SpeedrunApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("source", SOURCE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
      });
    } catch (err) {
      lastError = err;
      await backoff(attempt);
      continue;
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await backoff(attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined);
      continue;
    }

    if (!res.ok) {
      let code: string | undefined;
      let message = `Speedrun API returned ${res.status}`;
      try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        if (body?.error) {
          code = body.error.code;
          message = body.error.message ?? message;
        }
      } catch {
        // body wasn't JSON — keep the generic message
      }
      throw new SpeedrunApiError(message, res.status, code);
    }

    return (await res.json()) as T;
  }
  throw lastError instanceof Error
    ? lastError
    : new SpeedrunApiError("Speedrun API unreachable after retries", 503);
}

function backoff(attempt: number, explicitMs?: number): Promise<void> {
  const ms = explicitMs ?? Math.min(1000 * 2 ** attempt, 4000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchJobs(params: SpeedrunJobSearchParams): Promise<SpeedrunJobSearchResponse> {
  const url = buildUrl("/jobs", {
    q: params.q,
    industry: params.industry,
    loc: params.loc,
    remote: params.remote,
    page: params.page,
    scope: params.scope,
  });
  return fetchJson<SpeedrunJobSearchResponse>(url);
}

export async function getJob(id: string): Promise<SpeedrunJobDetailResponse> {
  const url = buildUrl(`/jobs/${encodeURIComponent(id)}`, {});
  return fetchJson<SpeedrunJobDetailResponse>(url);
}

export async function getCompany(slug: string): Promise<SpeedrunCompanyResponse> {
  const url = buildUrl(`/companies/${encodeURIComponent(slug)}`, {});
  return fetchJson<SpeedrunCompanyResponse>(url);
}
