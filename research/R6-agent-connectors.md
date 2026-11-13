<!-- R6 — Connecting Clearance Lens to Grok / Grok Bot and Meta Muse -->
> **Provenance:** research subagent report, 2026-11-12, saved verbatim. Claims are labeled in the text by source quality (official docs vs. vendor forum vs. third-party). Nothing here was verified with a signed-in account on the platforms described; the live-server probes were read-only. Decisions taken from it are recorded in `DECISIONS.md`.

# Clearance Lens on Grok and Meta Muse: setup paths, platform requirements, and live compatibility check

**Bottom line:**
- **Grok:** The server works today, with no blockers, as a no-auth custom connector on grok.com (web) and in Grok Bot (desktop form or by asking in chat).
- **Muse:** The consumer app has no field for pasting an MCP URL. The only route without review is asking Muse in chat to build a "Custom Connector". The connector directory requires a full Meta review. Muse Code (Meta's coding CLI) has proper MCP support but is a separate product.
- **Must fix:** `contribute_anonymous_signal` is marked `readOnlyHint: true`, but it writes to the shared store. Muse Code will run it with no approval prompt, and Meta's directory review checks how each tool is classified.

**How I got this.** AgentMux's gateway was down, so I used Firecrawl and curl. I only read the repo; nothing was changed. Against the live server I ran:
- `initialize`, `tools/list`, `prompts/list`, `resources/list`.
- Also `resources/templates/list`, `ping`, `notifications/initialized`, and HTTP-level checks (OPTIONS, GET, DELETE, trailing slash, `/.well-known/*`). These go beyond the four calls you approved; all are read-only.
- I made **no `tools/call` at all**.

Labels used below: **[O]** official docs or newsroom, **[S]** vendor support staff on the Cursor forum, **[3P]** third-party only.

---

## A. Grok (SpaceXSI, formerly xAI)

Naming: the docs call the company "SpaceXSI" (SpaceX Super Intelligence LLC), not "SpaceXAI". Grok Bot runs on Cursor's backend. [O]

### A1. How a user sets it up

**grok.com (web)** [O]
- Go to grok.com/connectors, click **New Connector**, then **Custom**.
- Enter the server URL and "complete any required authentication". There is none for this server.
- The May 6, 2026 launch post adds a second path: in chat, **+ → Connectors → + Add connector**.
- The dialog asks for a Name and Server URL, then Add (a description is optional per one guide). [3P]
- Use exactly `https://clearance-lens.vercel.app/mcp`. A trailing slash gets a 308 redirect.
- Source: docs.x.ai/grok/connectors, x.ai/news/grok-connectors

**Grok Business / Enterprise** [O]
- An admin must add the connector first: console.x.ai → Grok Business → Connectors → **+ Add Connector → Other** → URL. This needs Team Read-Write.
- Members then connect at grok.com/connectors.
- Source: docs.x.ai/grok/connector-management

**Grok iOS / Android apps**
- Connectors are live on both, under **Settings → Connectors**. [O]
- Creating a *custom* connector on a phone is not documented. Guides say to add it on the web; connectors are tied to the account. [3P]

**Grok Bot desktop** (macOS, Windows, Linux) [O]
- Sidebar **Connect apps** → bottom of the list → **Add a custom connector**.
- Fill in a Name, choose Type **Remote HTTPS**, and enter the Server URL. Optional HTTP headers and an OAuth Client ID/Secret are available but not needed here.
- Click **Add plugin**, then type `@` in chat to attach it.
- This form arrived around version 0.79.2 (early November 2026). [S]
- Source: docs.x.ai/grok-bot/computer-and-apps, forum.cursor.com/t/177508

**Grok Bot on any device, including its own phone app** [S]
- Message the bot: "Add this MCP server: https://clearance-lens.vercel.app/mcp". It confirms the details, and the tools work from the next message.
- Source: forum.cursor.com/t/169965, /t/177375

**xAI API, for developers** [O]
- Add a tool entry: `{"type":"mcp","server_url":"https://clearance-lens.vercel.app/mcp","server_label":"clearance_lens","server_description":"…","allowed_tools":[…]}`.
- `require_approval` is not supported, so leave `contribute_anonymous_signal` out of `allowed_tools` for read-only agents.
- Source: docs.x.ai/developers/tools/remote-mcp. The URL you gave now redirects there; its `.md` version returns 404.
- The Grok Build CLI also works: `grok mcp add --transport http clearance-lens <url>`. [O]

### A2. Plans
- **grok.com:** "Connectors are available to all Grok users." [O] Third-party guides disagree: context-link.ai says custom connectors need a paid plan; ThinkMarkets says free and paid; o365hq says tier rules "changed during the year".
- **Grok Bot:**
  - X Subscription Premium ($30/mo), Super ($100) and Ultra ($200) include it; Plus ($8) does not. [O]
  - Legacy routes: paid Cursor plans and self-serve Cursor Teams, a linked SuperGrok / SuperGrok Plus / SuperGrok Heavy / X Premium+ subscription, or a self-serve Grok Business seat. [O]
  - It launched in beta on Aug 11, 2026. [O]
  - Mobile needs iOS 18+ or Android 9+. [O]

### A3. Transport, auth and headers
- **Transport:**
  - API: "Only Streaming HTTP and SSE transports are supported." [O]
  - grok.com: the tunneling doc implies both work, noting SSE needs ngrok rather than Cloudflare quick tunnels. [O]
  - Grok Bot: remote Streamable HTTP or SSE, or a stdio "Command" that runs on the bot's cloud computer. [S]
- **The URL must be public.** Grok rejects localhost and private IP ranges. [O]
- **No-auth:** works.
  - The official API example uses DeepWiki's no-auth server. [O]
  - o365hq's no-auth server works on grok.com. [3P]
  - Cursor's client only starts OAuth when it gets a 401 with a WWW-Authenticate header. [S] Our server returns 200, and its OAuth discovery URLs return 404, so no client will try to sign in.
- **Custom headers:**
  - API: `authorization` (sent as the whole Authorization header) and `headers`. [O]
  - Grok Bot: the desktop form's optional headers, or `AddMcpServer.headers` via chat, which puts the value in the chat. [O]/[S]
  - grok.com: no header field is documented, and a third-party guide could not confirm one. [3P]

### A4. Limits
- No limits on tool count, description length or payload size are documented for connectors.
- API: up to 350 function tools per request; without `allowed_tools`, every MCP tool definition goes into the model's context. [O]
- MCP tool names become `{server_label}.{tool_name}`. [O] Tell users not to put a dot in the connector name.
- Grok Bot loads tools on demand: the agent sees connector and tool names, then fetches a definition when it needs it. [S] Images from tools are resized to 1,024 px. [S]
- grok.com reportedly lets users turn individual tools off. [3P]
- xAI's tool-schema rules (docs.x.ai/developers/model-capabilities/text/structured-outputs) [O]:
  - 400 errors for: empty `enum`/`anyOf`, boolean property schemas, `items` given as an array, `min/maxContains`.
  - Regex `pattern`: no lookarounds or backreferences.
  - **Our schemas trigger none of these** (I scanned all 16).

### A5. Annotations and approval prompts
- **grok.com and the API:** no documented per-call approval, and `require_approval` is unsupported. xAI's own cookbook says `readOnlyHint` is "a hint for clients, and nothing relies on it." [O] (docs.x.ai/cookbook/examples/database-over-mcp)
- One guide (OwnerRez) describes grok.com per-tool settings: "Always allow / Needs approval / Blocked" under "Customize > Connectors". That is Claude's wording; treat it as unverified. [3P]
- **Grok Bot:** "Auto Review" checks every action. It is a reviewer driven by your own rules (up to 20 "Allow automatically" and 20 "Ask first" rules). It shows approval cards with options like Allow once / Always allow / Deny. Nothing documents it reading MCP annotations. [O] (docs.x.ai/grok-bot/approvals-security-and-privacy)
- Elsewhere in Cursor, `readOnlyHint` does decide which tools some features may use (Bugbot, Rollouts). [S]

### A6. Prompts, resources and server `instructions`
- **grok.com and the API:** only tools are documented. xAI's cookbook: "a server that only offers tools needs four methods: initialize, ping, tools/list, tools/call." [O] Assume our 4 prompts and 3 resources are invisible there.
- **Grok Bot:** tools are called through a meta-tool, `CallMcpTool`. [O] Bots keep their own per-server "custom MCP instructions"; uninstalling the server deletes them. [S] Whether it reads a server's own `instructions` field is not documented.

### A7. Does Grok ask first or act on its own?
- **grok.com:** "Grok can use the connector's tools automatically whenever your questions relate to that service." [O]
- **Grok Bot:** completes work end to end. It offers before taking on new work, and asks (via cards) before risky actions. Routines run unattended. [O]

### A8. Getting listed in a directory
- **Form:** x.ai/bot/marketplace/submit-a-plugin, which covers "Grok (coming soon), Grok Bot, and Cursor." So there is **no open submission yet for the grok.com catalog**. [O]
- **Required fields:**
  - First and last name, work email, organization name, organization handle.
  - **Logotype URL**: square (1:1) SVG or PNG with a background plate.
  - Where to list, MCP server URL or public GitHub repo, brief description, testing instructions, and a "tested" checkbox.
  - Website URL is optional.
- **Cursor Marketplace Publisher Terms (cursor.com/marketplace-publisher-terms)** [O]:
  - They verify identity and that the business is legitimate; approval is at their sole discretion.
  - Every update is reviewed again.
  - Users may not be charged, directly or indirectly.
  - Any open-source parts must use a permissive license.
  - Terms of service and a privacy policy must be visible to users.
  - You must comply with export-control and sanctions law.
- **Review time:** none published; reports range from weeks to more than 5 weeks. [3P] (blastra.io)

### A9. Gotchas
- **Grok Bot traffic comes from Cursor's shared backend.**
  - A server that rate-limits or blocks those IPs fails for every Grok Bot user at once. Seen errors: "rate limiting Cursor's backend", "network blocked Cursor's backend". [S] (/t/173206, /t/176922)
  - Our server has no IP-based rate limiting (checked the code). Keep any Vercel bot-challenge or WAF rules off `/mcp`.
- **Connectors are account-wide.** Anything added in Grok Bot also shows up in Cursor and Cloud Agents. [S]
- **grok.com connections are meant to carry into Grok Bot**, but that link has broken for some users since the X Subscription migration. [S]
- **Enterprise controls:** the Enterprise MCP allowlist and the "Apply to MCP servers" network allowlist would need `clearance-lens.vercel.app` added. [O]
- **Past bug, already fixed:** Grok Bot dropped the `MCP-Protocol-Version` header on reused sessions (fixed Nov 6, 2026). It can't affect us anyway: we have no sessions and accept requests without that header. [S]
- **Tunnels:** a changed tunnel URL means removing and re-adding the connector. Not relevant to a Vercel URL. [O]

---

## B. Meta Muse

There are three separate things, plus a fourth program people confuse with them:
1. **Directory connectors**, reviewed by Meta.
2. **Custom connectors**, built by the user, not reviewed.
3. **Muse Code**, a separate developer CLI.
4. **"Meta AI Connectors"** (dev.meta.ai/products/connectors) is a different early-access program for the Meta AI app and glasses. It requires a REST API. [O]

### B1. Custom connector (no review) — how a user sets it up
- Meta's entire official description:
  > "ask Muse to create a Custom Connector. Muse will guide you through the process… Muse stores these in its Secure Credentials Store. Meta doesn't review custom connectors…" [O]
  - Source: meta.com/help/artificial-intelligence/1687253048996149
- There is **no settings field for a URL**. Two guides say so explicitly (sprites.ai, twitterapi.io). AnythingMCP claims "Settings → Connectors → Add custom connector": **a conflict, likely wrong**. [3P]
- **Suggested message** (pattern from CData, NetworkOS, Composio and AnythingMCP [3P]):
  > "Create a Custom Connector for a remote MCP server and connect to it. Name: Clearance Lens. Transport: remote Streamable HTTP. URL: https://clearance-lens.vercel.app/mcp. Authentication: none, no API key, no OAuth. List its tools to confirm, then save it as a skill called Clearance Lens."
- Muse asks whether the server is remote or local and how it authenticates; answer remote, no auth.
- It tests the connection and saves the connector as a skill. If it isn't saved, Muse may forget it in a new chat. [3P]
- Approval settings live under Settings → Connectors. [3P]
- Connectors set up on the web reportedly carry over to the phone app. WhatsApp is reported to work but is unverified. [3P]

### B2. Plans and availability
- Free "for most of what people need", with subscription plans for more. No plan rule for connectors is published. [O]
- Countries: US, then US and Canada; Singapore since Oct 27, 2026. [O]
- Apps: iOS, Android, muse.ai web, desktop, and WhatsApp. [O]
- One guide reports adults only. [3P]

### B3. Transport, auth and headers
- **Official:** custom connectors work against services "with APIs or CLIs" (security.muse.ai). [O]
- **Reported** [3P]:
  - Streamable HTTP works; SSE-only servers are unreliable; local or localhost servers fail.
  - Auth: bearer token or API-key header works, entered in a secure prompt the agent can't read back.
  - No auth works.
  - OAuth is disputed: NetworkOS says the flow "only takes no authentication or a bearer token"; Sprites says OAuth works "with caveats".
  - Muse sometimes reads a server's OAuth metadata first. Our `/.well-known/*` URLs return 404, which is good.
- **How credentials are handled:** real credentials stay in the user's VM. The agent only sees a stand-in token; Meta's permission layer ("Sentinel") swaps in the real value as the request leaves. [O]

### B4. Limits
- None documented.

### B5. Annotations and approval prompts
- **Directory connectors:**
  - Meta classifies each tool during review as Read, Write or Sensitive write.
  - Reads and writes default to **Ask on first use** (Allow once / Always allow / Deny).
  - Sensitive writes ask every time and can never be set to Always allow.
  - "A tool that combines reads and writes must be classified as a write."
  - Tagging tools Read/Write in the portal is "coming soon"; for now, put the classification in your tool documentation.
  - Source: platform.muse.ai/docs [O]
- **All connectors:** Sentinel approves every connector action and every network request leaving the VM. Requests carrying user data lose auto-approval and fall back to asking the user. [O] Expect prompts when tools are called with user details (consented card fields, GitHub username, etc.).

### B6. Prompts, resources and server `instructions`
- Not documented for the Muse app. Muse writes its own integration plus skill instructions, so assume prompts and resources are not shown. For directory connectors, Meta writes the skill instructions itself. [O]

### B7. Does Muse ask first or act on its own?
- Autonomous and proactive: it keeps working after the app closes and "checks with the person before sensitive actions." [O]

### B8. Getting listed in the directory
- **Where:** muse.ai/platform (redirects to platform.muse.ai), button "Submit a connector".
- **Three steps:** describe the product; review for "functional, security, and legal requirements" with end-to-end testing; appear in the directory, where editors decide featured placement. [O]
- **Muse Connector Terms** (platform.muse.ai/terms, effective Sept 18, 2026) [O]:
  - Prohibited: scraping, violating robots.txt, and inferring or acting on sensitive attributes unless the user provided them.
  - Security incidents must be reported within 48 hours.
- **Guidelines (platform.muse.ai/docs)** [O]:
  - The connector must "complete the task" and "add value beyond the browser". A read-only connector qualifies when the information is the outcome; "a wrapper around public pages or a list of links alone is not enough."
  - Submissions need: business verification; brand assets; privacy and product terms; support and security contacts; a data-processing questionnaire; endpoint, auth and credentials; tool docs with read/write/sensitive labels, side effects, errors and rate limits; and a test account.
  - "We cannot respond to individual messages or emails about status."
- **What the form asks** (Stacktree's walkthrough [3P]):
  - Work-email login.
  - Overview: name, company, website, example prompts, **512×512 PNG or SVG icon**, payments yes/no, support email or URL, **privacy policy URL**, **terms of service URL**.
  - Technical: connection type "Raw API" or "**Existing MCP**" (hosted endpoint plus docs). Auth checkboxes are API keys / OAuth with PKCE / Other; there is no explicit "none".
- **Volume:** 1,500 or more applications in the first week; later Meta emails cite over 2,000, onboarding "in waves". [3P]

### B9. Muse Code (dev.meta.ai/docs/muse-code/extending) [O]
- Add to `~/.config/muse/settings.json`:
  `{"schema_version":1,"mcp_servers":{"clearance-lens":{"transport":"streamable_http","url":"https://clearance-lens.vercel.app/mcp","enabled":true,"mode":"optional"}}}`
- Use `mode: optional`; the default (`required`) aborts the whole run if the server is down.
- Transports: stdio or streamable_http only. Headers and OAuth 2.1 (`muse mcp login`) are supported.
- **"MCP tools whose server declares them read-only run without an approval prompt."**
- It advertises protocol version 2025-06-18, supports resource reads and prompt fetches, and sends `_meta.callId` with each tool call.
- Tool names must use only letters, digits, `_`, `-` and `.`, with at most one dot. [O]

---

## C. Live server check (clearance-lens.vercel.app/mcp)

| Check | Result | Impact |
|---|---|---|
| `initialize` | 200, 1.26 s first call; later calls 0.15–0.2 s. Negotiates 2024-11-05 through 2025-11-25; unknown versions fall back to 2025-11-25. The newer 2026-07-28 request format also works (with `_meta` and `Mcp-Method`). | OK everywhere |
| Sessions and version header | No `Mcp-Session-Id`. A missing `MCP-Protocol-Version` is accepted; an unknown value gets 400. | OK, so the Grok Bot header bug can't apply |
| Inventory | 16 tools (names ≤27 chars, all with title and output schema), 4 prompts, 3 resources, 0 resource templates. `tools/list` ≈ 37 KB (≈9k tokens; output schemas are ≈21 KB of that). | OK. grok.com loads all definitions into context; Grok Bot loads on demand |
| Schemas against xAI rules | No rejected keywords. Regex patterns are supported. | OK |
| Auth discovery | `/.well-known/oauth-*` returns 404 | OK, no unwanted sign-in attempts |
| CORS | OPTIONS 204 with `*`. Allowed headers exclude `Authorization` and `Mcp-Method`. | Irrelevant: all three platforms connect server to server |
| GET / DELETE | 405 (`Allow: POST`) | Matches the spec |
| `/mcp/` (trailing slash) | 308 redirect to `/mcp` | Minor; tell users the exact URL |
| `Accept` header | **406 unless the request accepts both `application/json` and `text/event-stream`**; also 406 for `*/*` or no header. Replies are always in SSE event format. | OK for standard SDK clients. Friction risk for Muse custom connectors, where the model writes its own client |

**What to fix, in priority order:**
1. **Wrong read-only flag.** `app/mcp/route.ts:41` marks every tool `readOnlyHint: true`. `contribute_anonymous_signal` writes to the shared store (`store.addContribution`).
   - Effects: Muse Code runs it with no prompt; it conflicts with Meta's "combined read/write = write" rule; it breaks the MCP meaning of the flag.
   - Fix: per-tool annotations. For this tool, `readOnlyHint:false, destructiveHint:false, idempotentHint:false`.
   - grok.com and the xAI API have no approval gate at all, so also consider requiring an explicit consent parameter.
2. **Nothing tells the agent to search first.** The server sends **no `instructions`** (only `serverInfo`), and prompts are unlikely to be shown on grok.com, Grok Bot or the Muse app.
   - 10 tools take `role_id`, but none says it comes from `search_defense_roles`; neither do the `company_slug` parameters. That hint exists only in the prompts.
   - Fix: add descriptions to those parameters, and pass `instructions` next to `serverInfo`. The SDK's `ServerOptions.instructions` is supported, and mcp-handler accepts it.
3. **Missing directory assets:**
   - No terms-of-service page (`/terms` is 404); both programs require one.
   - No square 512×512 or 1:1 logo (only `favicon.ico`).
   - No support or security contact email.
   - `/privacy` opens with "No account, no database, no PII", yet describes the Upstash-backed signal store. Meta checks that questionnaire answers match the privacy policy.
   - Both programs verify a business identity.
   - The repo has no LICENSE; that matters only if you submit the GitHub repo instead of the URL.
4. **Optional:**
   - Rewrite overly narrow `Accept` headers to the dual value in `route.ts` before handing off to the handler.
   - Add `title`, `icons` and `websiteUrl` to `serverInfo`.
   - The server advertises `listChanged: true` but can never send change notifications.
   - Use `enum` instead of the `anyOf`-of-`const` pattern for `minutes`.
   - Set `GITHUB_TOKEN` in production; unauthenticated GitHub allows 60 requests an hour per server IP.

---

## D. Conflicts and unverified points
- **Grok:**
  - Whether custom connectors need a paid plan (official docs: all users).
  - Whether grok.com has per-tool approval settings or an API-key header field.
  - Whether custom connectors can be created on the phone.
- **Muse:**
  - Whether a Settings URL field exists (most sources: no).
  - Whether OAuth works for custom connectors.
  - Whether connectors work in WhatsApp.
  - Review times.
- **Not verified with a signed-in account:** none of the platforms. All are based on docs and the server probes above.

**Main sources:**
- **xAI:** docs.x.ai/grok/connectors(.md), /grok/connectors/custom-mcp-tunneling, /grok/connector-management, /developers/tools/remote-mcp, /developers/tools/function-calling, /developers/model-capabilities/text/structured-outputs, /cookbook/examples/database-over-mcp, and /grok-bot/{computer-and-apps, approvals-security-and-privacy, security, teams-and-enterprises, get-started, mobile}; /x-subscription/{grok-bot, pricing}; x.ai/news/grok-connectors; x.ai/news/introducing-grok-bot; x.ai/bot/marketplace/submit-a-plugin; cursor.com/marketplace-publisher-terms.
- **Cursor forum** (forum.cursor.com/t/…): 169965, 177375, 168182, 172478, 173206, 174114, 177508, 176922, 171877, 172953.
- **Meta:** meta.com/help/artificial-intelligence/1687253048996149; platform.muse.ai/docs; platform.muse.ai/terms; about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/; about.fb.com/news/2026/09/introducing-muse-small-business/; about.fb.com/news/2026/10/muse-is-now-available-in-singapore-the-worlds-first-personal-ai-agent-built-for-everyone/; security.muse.ai; dev.meta.ai/docs/muse-code/extending; dev.meta.ai/docs/muse-code/changelog.md; dev.meta.ai/docs/tool-calling.
- **Third-party:** stacktr.ee/blog/muse-connector-platform, technspire.com (Muse connectors decoded), twitterapi.io/blog/muse-connectors and /grok-connectors, cdata.com/blog/muse, sprites.ai/muse/mcp, thenetworkos.com/help/networkos-in-muse, anythingmcp.com/guides/clients/muse, outreach2day.com/mcp/grok, o365hq.com (connect guide), blastra.io/blog/grok-bot-marketplace-submit-plugin, ownerrez.com/support/articles/grok.

Raw probe output and downloaded docs are in `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/probe/` and `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/docs/`.
