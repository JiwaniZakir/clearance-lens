import { describe, it, expect, vi, afterEach } from "vitest";
import { getGitLabPublicSignalSummary, parseGitLabUsername, GitLabApiError } from "@/lib/gitlab/client";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

describe("parseGitLabUsername", () => {
  it("accepts a bare username", () => {
    expect(parseGitLabUsername("sytses")).toBe("sytses");
  });
  it("extracts the username from a profile URL", () => {
    expect(parseGitLabUsername("https://gitlab.com/sytses")).toBe("sytses");
    expect(parseGitLabUsername("https://gitlab.com/sytses/")).toBe("sytses");
  });
  it("rejects an empty or invalid-char string", () => {
    expect(() => parseGitLabUsername("")).toThrow();
    expect(() => parseGitLabUsername("not a username!")).toThrow();
  });
});

describe("getGitLabPublicSignalSummary", () => {
  it("summarizes only public fields, honestly nulling what GitLab's anonymous API doesn't expose", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/users?username=")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: 42, username: "sytses", name: "Sid Sijbrandij", web_url: "https://gitlab.com/sytses" }]),
            { status: 200 },
          ),
        );
      }
      if (url.includes("/projects")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                name: "gitlab",
                path_with_namespace: "sytses/gitlab",
                web_url: "https://gitlab.com/sytses/gitlab",
                description: "d",
                star_count: 1,
                last_activity_at: "2026-01-02T00:00:00Z",
              },
            ]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const summary = await getGitLabPublicSignalSummary("sytses");
    expect(summary.login).toBe("sytses");
    expect(summary.publicRepoCount).toBe(1);
    expect(summary.followers).toBeNull();
    expect(summary.accountCreatedAt).toBeNull();
    expect(summary.topLanguages).toEqual([]);
    expect(summary.recentActivity).toHaveLength(1);
  });

  it("throws GitLabApiError(404) with a specific userMessage for an unknown username", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })) as unknown as typeof fetch;
    const err = await getGitLabPublicSignalSummary("doesnotexist").catch((e) => e);
    expect(err).toBeInstanceOf(GitLabApiError);
    expect(err.userMessage).toMatch(/double-check the spelling/i);
  });
});
