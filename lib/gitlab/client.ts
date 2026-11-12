/**
 * Public-signal lookup for verify_evidence's GitLab path. GitLab's public
 * REST API v4 only — no scraping, no private data, no auth required.
 *
 * Checked live against the real API before writing this (not assumed from
 * memory): unlike GitHub, GitLab's ANONYMOUS user-search endpoint
 * (`/users?username=`) returns only {id, username, name, state,
 * avatar_url, web_url, public_email} — no bio, no followers, no
 * account-creation date, and the single-user-by-id endpoint (`/users/:id`)
 * returns 403 without authentication. `getPublicSignalSummary` honestly
 * returns null for the fields GitLab's public API doesn't expose, rather
 * than fabricating a 0 or guessing — see verify-evidence.ts's disclaimer
 * handling for how this is surfaced to the caller.
 */

import { UpstreamApiError } from "@/lib/tools/upstream-error";

const API_BASE = "https://gitlab.com/api/v4";

export class GitLabApiError extends UpstreamApiError {}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  web_url: string;
}

interface GitLabProject {
  name: string;
  path_with_namespace: string;
  web_url: string;
  description: string | null;
  star_count: number;
  last_activity_at: string;
}

async function gitlabFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 600 } });
  if (!res.ok) {
    throw new GitLabApiError(`GitLab API returned ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/** Accepts either a bare username or a full https://gitlab.com/<user> URL. */
export function parseGitLabUsername(input: string): string {
  const trimmed = input.trim();
  const urlMatch = /^https?:\/\/(?:www\.)?gitlab\.com\/([A-Za-z0-9_.-]{1,255})\/?$/i.exec(trimmed);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_.-]{1,255}$/.test(trimmed)) return trimmed;
  throw new Error("Expected a GitLab username or a https://gitlab.com/<username> URL");
}

export interface GitLabPublicSignalSummary {
  login: string;
  name: string | null;
  profileUrl: string;
  bio: null; // not exposed by GitLab's anonymous API
  publicRepoCount: number;
  followers: null; // not exposed by GitLab's anonymous API
  accountCreatedAt: null; // not exposed by GitLab's anonymous API
  topLanguages: { language: string; repoCount: number }[]; // always [] — see module doc comment
  recentActivity: { repo: string; url: string; pushedAt: string; description: string | null }[];
}

export async function getGitLabPublicSignalSummary(usernameOrUrl: string): Promise<GitLabPublicSignalSummary> {
  const username = parseGitLabUsername(usernameOrUrl);
  const matches = await gitlabFetch<GitLabUser[]>(`/users?username=${encodeURIComponent(username)}`);
  const user = matches.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    throw new GitLabApiError(
      "GitLab user not found",
      404,
      "We couldn't find a GitLab user with that username — double-check the spelling, or that the profile is public.",
    );
  }

  const projectsRes = await fetch(
    `${API_BASE}/users/${user.id}/projects?visibility=public&order_by=last_activity_at&per_page=100`,
    { next: { revalidate: 600 } },
  );
  const projects: GitLabProject[] = projectsRes.ok ? ((await projectsRes.json()) as GitLabProject[]) : [];

  const recentActivity = [...projects]
    .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
    .slice(0, 5)
    .map((p) => ({ repo: p.name, url: p.web_url, pushedAt: p.last_activity_at, description: p.description }));

  return {
    login: user.username,
    name: user.name,
    profileUrl: user.web_url,
    bio: null,
    publicRepoCount: projects.length,
    followers: null,
    accountCreatedAt: null,
    // GitLab's project-list endpoint has no per-project primary-language
    // field the way GitHub's does (it would need a separate /languages
    // call per project) — left empty rather than N+1-fetching a "top
    // languages" list GitHub users get for free.
    topLanguages: [],
    recentActivity,
  };
}
