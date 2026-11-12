import { describe, it, expect, vi, afterEach } from "vitest";
import { getPublicSignalSummary, parseGitHubUsername, GitHubApiError } from "@/lib/github/client";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

describe("parseGitHubUsername", () => {
  it("accepts a bare username", () => {
    expect(parseGitHubUsername("octocat")).toBe("octocat");
  });
  it("extracts the username from a profile URL", () => {
    expect(parseGitHubUsername("https://github.com/octocat")).toBe("octocat");
    expect(parseGitHubUsername("https://github.com/octocat/")).toBe("octocat");
  });
  it("rejects a URL to anything other than a bare profile (defense-in-depth, not a repo/private path)", () => {
    expect(() => parseGitHubUsername("https://github.com/octocat/Hello-World")).toThrow();
  });
  it("rejects an empty or invalid-char string", () => {
    expect(() => parseGitHubUsername("")).toThrow();
    expect(() => parseGitHubUsername("not a username!")).toThrow();
  });
});

describe("getPublicSignalSummary", () => {
  it("summarizes only public fields and surfaces top languages + recent activity", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { name: "a", full_name: "u/a", html_url: "https://github.com/u/a", description: "d", language: "TypeScript", stargazers_count: 1, fork: false, pushed_at: "2026-01-02T00:00:00Z", archived: false },
              { name: "b", full_name: "u/b", html_url: "https://github.com/u/b", description: null, language: "TypeScript", stargazers_count: 0, fork: true, pushed_at: "2026-01-03T00:00:00Z", archived: false },
            ]),
            { status: 200, headers: { "x-ratelimit-remaining": "59" } },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ login: "u", name: "U Ser", bio: "hi", public_repos: 2, followers: 3, created_at: "2020-01-01T00:00:00Z", blog: null, company: null }),
          { status: 200 },
        ),
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const summary = await getPublicSignalSummary("u");
    expect(summary.login).toBe("u");
    expect(summary.topLanguages[0]).toEqual({ language: "TypeScript", repoCount: 1 }); // the fork is excluded
    expect(summary.recentActivity).toHaveLength(1);
  });

  it("throws GitHubApiError(404) for an unknown user", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 })) as unknown as typeof fetch;
    await expect(getPublicSignalSummary("doesnotexist")).rejects.toBeInstanceOf(GitHubApiError);
  });

  it("surfaces a clear rate-limit error instead of a generic failure", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "9999999999" } }),
    ) as unknown as typeof fetch;
    await expect(getPublicSignalSummary("u")).rejects.toMatchObject({ status: 429 });
  });
});
