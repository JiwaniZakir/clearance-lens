import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/github/client", () => ({ getPublicSignalSummary: vi.fn() }));

import { getPublicSignalSummary } from "@/lib/github/client";
import { verifyEvidenceTool } from "@/lib/tools/verify-evidence";

describe("verify_evidence", () => {
  it("maps the public-signal summary into the tool's output shape with a source citation", async () => {
    vi.mocked(getPublicSignalSummary).mockResolvedValueOnce({
      login: "octocat",
      name: "The Octocat",
      profileUrl: "https://github.com/octocat",
      bio: "hi",
      publicRepoCount: 8,
      followers: 100,
      accountCreatedAt: "2011-01-01T00:00:00Z",
      topLanguages: [{ language: "TypeScript", repoCount: 3 }],
      recentActivity: [{ repo: "a", url: "https://github.com/octocat/a", pushedAt: "2026-01-01T00:00:00Z", description: null }],
      rateLimitRemaining: 58,
    });

    const result = await verifyEvidenceTool.handler({ github_username_or_url: "octocat" });
    expect(result.profile.login).toBe("octocat");
    expect(result.sources).toEqual([{ title: "GitHub: https://github.com/octocat", url: "https://github.com/octocat" }]);
    expect(result.disclaimer).toMatch(/already public on GitHub/i);
  });

  it("never claims to verify employment history or skill level", async () => {
    vi.mocked(getPublicSignalSummary).mockResolvedValueOnce({
      login: "u",
      name: null,
      profileUrl: "https://github.com/u",
      bio: null,
      publicRepoCount: 0,
      followers: 0,
      accountCreatedAt: "2026-01-01T00:00:00Z",
      topLanguages: [],
      recentActivity: [],
      rateLimitRemaining: null,
    });
    const result = await verifyEvidenceTool.handler({ github_username_or_url: "u" });
    expect(result.disclaimer).toMatch(/not a verification of employment/i);
  });
});
