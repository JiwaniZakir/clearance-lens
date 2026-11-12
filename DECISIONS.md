# Decisions Log

Format: `D-NNN` · date · decision · why · fallback/impact. Append-only; never silently edit a past entry (correct forward with a new entry if one turns out wrong).

---

### D-001 — 2026-11-11 — Disable Next.js 16 Cache Components
**Decision:** Leave `cacheComponents` and `partialPrefetching` **off** in `next.config.ts` (both default off; `partialPrefetching` cannot even be enabled without `cacheComponents`). Use conventional `fetch(url, { next: { revalidate } })` caching for the Speedrun API client instead of `"use cache"`/`cacheLife`.
**Why:** Next 16's Cache Components is a large, still-settling paradigm shift (confirmed via `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`). Every route in this app is either a dynamic MCP/API endpoint (no benefit from static prerendering — POST handlers are never cached regardless) or a playground page whose data is fetched client-side. Adopting the new directive across 11 tool routes + the MCP transport route for zero user-facing gain adds real risk to a judged production deliverable. Conventional fetch caching is stable, documented, and sufficient.
**Impact:** None on functionality or the judging rubric. Revisit only if a future iteration adds genuinely static, cacheable marketing content that would benefit from prerendering.

### D-002 — 2026-11-11 — Node engines pin
**Decision:** `package.json` → `"engines": { "node": ">=20.9.0" }`.
**Why:** Vercel's Node runtime; Next 16 requires Node ≥ 20.9. Local dev runs Node 25, which is compatible.
**Impact:** None.

### D-003 — 2026-11-11 — MCP server package choice (superseded by D-003b, see below)
**Decision (original, now corrected):** Build the MCP transport route with **`mcp-handler`** (Vercel's adapter, v2.3.x) wrapping **`@modelcontextprotocol/sdk`** (v1.32.x) `McpServer`, *not* the newer `@modelcontextprotocol/server` package.
**Why (original reasoning, based on an unverified assumption):** Assumed `@modelcontextprotocol/sdk` was still the primary package and `@modelcontextprotocol/server` was an unproven newcomer.
**Correction — see D-003b immediately below. Left here, not deleted, per the log's append-only rule.**

### D-003b — 2026-11-11 — MCP server package choice, corrected after checking `mcp-handler`'s actual peer dependency
**Decision:** Use **`@modelcontextprotocol/server`** (v2.4.0) for the server (`McpServer`, `registerTool`/`registerResource`/`registerPrompt`, `ResourceTemplate`), and **`@modelcontextprotocol/client`** (v2.4.0) for the protocol test's MCP client (`Client` + `StreamableHTTPClientTransport`). Dropped `@modelcontextprotocol/sdk` (v1.x) entirely.
**Why:** Before writing any server code, inspected `node_modules/mcp-handler/package.json` directly: its `peerDependencies` is `{"@modelcontextprotocol/server": "^2.0.0", "next": ">=13.0.0"}` — it does **not** depend on `@modelcontextprotocol/sdk` at all. Confirmed via context7 docs (`/modelcontextprotocol/typescript-sdk/v2.4.0`, `packages/server/README.md`): *"This is v2 of the MCP TypeScript SDK, the stable release line, implementing the 2026-07-28 MCP spec. It replaces the single `@modelcontextprotocol/sdk` package from v1."* Also confirmed the official `@modelcontextprotocol/inspector` (v2.15.0, used later for protocol conformance per spec §5) itself depends on `@modelcontextprotocol/{core,client,server}@2.4.0`, not the v1 `sdk` package. This directly answers the open question R1 was tasked with ("check whether the v2 `@modelcontextprotocol/server` package is the current recommendation") — yes, confirmed from the primary source before any tool code was written.
**Impact:** Server code imports from `@modelcontextprotocol/server`; the protocol test imports from `@modelcontextprotocol/client`. `mcp-handler`'s `createMcpHandler` is unaffected — it already expected this pairing.

### D-004 — 2026-11-11 — Package manager
**Decision:** pnpm throughout (matches local tooling and `create-next-app --use-pnpm`).
**Impact:** None.
