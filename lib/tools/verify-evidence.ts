import { z } from "zod";
import { getPublicSignalSummary, parseGitHubUsername } from "@/lib/github/client";
import { getGitLabPublicSignalSummary, parseGitLabUsername } from "@/lib/gitlab/client";
import { getCosignPublicProfile, parseCosignPath, CosignApiError } from "@/lib/cosign/client";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * Clearance Lens v2: extends the one existing "already-public evidence"
 * pattern (previously GitHub-only) to GitLab and Cosign, per the
 * "candidate-initiated, evidence-only" alternative to continuous
 * "AI twin" monitoring — the candidate explicitly points the agent at one
 * profile, one call, nothing passive or ongoing.
 *
 * Platform is detected from the input itself, not a separate parameter: a
 * gitlab.com URL routes to GitLab, a cosign.co URL routes to Cosign,
 * anything else (a bare username, or a github.com URL) keeps the original
 * GitHub behavior — so every existing call to this tool is unaffected.
 *
 * Cosign is surfaced only as this candidate-supplied, consent-based
 * evidence source — never as a ranking/prioritization input, and never via
 * Cosign's separate OAuth-gated "member" API that would expose private
 * endorsement/"would hire" data. That distinction, and why a referral/
 * ranking mechanism built on Cosign was explicitly declined, is recorded in
 * DECISIONS.md D-035/D-036.
 */

type Platform = "github" | "gitlab" | "cosign";

function detectPlatform(input: string): Platform {
  const trimmed = input.trim();
  if (/^https?:\/\/(?:www\.)?gitlab\.com\//i.test(trimmed)) return "gitlab";
  if (/^https?:\/\/(?:www\.)?cosign\.co\//i.test(trimmed)) return "cosign";
  return "github";
}

function looksLikeValidUsernameOrUrl(input: string): boolean {
  try {
    const platform = detectPlatform(input);
    if (platform === "gitlab") parseGitLabUsername(input);
    else if (platform === "cosign") parseCosignPath(input);
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
        "Expected a GitHub username, a https://github.com/<username> URL, a https://gitlab.com/<username> URL, or a https://cosign.co/<path> URL.",
    })
    .describe(
      "A GitHub username, a https://github.com/<username> profile URL, a https://gitlab.com/<username> profile URL, or a https://cosign.co/<path> profile URL (GitLab/Cosign are only used when that platform's own URL is given explicitly).",
    ),
});

const OutputSchema = z.object({
  platform: z.enum(["github", "gitlab", "cosign"]),
  profile: z.object({
    login: z.string(),
    name: z.string().nullable(),
    profileUrl: z.string(),
    bio: z.string().nullable(),
    publicRepoCount: z.number(),
    // Nullable, not just optional: GitLab's and Cosign's public,
    // unauthenticated APIs don't expose a follower count or account-creation
    // date at all (confirmed live against each real API, not assumed) —
    // null here means "not available from this platform without
    // authentication," which is meaningfully different from "zero" and
    // must never be reported as 0.
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
    "Summarizes a GitHub, GitLab, or Cosign profile's already-public signal via that platform's own public REST API only. No scraping, no private data, no authentication required of the user — and for Cosign specifically, never that platform's separate OAuth-gated endorsement/\"would hire\" data, only the same thin public directory fields anyone can already see. Pass a gitlab.com or cosign.co URL to check that platform specifically; anything else is checked against GitHub.",
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

    if (platform === "cosign") {
      const { entry, searchExhausted } = await getCosignPublicProfile(github_username_or_url);
      if (!entry) {
        throw new CosignApiError(
          "Cosign path not found",
          404,
          searchExhausted
            ? "We checked Cosign's full public directory and didn't find that path — double-check the spelling, or that the profile is published."
            : "We couldn't confirm that Cosign path within this search — Cosign's public API only supports paginated directory listing, not direct lookup, so a very new or obscure profile may sit past what one call can check. Try again, or double-check the path.",
        );
      }
      return {
        platform,
        profile: {
          login: entry.login,
          name: entry.name,
          profileUrl: entry.profileUrl,
          bio: entry.bio,
          publicRepoCount: entry.publicRepoCount,
          followers: entry.followers,
          accountCreatedAt: entry.accountCreatedAt,
        },
        topLanguages: entry.topLanguages,
        recentActivity: entry.recentActivity,
        sources: [{ title: `Cosign: ${entry.profileUrl}`, url: entry.profileUrl }],
        disclaimer:
          "This reflects only the same thin public directory entry (name, a linked handle, a photo) anyone can already see on Cosign right now — never that platform's separate, OAuth-gated endorsement or \"would hire\" data, and never used here to rank or prioritize this or any other candidate (see DECISIONS.md D-035/D-036). Cosign's public API doesn't expose repos, languages, followers, or an account-creation date at all. " +
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
