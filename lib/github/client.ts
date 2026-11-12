/**
 * Public-signal lookup for the verify_evidence tool. GitHub's public REST API
 * only — no scraping, no private data, no auth required (an optional
 * GITHUB_TOKEN env var raises the rate limit from 60/hr to 5,000/hr but is
 * never required; see DECISIONS.md). Returns only what's already public on a
 * user's profile: repo count/names, languages, recent activity timestamps.
 */

const API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  readonly status: number;
  /** See SpeedrunApiError's identical field (lib/speedrun/client.ts) for why
   * this exists: lib/tools/wrap.ts's shared callTool() catch previously
   * used one generic, job-posting-flavored 404 message for every entity
   * type, including a GitHub profile, which doesn't get "filled" the way a
   * job posting does. */
  readonly userMessage?: string;
  constructor(message: string, status: number, userMessage?: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

function authHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  created_at: string;
  blog: string | null;
  company: string | null;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  pushed_at: string;
  archived: boolean;
}

export interface PublicSignalSummary {
  login: string;
  name: string | null;
  profileUrl: string;
  bio: string | null;
  publicRepoCount: number;
  followers: number;
  accountCreatedAt: string;
  topLanguages: { language: string; repoCount: number }[];
  recentActivity: { repo: string; url: string; pushedAt: string; description: string | null }[];
  rateLimitRemaining: number | null;
}

async function githubFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(), next: { revalidate: 600 } });
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 404) {
    throw new GitHubApiError(
      "GitHub user not found",
      404,
      "We couldn't find a GitHub user with that username — double-check the spelling, or that the profile is public.",
    );
  }
  if (res.status === 403 && remaining === "0") {
    const resetAt = res.headers.get("x-ratelimit-reset");
    throw new GitHubApiError(
      `GitHub API rate limit reached${resetAt ? ` (resets ${new Date(Number(resetAt) * 1000).toISOString()})` : ""}`,
      429,
    );
  }
  if (!res.ok) {
    throw new GitHubApiError(`GitHub API returned ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/** Accepts either a bare username or a full https://github.com/<user> URL. */
export function parseGitHubUsername(input: string): string {
  const trimmed = input.trim();
  const urlMatch = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/?$/i.exec(trimmed);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9-]{1,39}$/.test(trimmed)) return trimmed;
  throw new Error("Expected a GitHub username or a https://github.com/<username> URL");
}

export async function getPublicSignalSummary(usernameOrUrl: string): Promise<PublicSignalSummary> {
  const username = parseGitHubUsername(usernameOrUrl);
  const [user, reposRes] = await Promise.all([
    githubFetch<GitHubUser>(`/users/${encodeURIComponent(username)}`),
    fetch(`${API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, {
      headers: authHeaders(),
      next: { revalidate: 600 },
    }),
  ]);

  let repos: GitHubRepo[] = [];
  const rateLimitRemaining = reposRes.headers.get("x-ratelimit-remaining");
  if (reposRes.ok) {
    repos = (await reposRes.json()) as GitHubRepo[];
  }

  const nonForkRepos = repos.filter((r) => !r.fork && !r.archived);
  const languageCounts = new Map<string, number>();
  for (const repo of nonForkRepos) {
    if (!repo.language) continue;
    languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  }
  const topLanguages = [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([language, repoCount]) => ({ language, repoCount }));

  const recentActivity = [...nonForkRepos]
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 5)
    .map((r) => ({ repo: r.name, url: r.html_url, pushedAt: r.pushed_at, description: r.description }));

  return {
    login: user.login,
    name: user.name,
    profileUrl: `https://github.com/${user.login}`,
    bio: user.bio,
    publicRepoCount: user.public_repos,
    followers: user.followers,
    accountCreatedAt: user.created_at,
    topLanguages,
    recentActivity,
    rateLimitRemaining: rateLimitRemaining ? Number(rateLimitRemaining) : null,
  };
}
