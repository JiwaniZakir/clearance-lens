/**
 * Shared base for every "this tool depends on an upstream API" error class
 * (Speedrun, GitHub, GitLab, Cosign, ...). lib/tools/wrap.ts's callTool()
 * catches this ONE base class instead of listing each subclass by name —
 * found live twice in this project's own history (DECISIONS.md): the
 * original check covered only Speedrun/GitHub, and when GitLabApiError was
 * added for verify_evidence's GitLab path, it was never added to that list,
 * so a nonexistent GitLab username silently fell back to a generic
 * "something went wrong, please try again" instead of GitLab client's own
 * specific not-found text. Extending this base, rather than naming each
 * subclass in wrap.ts, means a newly-added upstream client can't repeat
 * that mistake a third time.
 */
export class UpstreamApiError extends Error {
  readonly status: number;
  /** Set at the specific throw site that knows what was being looked up
   * (e.g. "a company slug" vs. "a GitHub username") — wrap.ts prefers this
   * over its own generic 404 fallback when present. */
  readonly userMessage?: string;
  constructor(message: string, status: number, userMessage?: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.userMessage = userMessage;
  }
}
