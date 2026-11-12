/**
 * Public-signal lookup for verify_evidence's Cosign path. Cosign's public
 * directory REST API only (https://cosign.co/openapi.json, fetched and read
 * directly before writing this, not assumed from secondary coverage) — no
 * scraping, no OAuth, no private "cosign"/endorsement/"would hire" data,
 * which that same spec documents as sitting behind a separate OAuth-gated
 * member MCP this product deliberately does not integrate (see DECISIONS.md
 * D-035/D-036: a referral/ranking mechanism built on that private data was
 * explicitly declined on hard-constraint and legal grounds).
 *
 * Important, confirmed-live constraint this client works around: unlike
 * GitHub/GitLab, Cosign's public API has NO endpoint to fetch one profile by
 * its path directly — only a cursor-paginated LIST of the whole directory
 * (confirmed via the full openapi.json: exactly 3 paths exist total,
 * /directory/people, /directory/companies, and the unrelated OAuth /mcp).
 * Finding one specific candidate-supplied path means paginating that list
 * looking for a match, which this client bounds by both a page count and a
 * wall-clock deadline (mirroring lib/tools/search-defense-roles.ts's
 * PAGE_SCAN_DEADLINE_MS pattern) rather than searching unboundedly — pages
 * are often sparse (confirmed live: a 60-per-page request can return as few
 * as 0-8 real items, with nextCursor still non-null), so a page-count bound
 * alone wouldn't reliably cap latency.
 */

import { UpstreamApiError } from "@/lib/tools/upstream-error";

const API_BASE = "https://cosign.co/api/v1";
const MAX_PAGES_SCANNED = 15;
const SEARCH_DEADLINE_MS = 8000;

export class CosignApiError extends UpstreamApiError {}

interface CosignDirectoryEntry {
  path: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  updatedAt: number;
}

interface CosignDirectoryPage {
  items: CosignDirectoryEntry[];
  nextCursor: string | null;
}

function backoff(attempt: number, explicitMs?: number): Promise<void> {
  const ms = explicitMs ?? Math.min(1000 * 2 ** attempt, 4000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDirectoryPage(cursor: string | null): Promise<CosignDirectoryPage> {
  const url = new URL(`${API_BASE}/directory/people`);
  url.searchParams.set("limit", "60");
  if (cursor) url.searchParams.set("cursor", cursor);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { next: { revalidate: 60 } }); // matches Cosign's own documented cache window
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await backoff(attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined);
      continue;
    }
    if (!res.ok) throw new CosignApiError(`Cosign API returned ${res.status}`, res.status);
    return (await res.json()) as CosignDirectoryPage;
  }
  throw new CosignApiError("Cosign API unreachable after retries", 503);
}

/** Accepts either a bare path/slug ("sytses", "/sytses", "x/sytses") or a
 * full https://cosign.co/<path> URL — Cosign's own canonical paths can
 * include a leading category segment (e.g. "/x/esk3nder"), confirmed live,
 * so this does not assume a single flat slug the way GitHub's does. */
export function parseCosignPath(input: string): string {
  const trimmed = input.trim();
  const urlMatch = /^https?:\/\/(?:www\.)?cosign\.co\/([A-Za-z0-9_/.-]{1,200})\/?$/i.exec(trimmed);
  const raw = urlMatch ? urlMatch[1] : trimmed;
  if (!urlMatch && !/^\/?[A-Za-z0-9_/.-]{1,200}$/.test(trimmed)) {
    throw new Error("Expected a Cosign path or a https://cosign.co/<path> URL");
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export interface CosignPublicSignalSummary {
  login: string;
  name: string | null;
  profileUrl: string;
  bio: string | null; // Cosign's "description" field — for a person this is
  // typically a linked social handle (e.g. "@sytses"), not a self-written
  // bio the way GitHub/GitLab use the term; surfaced as-is, not reworded.
  publicRepoCount: 0; // not a concept Cosign's directory has
  followers: null; // not exposed by Cosign's public directory
  accountCreatedAt: null; // Cosign exposes only `updatedAt`, not a creation date
  topLanguages: []; // not a concept Cosign's directory has
  recentActivity: []; // not exposed by Cosign's public directory
}

/** Returns null (not an error) when the path genuinely isn't found after an
 * exhaustive search (nextCursor reached null), vs. throwing when the search
 * was cut off by MAX_PAGES_SCANNED/SEARCH_DEADLINE_MS before exhausting the
 * directory — callers must be able to tell "confirmed absent" apart from
 * "search was incomplete," which is exactly what searchExhausted carries. */
export async function getCosignPublicProfile(
  path: string,
): Promise<{ entry: CosignPublicSignalSummary | null; searchExhausted: boolean }> {
  const target = parseCosignPath(path);
  const deadline = Date.now() + SEARCH_DEADLINE_MS;
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES_SCANNED; page++) {
    if (Date.now() > deadline) return { entry: null, searchExhausted: false };

    const result = await fetchDirectoryPage(cursor);
    const match = result.items.find((item) => item.path === target);
    if (match) {
      return {
        entry: {
          login: match.path.replace(/^\//, ""),
          name: match.name,
          profileUrl: `https://cosign.co${match.path}`,
          bio: match.description,
          publicRepoCount: 0,
          followers: null,
          accountCreatedAt: null,
          topLanguages: [],
          recentActivity: [],
        },
        searchExhausted: false,
      };
    }
    if (result.nextCursor === null) return { entry: null, searchExhausted: true };
    cursor = result.nextCursor;
  }
  return { entry: null, searchExhausted: false };
}
