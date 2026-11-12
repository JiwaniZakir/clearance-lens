/**
 * The ONE place the production MCP URL is defined. Every install snippet,
 * the Claude Code one-liner, and any other reference interpolates this —
 * never hand-duplicated (research/R2-design-system.md §3.2 / Do-Don't #4).
 */
export const SITE_URL = "https://clearance-lens.vercel.app";
export const MCP_URL = `${SITE_URL}/mcp`;
export const GITHUB_REPO_URL = "https://github.com/JiwaniZakir/clearance-lens";
export const CLAUDE_CODE_INSTALL_COMMAND = `claude mcp add --transport http clearance-lens ${MCP_URL}`;
