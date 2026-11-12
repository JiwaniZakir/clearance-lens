import { z } from "zod";
import { getPublicSignalSummary } from "@/lib/github/client";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

const InputSchema = z.object({
  github_username_or_url: z
    .string()
    .min(1)
    .max(200)
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
