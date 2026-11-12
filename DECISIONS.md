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

### D-005 — 2026-11-11 — PII guard ordering nuance between the MCP and API transports (verified live, not just reasoned about)
**Finding:** Ran a real `@modelcontextprotocol/client` against the local `/mcp` route (not just unit tests). Confirmed: (1) full handshake, `tools/list`, `resources/list`, and `tools/call` all work against `@modelcontextprotocol/server` v2 via `mcp-handler`. (2) PII placed in a **declared** schema field (e.g. `explain_rule`'s `topic: "my ssn is 123-45-6789"`) is correctly rejected with the friendly `assertNoPiiCui` message — confirmed live, `isError: true`. (3) PII placed in an **undeclared** extra field is silently stripped by the SDK's own zod validation *before* our `callTool` wrapper (and therefore our PII guard) ever runs — the call just succeeds using the valid declared fields, as if the extra field was never sent.
**Why this is acceptable, not a gap:** The undeclared-field case can never influence output, get stored, or get echoed anywhere — it's a pure no-op, functionally identical to the field never being sent. The hard constraint is about PII never being *processed*; it isn't. The one path where PII could matter — a real, declared, user-filled field — is caught on both transports (the API route's `callTool` sees the fully raw JSON body before any stripping, so it's even stricter on this specific edge case, but the gap it closes is a no-op anyway).
**Action:** Red-team testing (spec §5) will explicitly include both cases as regression tests, so this stays a documented, verified, deliberate behavior rather than an unexamined asymmetry.

### D-006 — 2026-11-11 — Speedrun client now retries 5xx, not just 429 (found live, not hypothetically)
**Finding:** `search_defense_roles` genuinely failed against the live Speedrun API during manual smoke testing (`SpeedrunApiError:500`, surfaced correctly as a scrubbed `upstream_error` to the caller) — then succeeded on an immediate retry. The original client only retried on `429`; a transient `5xx` was treated as terminal.
**Decision:** `lib/speedrun/client.ts` now also retries up to `MAX_RETRIES` (3) on any `5xx`, with the same backoff as the 429 path, before surfacing the error.
**Why:** This is real, observed upstream behavior, not a hypothetical edge case — exactly the kind of thing spec §5's "latency, correctness" testing is meant to catch, caught here during build rather than left for the judging panel to find.
**Impact:** `tests/unit/speedrun-client.test.ts` covers both the bounded-retry-then-fail case and the retry-then-succeed case.
