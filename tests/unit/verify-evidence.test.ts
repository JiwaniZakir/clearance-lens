import { describe, it, expect, vi } from "vitest";

// parseGitHubUsername is kept as the REAL implementation (via importActual)
// alongside the mocked getPublicSignalSummary -- it's a pure format-check
// util the input schema's own .refine() now calls directly (DECISIONS.md),
// so mocking it away would make every input look invalid regardless of
// content, which is exactly the bug this file's own new tests check for.
vi.mock("@/lib/github/client", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/github/client")>()),
  getPublicSignalSummary: vi.fn(),
}));

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

  // Regression for DECISIONS.md (judging panel round 1): a syntactically
  // invalid username/URL used to reach the handler, throw a plain Error
  // from parseGitHubUsername, and fall through callTool()'s generic
  // catch-all as a misleading "Something went wrong, please try again" --
  // wrong, since retrying the identical invalid input will always fail
  // the same way. It must now fail zod validation directly, with a
  // specific, actionable invalid_input message, before the handler runs.
  describe("input format validation (at the zod schema layer, not the handler)", () => {
    it("rejects a syntactically invalid value with a specific, actionable message", () => {
      const parsed = verifyEvidenceTool.inputSchema.safeParse({ github_username_or_url: "this is not valid" });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toMatch(/Expected a GitHub username/i);
      }
    });

    it("accepts a bare username", () => {
      expect(verifyEvidenceTool.inputSchema.safeParse({ github_username_or_url: "octocat" }).success).toBe(true);
    });

    it("accepts a full profile URL", () => {
      expect(
        verifyEvidenceTool.inputSchema.safeParse({ github_username_or_url: "https://github.com/octocat" }).success,
      ).toBe(true);
    });

    it("rejects a URL to a repo/sub-path, not a bare profile", () => {
      expect(
        verifyEvidenceTool.inputSchema.safeParse({ github_username_or_url: "https://github.com/octocat/Hello-World" })
          .success,
      ).toBe(false);
    });
  });
});
