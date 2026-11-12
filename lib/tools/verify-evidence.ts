import { z } from "zod";
import { getPublicSignalSummary, parseGitHubUsername } from "@/lib/github/client";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

function looksLikeValidGitHubUsernameOrUrl(input: string): boolean {
  try {
    parseGitHubUsername(input);
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
    .refine(looksLikeValidGitHubUsernameOrUrl, {
      message: "Expected a GitHub username (letters/digits/hyphens, 1-39 characters) or a https://github.com/<username> URL.",
    })
    .describe("A GitHub username, or a https://github.com/<username> profile URL."),
});

const OutputSchema = z.object({
  profile: z.object({
    login: z.string(),
    name: z.string().nullable(),
    profileUrl: z.string(),
    bio: z.string().nullable(),
    publicRepoCount: z.number(),
    followers: z.number(),
    accountCreatedAt: z.string(),
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
    "Summarizes a GitHub profile's already-public signal (repo count, top languages, recent activity) via GitHub's public REST API only. No scraping, no private data, no authentication required of the user.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ github_username_or_url }) => {
    const summary = await getPublicSignalSummary(github_username_or_url);
    return {
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
