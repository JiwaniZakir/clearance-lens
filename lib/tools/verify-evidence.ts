import { z } from "zod";
import { getPublicSignalSummary, parseGitHubUsername } from "@/lib/github/client";
import { getGitLabPublicSignalSummary, parseGitLabUsername } from "@/lib/gitlab/client";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * Clearance Lens v2: extends the one existing "already-public evidence"
 * pattern (previously GitHub-only) to a second platform, per the
 * "candidate-initiated, evidence-only" alternative to continuous
 * "AI twin" monitoring — the candidate explicitly points the agent at one
 * profile, one call, nothing passive or ongoing.
 *
 * Platform is detected from the input itself, not a separate parameter:
 * a gitlab.com URL routes to GitLab, anything else (a bare username, or a
 * github.com URL) keeps the original GitHub behavior — so every existing
 * call to this tool is unaffected.
 */

type Platform = "github" | "gitlab";

function detectPlatform(input: string): Platform {
  return /^https?:\/\/(?:www\.)?gitlab\.com\//i.test(input.trim()) ? "gitlab" : "github";
}

function looksLikeValidUsernameOrUrl(input: string): boolean {
  try {
    if (detectPlatform(input) === "gitlab") parseGitLabUsername(input);
    else parseGitHubUsername(input);
    return true;
  } catch {
    return false;
  }
}

const InputSchema = z.object({
  // Format-checked here, not just inside the handler — found live via the
  // spec §5 judging panel (DECISIONS.md): a syntactically invalid value
  // (parseGitHubUsername throwing a plain Error) previously fell through
  // to callTool()'s generic catch-all, producing a misleading "Something
  // went wrong, please try again" that wrongly invites retrying input that
  // will deterministically fail again. Validating the format at the zod
  // layer gives it the same clear, specific "invalid_input" treatment
  // every other bad-input case already gets, before the handler even runs.
  github_username_or_url: z
    .string()
    .min(1)
    .max(200)
    .refine(looksLikeValidUsernameOrUrl, {
      message:
        "Expected a GitHub username, a https://github.com/<username> URL, or a https://gitlab.com/<username> URL.",
    })
    .describe(
      "A GitHub username, a https://github.com/<username> profile URL, or a https://gitlab.com/<username> profile URL (GitLab is only used when a gitlab.com URL is given explicitly).",
    ),
});

const OutputSchema = z.object({
  platform: z.enum(["github", "gitlab"]),
  profile: z.object({
    login: z.string(),
    name: z.string().nullable(),
    profileUrl: z.string(),
    bio: z.string().nullable(),
    publicRepoCount: z.number(),
    // Nullable, not just optional: GitLab's public, unauthenticated API
    // doesn't expose a follower count or account-creation date at all
    // (confirmed live against the real API, not assumed) — null here means
    // "not available from this platform without authentication," which is
    // meaningfully different from "zero" and must never be reported as 0.
    followers: z.number().nullable(),
    accountCreatedAt: z.string().nullable(),
  }),
  topLanguages: z.array(z.object({ language: z.string(), repoCount: z.number() })),
  recentActivity: z.array(
    z.object({ repo: z.string(), url: z.string(), pushedAt: z.string(), description: z.string().nullable() }),
  ),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const verifyEvidenceTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "verify_evidence",
  title: "Verify public coding evidence",
  description:
    "Summarizes a GitHub or GitLab profile's already-public signal (repo count, top languages where available, recent activity) via that platform's own public REST API only. No scraping, no private data, no authentication required of the user. Pass a gitlab.com URL to check GitLab specifically; anything else is checked against GitHub.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ github_username_or_url }) => {
    const platform = detectPlatform(github_username_or_url);

    if (platform === "gitlab") {
      const summary = await getGitLabPublicSignalSummary(github_username_or_url);
      return {
        platform,
        profile: {
          login: summary.login,
          name: summary.name,
          profileUrl: summary.profileUrl,
          bio: summary.bio,
          publicRepoCount: summary.publicRepoCount,
          followers: summary.followers,
          accountCreatedAt: summary.accountCreatedAt,
        },
        topLanguages: summary.topLanguages,
        recentActivity: summary.recentActivity,
        sources: [{ title: `GitLab: ${summary.profileUrl}`, url: summary.profileUrl }],
        disclaimer:
          "This reflects only what's already public on GitLab right now — it's a signal, not a verification of employment history or skill level, and says nothing about private repos or work done elsewhere. GitLab's public API doesn't expose a follower count, account-creation date, or per-project language without authentication, so those fields are left null here rather than guessed. " +
          DISCLAIMERS.noDemographicInference,
      };
    }

    const summary = await getPublicSignalSummary(github_username_or_url);
    return {
      platform,
      profile: {
        login: summary.login,
        name: summary.name,
        profileUrl: summary.profileUrl,
        bio: summary.bio,
        publicRepoCount: summary.publicRepoCount,
        followers: summary.followers,
        accountCreatedAt: summary.accountCreatedAt,
      },
      topLanguages: summary.topLanguages,
      recentActivity: summary.recentActivity,
      sources: [{ title: `GitHub: ${summary.profileUrl}`, url: summary.profileUrl }],
      disclaimer:
        "This reflects only what's already public on GitHub right now — it's a signal, not a verification of employment history or skill level, and says nothing about private repos or work done elsewhere. " +
        DISCLAIMERS.noDemographicInference,
    };
  },
};
