# R2 — UI/UX Inspiration → Concrete Design System

**Scope:** a complete, implementation-ready design system for Clearance Lens — tokens, components, wireframes, and product-specific rules — derived from the UI/UX patterns of 13 reference products and dev-tool install pages.

**How to read this doc:** Section 1 is research (every claim that could change over time is cited). Section 2 onward is **original specification** for Clearance Lens — colors, spacing, radius, shadow and type values that I designed for this product, informed by (not copied from) the patterns in Section 1. Those numbers are not claims about any third party's actual CSS; they are this product's own tokens, computed and verified (OKLCH→sRGB conversion and WCAG contrast ratios were computed with a small Python script using the standard CSS Color 4 / Björn Ottosson OKLab matrices — the math is mine, not a citation-requiring "fact"). Where a reference product's own brand color is quoted, that *is* a factual claim about a third party, so it carries a citation and, where the source is a secondary teardown rather than the company's own brand page, an explicit "secondary source" hedge.

---

## 1. Reference pattern scan

### 1.1 Linear
Dark-mode-first by deliberate brand positioning, not as an afterthought — unlike most SaaS, dark is the default, light is the option. The product is almost entirely achromatic (near-black canvas, white/gray text at varying opacity for hierarchy) punctuated by exactly one brand hue: an indigo-violet, commonly reported as **Linear Indigo `#5E6AD2`**, with a brighter interactive variant around `#7170FF` ([colorfyi.com/brands/linear](https://colorfyi.com/brands/linear/); [colors.codes/color/5e6ad2](https://colors.codes/color/5e6ad2) — secondary sources, not Linear's own published brand page). Reported dark-mode layer backgrounds: `#08090A` (canvas) → `#0F1011` (panel) → `#191A1B` (elevated surface) — a tight, low-contrast step sequence rather than big jumps ([design teardown, secondary](https://cdn.jsdelivr.net/npm/oh-my-opencode@4.18.2/dist/skills/frontend/references/design/linear.app.md)). Keyboard-first interaction is a design philosophy, not a feature — every surface assumes a command palette exists.
**Take for Clearance Lens:** one hue used sparingly beats a colorful palette; let gray-scale opacity (our neutral step scale, §2.1) carry most of the hierarchy.

### 1.2 Vercel — dashboard, marketing site, and the Geist design system
Vercel's own design system is literally named **Geist** and is public at [vercel.com/geist](https://vercel.com/geist) ([color tokens](https://vercel.com/geist/colors)), which is doubly relevant since Clearance Lens already has the `geist` npm package installed. Geist's documented color architecture is a **10-step unitless scale per hue** (100–1000, not 1–12), with explicit semantic roles confirmed directly from the docs:

| Step | Role |
|---|---|
| 100 | Default background |
| 200 | Hover background |
| 300 | Active background |
| 400 | Default border |
| 500 | Hover border |
| 600 | Active border |
| 700 | High-contrast background |
| 800 | Hover high-contrast background |
| 900 | Secondary text/icons |
| 1000 | Primary text/icons |

(confirmed from [vercel.com/geist/colors](https://vercel.com/geist/colors) and its Markdown mirror [vercel.com/geist/colors.md](https://vercel.com/geist/colors.md); exact hex values are not exposed in the static markup, only the role table above). Separately, concrete numeric values reported for Vercel's dashboard component system: **button radius 8px, card radius 12px** — "two values, not ten" — cards use a hairline border simulated as a shadow (`0 0 0 1px rgba(0,0,0,0.08)`) plus one soft elevation shadow (`0 2px 2px rgba(0,0,0,0.04)`) rather than a heavy drop shadow (secondary design teardown, not Vercel's own spec sheet — treat as a well-corroborated pattern, not an exact quote: [blakecrosley.com/guides/design/vercel](https://blakecrosley.com/guides/design/vercel)). Vercel confirms a 2026 dashboard redesign exists and continues to simplify project cards ([vercel.com/blog/dashboard-redesign](https://vercel.com/blog/dashboard-redesign)).
**Take for Clearance Lens:** exactly two radii for 90% of surfaces (buttons vs. cards), a hairline border instead of a visible drop shadow at rest, and reserve shadow for true elevation changes (hover, popover, modal) — see §2.3–2.4.

### 1.3 Stripe — docs site and MCP docs
`docs.stripe.com` organizes by product vertical (Payments / Revenue / Risk / Data / Embedded finance / Money management / Prebuilt components) with a CLI-first quickstart ("install the Stripe CLI, run `stripe docs`") rather than a traditional sidebar-first IA (fetched directly, [docs.stripe.com](https://docs.stripe.com)). The **MCP install page** ([docs.stripe.com/mcp](https://docs.stripe.com/mcp), fetched directly) is the single best structural reference for our install-snippet component: it is organized as **one heading per client** (`#### Cursor`, `#### Claude Code`, `#### Claude Desktop`, `#### Codex`, `#### ChatGPT`, `#### VS Code`, `#### Other`), and inside every client section the order is always: **(1) a one-click "Install in X" deep-link button first** (a `cursor://...` or `vscode://...` URI with the server config base64-encoded in it), **(2) a short line directing manual users to a JSON snippet, (3) the JSON snippet itself, styled as a secondary/fallback path, not the primary CTA.** The server URL (`https://mcp.stripe.com`) is never hand-retyped — it's the same string reused in every snippet. Stripe also flags a hard deadline in the same page ("Migrate by **November 30, 2026**... unsupported keys receive a 401") — i.e. even Stripe's own MCP docs carry a dated, time-sensitive compliance note inline, not hidden in fine print.
**Take for Clearance Lens:** this exact pattern — primary one-click action, secondary manual fallback, one canonical URL string — is what `install-snippet tabs-with-copy-button` should do per tab (§3.2).

### 1.4 Raycast
Raycast's **own developer docs publish an official brand color**: **Raycast Red `#FF6363`** ([developers.raycast.com/api-reference/user-interface/colors](https://developers.raycast.com/api-reference/user-interface/colors) — primary source). Despite having a named brand color, the site is reported as using it extremely sparingly — the homepage is otherwise near-monochrome (white CTA, black text, dark-mode-first product shots), with red appearing mainly as a diagonal hero stripe gradient reported as fading `#ff5757 → #a1131a` ( secondary teardown, [webdesignhot.com/design.md/raycast](https://www.webdesignhot.com/design.md/raycast/)). Fetched directly, the homepage leads with "Your shortcut to everything," demonstrates the command palette through small contextual workflow animations (not static screenshots), and closes features with an emotional rather than feature-list line ("It's not about saving time. It's about feeling like you're never wasting it.").
**Take for Clearance Lens:** a single accent color can be used *extremely* sparingly (one stripe, one icon) and still read as "branded" — don't feel obligated to color every section.

### 1.5 Arc / The Browser Company — **status: sunsetting, use as a historical pattern reference only**
Important and time-sensitive: Arc is being wound down. Fetched directly from [arc.net](https://arc.net) on 2026-11-11: *"Arc is sunsetting on December 22, 2026,"* with users redirected to the company's newer product, Dia, on a staged timeline (Oct 22 → Nov 23 → Dec 22, 2026). The design patterns below describe Arc's historical UI, which remains a valid *pattern* reference even though the product itself will not be live much longer — Clearance Lens should not point anyone to Arc as a current example in copy, only use the pattern internally. Arc's sidebar-first browser chrome used translucent, blurred surfaces and let users pick a personal gradient "theme color" that tinted the toolbar/sidebar; its "Command Bar" fused the address bar and a command palette into one typeable surface, Spotlight-style ([howtogeek.com](https://www.howtogeek.com/888738/ways-arc-transforms-your-web-browser-experience/); secondary design notes reporting glass background `rgba(255,255,255,0.85)` + `blur(40px)` and ink `#1a1a1f`, [open-design.ai/systems/arc](https://open-design.ai/systems/arc/)).
**Take for Clearance Lens:** the "one typeable surface replaces a toolbar of buttons" idea is a good mental model for how an *agent* (not our web UI) should feel to use — but Clearance Lens's own playground should not try to imitate Arc's glass/gradient chrome, since that reads as "consumer lifestyle app," not "defense-tech infra."

### 1.6 Perplexity
Perplexity's defining UI contribution is **treating sources as first-class interface elements**, not footnotes: inline numbered citations in the answer body, a dedicated source panel, and clickable "domain chips" a user can inspect, compare, or dismiss as wrong ([aiuxplayground.com/guides/how-to-design-ai-citations](https://aiuxplayground.com/guides/how-to-design-ai-citations); [theneuralbase.com — UI patterns for citations](https://theneuralbase.com/perplexity-api/learn/advanced/ui-patterns-for-citations/)). Reported brand colors (secondary sources, hex values vary slightly by source so treat as approximate, not an official brand page): a teal/turquoise around **`#20808D`** ("True Turquoise"), an off-black **`#091717`**, and a warm paper white **`#FBFAF4`** ([designpieces.com/palette/perplexity-color-palette-hex-and-rgb](https://www.designpieces.com/palette/perplexity-color-palette-hex-and-rgb/); [brand-atoms.pages.dev/dist/brands/perplexity](https://brand-atoms.pages.dev/dist/brands/perplexity/1.0.0/markdown/brand-guide.md)).
**Take for Clearance Lens:** this is the direct ancestor of our `source-citation-chip` component (§3.11) — every rule, number, and timeline in this product should be a clickable, hoverable chip back to a primary source, exactly like a Perplexity citation, because "sources as interface" is this product's core trust mechanism (the whole product is forbidden from inventing a statistic — see Hard Constraint 6 in the parent brief).

### 1.7 Mercury
Reported pattern (secondary design teardown, not Mercury's own brand page — treat the exact hex values as illustrative, not verified): Mercury is said to invert the category convention — most business-banking sites (Stripe, Wise, Brex) default to a white canvas with an indigo accent, while Mercury's *marketing* surfaces reportedly run a dark, near-black canvas with light ink text and an electric-indigo CTA, reserving a light canvas (`~#FBFCFD`) for the actual in-product dashboard only ([blakecrosley.com/guides/design/mercury](https://blakecrosley.com/guides/design/mercury)). Reported design discipline: no promotional oranges, no "engagement-bait" purples — restraint is treated as the brand signal for a bank.
**Take for Clearance Lens:** the specific inversion trick (dark marketing shell, light product surface) is not right for us — our product and marketing share one surface (`/`, `/try`) — but "restraint signals financial/institutional trust" directly supports the "calm, not sci-fi-neon" brief.

### 1.8 Ramp
Reported pattern (secondary design teardown — treat hex values as illustrative): a Swiss-modernist white canvas, near-black ink (reported `#212121` / `#0A0A0A`), a single pastel-yellow highlight accent used sparingly like a highlighter mark, thin ~10%-black hairline rules separating editorial sections, and flat black pill buttons with white type — "near-flat" elevation with very soft shadows rather than skeuomorphic depth ([refero.design Ramp style reference](https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825); [webdesignhot.com/design.md/ramp](https://www.webdesignhot.com/design.md/ramp/)).
**Take for Clearance Lens:** "one single accent used like a highlighter, not a wash" is the right mental model for our own accent blue — see Do/Don't rule #5.

### 1.9 Anduril.com — tone reference for serious defense-tech without military kitsch
This is the most important tone reference in the brief, and it is unambiguous: Anduril's own site uses **Helvetica Now** as its typeface, confirmed by [fontsinuse.com/uses/32662/anduril-industries](https://fontsinuse.com/uses/32662/anduril-industries) (a curated typography-in-use archive, a reasonably reliable primary-adjacent source for "what font is this"). Independent description: "stark black-and-white layouts... commanding visuals to convey precision" with color contributed *only* by product photography, never by decoration ([uiuxshowcase.com/industrial-design/anduril-defence-technology](https://uiuxshowcase.com/industrial-design/anduril-defence-technology/)). No camo textures, no explosions, no "tactical" stencil fonts, no red warning chrome — the restraint itself is what signals seriousness.
**Take for Clearance Lens:** this single fact — *monochrome layout, color reserved for real content, one serif-free grotesque typeface, zero military clichés* — is the strongest justification in this whole research set for the token system in §2: a near-achromatic neutral scale plus exactly one calm accent hue, never camo green/tan, never neon "hacker" green, never a stencil/military typeface.

### 1.10 The a16z speedrun talent network itself ([speedrun-talent-network.com](https://speedrun-talent-network.com))
Fetched directly. The **consumer-facing homepage** is warm and informal: a literal 👋 emoji in the hero ("welcome to the speedrun talent network"), copy like "generational founders" and "1 minute to join," a light background with minimal accent color, sticky top nav (Companies / Jobs / Join the Network / Sign in), a tiled company grid with category tag chips (AI / Gaming / Fintech / Healthcare / Enterprise SaaS), and a numbered "01 / 02 / 03" How-It-Works section.
The **`/developers` page is a completely different register** — fetched directly: numbered technical sections ("01 · REST API," "02 · MCP server," "03 · Ground rules"), monospace code blocks, a curl example (`GET /api/v1/jobs?fn=engineering&loc=remote&comp=200000&source=my-agent`), a two-column endpoint table, and an MCP quick-install line for Claude Code: `claude mcp add --transport http speedrun-talent https://mcp.speedrun-talent-network.com/mcp`.
**Take for Clearance Lens:** the *same company* deliberately runs two tones on two pages — friendly/emoji for humans on the marketing surface, terse/monospace for machines and developers on the docs surface. Clearance Lens's primary audience is "an agent plus the person steering it," so our whole site should sit closer to the `/developers` register than the homepage register — friendly in the hero's one sentence, technical everywhere else (see Do/Don't rule #2 and #10).

### 1.11 Context7 install page
Fetched directly ([context7.com](https://context7.com), [context7.com/install](https://context7.com/install)). Context7 does **not** use a tabbed-by-client UI at all — it uses a single universal command (`npx ctx7 setup`, described as auto-detecting the coding environment and configuring the MCP server for you) plus a reference table (columns: Client, Category, Setup Command, Docs link) listing Claude Code, Cursor, Opencode, Codex, Antigravity.
**Take for Clearance Lens:** this is a genuinely different, simpler pattern than Stripe's/Linear's per-client tabs, and it works for Context7 because it ships an actual CLI binary that can inspect the user's machine. Clearance Lens's MCP server is "paste one URL into N different client UIs," which has no single cross-client command — **except** for Claude Code, where every reference in this research (speedrun-talent-network, Linear, Stripe) converges on the exact same one-liner shape: `claude mcp add --transport http <name> <url>`. Recommendation: lead the install-snippet component with that one Claude Code command as a "fastest path" callout, then fall back to tabs for the clients that need pasted JSON (see §3.2).

### 1.12 Linear MCP docs
Fetched directly ([linear.app/changelog/2025-05-01-mcp](https://linear.app/changelog/2025-05-01-mcp)). Presented as **sequential per-client sections** (not interactive ARIA tabs in the raw markup, though Linear's live docs framework may render section-jump UI around them) for Claude.ai, Claude Desktop, Claude Code, Cursor, Windsurf, Zed. Server endpoint given at the time as a literal SSE URL (now fully decommissioned — confirmed 404 as of 2026-11-11, so deliberately not given here as a resolvable link); a separate, more recent write-up ([builder.io/blog/linear-mcp-server](https://www.builder.io/blog/linear-mcp-server)) describes Cursor installing against `https://mcp.linear.app/mcp` (HTTP) instead, which is live today (confirmed 401 — auth-required, not dead — as of the same date) — i.e. Linear completed a migration from SSE to HTTP transport this report had only caught mid-flight (consistent with the MCP spec's own SSE-transport deprecation). **This is exactly the kind of fact that changes over time** — R1 (not this report) owns verifying Clearance Lens's own current transport choice; this report only extracts the *install UI pattern* (per-client sections, one JSON block per client, a single CLI one-liner for Claude Code), not the specific URL.

### 1.13 Stripe MCP docs — see §1.3 (covered together since it's the richest source for the install-snippet pattern).

### 1.14 Synthesis for the install-snippet component
Every best-in-class example converges on the same three ingredients, just assembled differently:
1. **One canonical server URL/command, reused verbatim** everywhere it appears (Stripe, Linear, speedrun-talent-network all do this — never ask the user to assemble a URL from parts).
2. **A one-click action before a copy-paste fallback** (Stripe's deep-link buttons; Context7's single setup command; speedrun's one-line `claude mcp add`).
3. **Client-specific framing** — either as tabs/sections (Stripe, Linear) or as a single tool that self-detects the client (Context7). Because Clearance Lens's clients genuinely need different payloads (a URL for some, a JSON block for others), **tabs** are the right choice, with the Claude Code one-liner promoted above the tabs as the fastest path. See the exact component spec in §3.2.

---

## 2. Design tokens

All values below are an original specification for Clearance Lens. Color methodology follows the **Radix Colors 12-step convention** — confirmed directly from Radix's own docs ([radix-ui.com/themes/docs/theme/color](https://www.radix-ui.com/themes/docs/theme/color)): steps 1–2 = backgrounds, 3–5 = interactive component fills, 6–8 = borders/separators, 9–10 = solid fills, 11–12 = accessible text — combined with Tailwind v4's own conventions, confirmed directly from [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme): the default spacing scale is driven by a single `--spacing: 0.25rem` (4px) multiplier, and the default color palette is defined in `oklch()`. Fonts are Geist Sans and Geist Mono from the already-installed `geist` npm package (`^1.9.2` per `package.json`), imported as `GeistSans` from `geist/font/sans` and `GeistMono` from `geist/font/mono` (both `NextFontWithVariable` instances exposing `.variable`) — confirmed via the package's own README ([www.npmjs.com/package/geist](https://www.npmjs.com/package/geist)).

**Implementation note (change from current scaffold):** `app/layout.tsx` currently loads `Geist`/`Geist_Mono` from `next/font/google`. Switch to the npm package already in `package.json` for a deterministic, network-independent build:
```tsx
// app/layout.tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

### 2.1 Color

Hue angles (OKLCH): neutral = 258° (cool slate, near-zero chroma), accent "signal blue" = 252°, success = 155° (green), caution = 75° (amber, text shifted to 55° for legibility), danger = 25° (red). **Rule: four hues total, ever** — see Do/Don't #5 and #9. All hex values below were computed from the stated `oklch()` triples via the CSS Color 4 OKLab matrices and checked against the sRGB gamut (no clamping occurred in the final set) — they are exact conversions of the oklch values, not independently eyeballed.

#### Neutral scale (hue 258°)

| Step | Light `oklch()` | Light hex | Dark `oklch()` | Dark hex | Role |
|---|---|---|---|---|---|
| 1 | `oklch(0.995 0.001 258)` | `#fdfdfe` | `oklch(0.145 0.004 258)` | `#090a0c` | App background |
| 2 | `oklch(0.980 0.002 258)` | `#f8f8fa` | `oklch(0.175 0.005 258)` | `#0f1113` | Subtle background (panel, footer) |
| 3 | `oklch(0.955 0.004 258)` | `#eef0f3` | `oklch(0.215 0.007 258)` | `#171a1d` | UI element background |
| 4 | `oklch(0.930 0.006 258)` | `#e5e8ec` | `oklch(0.255 0.009 258)` | `#202327` | Hovered UI element background |
| 5 | `oklch(0.905 0.008 258)` | `#dce0e5` | `oklch(0.300 0.011 258)` | `#2a2e33` | Active/selected background |
| 6 | `oklch(0.870 0.010 258)` | `#d0d4db` | `oklch(0.350 0.013 258)` | `#363b41` | Subtle border / divider |
| 7 | `oklch(0.800 0.013 258)` | `#b9bec6` | `oklch(0.420 0.015 258)` | `#484d55` | UI element border |
| 8 | `oklch(0.700 0.016 258)` | `#989fa9` | `oklch(0.500 0.018 258)` | `#5d646e` | Hovered / strong border |
| 9 | `oklch(0.560 0.020 258)` | `#6d7580` | `oklch(0.580 0.020 258)` | `#737b86` | Solid muted (neutral button, disabled) |
| 10 | `oklch(0.500 0.020 258)` | `#5c646f` | `oklch(0.640 0.020 258)` | `#858d99` | Hovered solid muted |
| 11 | `oklch(0.420 0.018 258)` | `#474e57` | `oklch(0.720 0.016 258)` | `#9ea5af` | Secondary text |
| 12 | `oklch(0.170 0.010 258)` | `#0d1014` | `oklch(0.940 0.004 258)` | `#e9ebee` | Primary text ("ink" / "paper") |


#### Accent scale — "signal" blue (hue 252°)

| Step | Light `oklch()` | Light hex | Dark `oklch()` | Dark hex |
|---|---|---|---|---|
| 1 | `oklch(0.980 0.008 252)` | `#f5f9fe` | `oklch(0.190 0.025 252)` | `#0b141f` |
| 2 | `oklch(0.955 0.016 252)` | `#e9f1fb` | `oklch(0.220 0.035 252)` | `#0e1b2a` |
| 3 | `oklch(0.920 0.028 252)` | `#d8e6f7` | `oklch(0.270 0.050 252)` | `#13283e` |
| 4 | `oklch(0.885 0.040 252)` | `#c7dbf3` | `oklch(0.320 0.065 252)` | `#183453` |
| 5 | `oklch(0.840 0.052 252)` | `#b3cdec` | `oklch(0.370 0.080 252)` | `#1c4168` |
| 6 | `oklch(0.780 0.064 252)` | `#9abbe0` | `oklch(0.430 0.095 252)` | `#245282` |
| 7 | `oklch(0.700 0.078 252)` | `#7ba2ce` | `oklch(0.490 0.110 252)` | `#2b639c` |
| 8 | `oklch(0.620 0.095 252)` | `#5a89be` | `oklch(0.560 0.125 252)` | `#3677bb` |
| 9 | `oklch(0.550 0.145 252)` | `#2273c3` | `oklch(0.640 0.145 252)` | `#418fe1` |
| 10 | `oklch(0.490 0.130 252)` | `#1b62a7` | `oklch(0.700 0.145 252)` | `#54a2f5` |
| 11 | `oklch(0.470 0.135 252)` | `#0b5ca3` | `oklch(0.740 0.125 252)` | `#6eaff7` |
| 12 | `oklch(0.320 0.085 252)` | `#0a345c` | `oklch(0.900 0.050 252)` | `#c7e1ff` |

Use exactly like neutral: 1–2 tinted backgrounds, 3–5 hover/active fills for accent-colored components, 6–8 borders/focus-ring base, **9 = the one "brand" solid** (primary button, active nav indicator, primary link on hover), 10 = its hover state, 11 = default link/accent text color, 12 = rarely used, only for an accent-colored heading on a light surface.

#### Semantic colors (abbreviated — only the 4 roles the product actually needs: subtle background, border, solid, text)

| Family | Step | Light `oklch()` | Light hex | Dark `oklch()` | Dark hex |
|---|---|---|---|---|---|
| **Success** (aligned) | 2 bg | `oklch(0.965 0.022 155)` | `#e9f8ed` | `oklch(0.180 0.030 155)` | `#06150c` |
| | 6 border | `oklch(0.820 0.085 155)` | `#98d5ac` | `oklch(0.400 0.090 155)` | `#115531` |
| | 9 solid | `oklch(0.520 0.098 155)` | `#32794f` | `oklch(0.580 0.135 155)` | `#1b9155` |
| | 11 text | `oklch(0.400 0.080 155)` | `#1c5434` | `oklch(0.720 0.120 155)` | `#60bb83` |
| **Caution** (mixed) | 2 bg | `oklch(0.965 0.016 75)` | `#faf2e8` | `oklch(0.190 0.035 75)` | `#1d1102` |
| | 6 border | `oklch(0.830 0.110 75)` | `#f1bd73` | `oklch(0.420 0.070 75)` | `#63471c` |
| | 9 solid | `oklch(0.720 0.145 75)` | `#d9951d` | `oklch(0.680 0.120 75)` | `#c38c37` |
| | 11 text | `oklch(0.420 0.100 55)` | `#753b07` | `oklch(0.780 0.130 75)` | `#e8aa4e` |
| **Danger** (errors/destructive only — never a person-fit result) | 2 bg | `oklch(0.965 0.014 25)` | `#fdf0ef` | `oklch(0.190 0.030 25)` | `#200e0d` |
| | 6 border | `oklch(0.820 0.090 25)` | `#f9aea7` | `oklch(0.400 0.095 25)` | `#72302d` |
| | 9 solid | `oklch(0.550 0.160 25)` | `#bd413f` | `oklch(0.620 0.160 25)` | `#d55753` |
| | 11 text | `oklch(0.430 0.140 25)` | `#8d2425` | `oklch(0.740 0.130 25)` | `#f28881` |

*"Unclear" (the third rubric state) deliberately uses plain **neutral-9/11**, not a 4th hue — unclear is not a color, it's the absence of evidence.* **Info** callouts reuse **accent-9/11** — do not add a 5th hue.

#### On-solid text color — exact, computed, no further judgment call needed

WCAG contrast was computed for white, "ink" (`#0d1014`, neutral-light-12), and "paper" (`#e9ebee`, neutral-dark-12) against every step-9 solid fill. Result, verified:

| Solid fill | Light mode text | Dark mode text |
|---|---|---|
| **Accent-9** (primary button) | white (`4.87:1`) | ink `#0d1014` (`5.67:1` — white only hits `3.36:1`, fails AA) |
| **Success-9** | white (`5.27:1`) | ink `#0d1014` (`4.75:1` — white only hits `4.02:1`, fails AA) |
| **Caution-9** | ink `#0d1014` (`7.51:1` — white hits only `2.54:1`, fails badly) | ink `#0d1014` (`6.47:1`) |
| **Danger-9** | white (`5.26:1`) | ink `#0d1014` (`4.83:1` — white only hits `3.95:1`, fails AA) |

**Rule, stated plainly for implementation:** in light mode every solid fill uses white text *except* caution, which always uses ink text. **In dark mode every solid fill uses ink text, with no exceptions** — dark-mode solid steps are deliberately brightened to read against a near-black canvas, which is exactly why white-on-them fails contrast. Primary text (`neutral-12` on `neutral-1`) is `18.76:1` light / `16.58:1` dark; secondary text (`neutral-11` on `neutral-1`) is `8.28:1` light / `7.97:1` dark; link text (`accent-11` on `neutral-1`) is `6.72:1` light / `8.62:1` dark — every pairing used anywhere in this spec clears WCAG 2.2 AA's 4.5:1 for normal text with margin.

#### Ready-to-paste CSS (Tailwind v4 CSS-first config, same pattern as the existing `app/globals.css`)

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *)); /* class-based dark mode, driven by next-themes */

:root {
  /* neutral */
  --neutral-1:#fdfdfe; --neutral-2:#f8f8fa; --neutral-3:#eef0f3; --neutral-4:#e5e8ec;
  --neutral-5:#dce0e5; --neutral-6:#d0d4db; --neutral-7:#b9bec6; --neutral-8:#989fa9;
  --neutral-9:#6d7580; --neutral-10:#5c646f; --neutral-11:#474e57; --neutral-12:#0d1014;
  /* accent */
  --accent-1:#f5f9fe; --accent-2:#e9f1fb; --accent-3:#d8e6f7; --accent-4:#c7dbf3;
  --accent-5:#b3cdec; --accent-6:#9abbe0; --accent-7:#7ba2ce; --accent-8:#5a89be;
  --accent-9:#2273c3; --accent-10:#1b62a7; --accent-11:#0b5ca3; --accent-12:#0a345c;
  /* semantic */
  --success-2:#e9f8ed; --success-6:#98d5ac; --success-9:#32794f; --success-11:#1c5434;
  --caution-2:#faf2e8; --caution-6:#f1bd73; --caution-9:#d9951d; --caution-11:#753b07;
  --danger-2:#fdf0ef;  --danger-6:#f9aea7;  --danger-9:#bd413f;  --danger-11:#8d2425;
  --on-solid-light: #ffffff;
  --on-solid-dark: #0d1014;
}

.dark {
  --neutral-1:#090a0c; --neutral-2:#0f1113; --neutral-3:#171a1d; --neutral-4:#202327;
  --neutral-5:#2a2e33; --neutral-6:#363b41; --neutral-7:#484d55; --neutral-8:#5d646e;
  --neutral-9:#737b86; --neutral-10:#858d99; --neutral-11:#9ea5af; --neutral-12:#e9ebee;
  --accent-1:#0b141f; --accent-2:#0e1b2a; --accent-3:#13283e; --accent-4:#183453;
  --accent-5:#1c4168; --accent-6:#245282; --accent-7:#2b639c; --accent-8:#3677bb;
  --accent-9:#418fe1; --accent-10:#54a2f5; --accent-11:#6eaff7; --accent-12:#c7e1ff;
  --success-2:#06150c; --success-6:#115531; --success-9:#1b9155; --success-11:#60bb83;
  --caution-2:#1d1102; --caution-6:#63471c; --caution-9:#c38c37; --caution-11:#e8aa4e;
  --danger-2:#200e0d;  --danger-6:#72302d;  --danger-9:#d55753;  --danger-11:#f28881;
}

@theme inline {
  --color-neutral-1: var(--neutral-1); --color-neutral-2: var(--neutral-2);
  --color-neutral-3: var(--neutral-3); --color-neutral-4: var(--neutral-4);
  --color-neutral-5: var(--neutral-5); --color-neutral-6: var(--neutral-6);
  --color-neutral-7: var(--neutral-7); --color-neutral-8: var(--neutral-8);
  --color-neutral-9: var(--neutral-9); --color-neutral-10: var(--neutral-10);
  --color-neutral-11: var(--neutral-11); --color-neutral-12: var(--neutral-12);
  --color-accent-1: var(--accent-1); --color-accent-2: var(--accent-2);
  --color-accent-3: var(--accent-3); --color-accent-4: var(--accent-4);
  --color-accent-5: var(--accent-5); --color-accent-6: var(--accent-6);
  --color-accent-7: var(--accent-7); --color-accent-8: var(--accent-8);
  --color-accent-9: var(--accent-9); --color-accent-10: var(--accent-10);
  --color-accent-11: var(--accent-11); --color-accent-12: var(--accent-12);
  --color-success-2: var(--success-2); --color-success-6: var(--success-6);
  --color-success-9: var(--success-9); --color-success-11: var(--success-11);
  --color-caution-2: var(--caution-2); --color-caution-6: var(--caution-6);
  --color-caution-9: var(--caution-9); --color-caution-11: var(--caution-11);
  --color-danger-2: var(--danger-2); --color-danger-6: var(--danger-6);
  --color-danger-9: var(--danger-9); --color-danger-11: var(--danger-11);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body { background: var(--neutral-1); color: var(--neutral-12); font-family: var(--font-sans); }
```
This gives every Tailwind utility for free: `bg-neutral-2`, `text-accent-11`, `border-neutral-6`, `bg-success-9`, etc. Dark mode is driven by `next-themes` toggling `class="dark"` on `<html>` (`attribute="class"`, its default).

### 2.2 Spacing scale
Base unit 4px / `0.25rem`, matching Tailwind v4's own `--spacing` multiplier exactly ([tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)) — so this is a *usage* spec, not a competing scale; use Tailwind's own `p-4`, `gap-6`, etc. directly.

| Token | rem | px | Primary usage |
|---|---|---|---|
| `space-1` | 0.25rem | 4px | icon-to-label gap, chip internal gap |
| `space-2` | 0.5rem | 8px | tight stack gap, badge padding-y |
| `space-3` | 0.75rem | 12px | button padding-y, input padding-y |
| `space-4` | 1rem | 16px | card padding (mobile), default stack gap |
| `space-5` | 1.25rem | 20px | form field gap |
| `space-6` | 1.5rem | 24px | card padding (desktop), section inner gap |
| `space-8` | 2rem | 32px | gap between cards in a grid |
| `space-10` | 2.5rem | 40px | page gutter (tablet) |
| `space-12` | 3rem | 48px | section gap (mobile) |
| `space-16` | 4rem | 64px | section gap (desktop, small) |
| `space-20` | 5rem | 80px | hero top padding (mobile) |
| `space-24` | 6rem | 96px | section gap (desktop, standard) |
| `space-32` | 8rem | 128px | hero top/bottom padding (desktop) |

Page content max-width: **1120px**, centered, with `space-6` (24px) side gutter below 768px and `space-10` (40px) between 768–1120px.

### 2.3 Border-radius scale
Only two radii carry 90% of the UI, directly following the Vercel pattern in §1.2 ("two values, not ten") — extended with three more for shapes Vercel's dashboard doesn't need (pills, large modal surfaces, a shared tiny radius for inline controls).

| Token | rem | px | Usage |
|---|---|---|---|
| `radius-xs` | 0.25rem | 4px | checkbox, inline code span, small tag corner |
| `radius-sm` | 0.375rem | 6px | input, select, small/ghost button |
| `radius-md` | 0.5rem | 8px | primary/secondary button, tool-card inner chip |
| `radius-lg` | 0.75rem | 12px | card, panel, popover |
| `radius-xl` | 1rem | 16px | dialog/modal surface, hero visual panel |
| `radius-full` | 9999px | — | pill/badge, avatar, theme-toggle track, segmented control |

### 2.4 Shadow / elevation scale
Grounded in the Vercel pattern (§1.2): a hairline border simulated as a zero-blur shadow, plus a soft, low-opacity elevation shadow — never a heavy skeuomorphic drop shadow. Dark mode does **not** simply reuse black shadows (invisible on a near-black canvas) — it lightens the hairline instead, which is the standard, correct dark-mode technique.

| Token | Light mode `box-shadow` | Dark mode `box-shadow` | Usage |
|---|---|---|---|
| `elevation-0` | `none` | `none` | flat background |
| `elevation-1` | `0 0 0 1px rgba(13,16,20,0.08)` | `0 0 0 1px rgba(255,255,255,0.08)` | card/panel at rest |
| `elevation-2` | `0 0 0 1px rgba(13,16,20,0.08), 0 2px 4px rgba(13,16,20,0.04)` | `0 0 0 1px rgba(255,255,255,0.09), 0 2px 4px rgba(0,0,0,0.40)` | hovered/raised card, dropdown menu |
| `elevation-3` | `0 0 0 1px rgba(13,16,20,0.08), 0 8px 24px rgba(13,16,20,0.10), 0 2px 8px rgba(13,16,20,0.06)` | `0 0 0 1px rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)` | popover, tooltip (Radix Tooltip/Popover content) |
| `elevation-4` | `0 0 0 1px rgba(13,16,20,0.08), 0 24px 48px -12px rgba(13,16,20,0.28)` | `0 0 0 1px rgba(255,255,255,0.10), 0 24px 48px -12px rgba(0,0,0,0.70)` | dialog/modal (Radix Dialog content) |
| scrim | `rgba(13,16,20,0.40)` | `rgba(0,0,0,0.65)` | Dialog overlay backdrop |

Transition for any elevation/state change: `transition: box-shadow 150ms ease-out, transform 150ms ease-out` — see Do/Don't #1 for the motion budget.

### 2.5 Type scale
Geist Sans for everything except code/data, which is Geist Mono exclusively (no third typeface, ever — see Do/Don't #10).

| Token | Size | Line-height | Weight | Letter-spacing | Font | Usage |
|---|---|---|---|---|---|---|
| `display-2xl` | 3.5rem / 56px | 1.05 | 600 | -0.02em | Sans | hero headline, desktop |
| `display-xl` | 2.75rem / 44px | 1.10 | 600 | -0.015em | Sans | hero headline mobile; secondary-page hero |
| `display-lg` | 2.25rem / 36px | 1.15 | 600 | -0.01em | Sans | section headers ("How it works," "Tools") |
| `heading-xl` | 1.875rem / 30px | 1.25 | 600 | -0.005em | Sans | modal/dialog titles, page `/sources` header |
| `heading-lg` | 1.5rem / 24px | 1.30 | 600 | 0 | Sans | sub-section headers, company-profile name |
| `heading-md` | 1.25rem / 20px | 1.40 | 600 | 0 | Sans | card titles (tool-card, role-search-result-card) |
| `heading-sm` | 1.0625rem / 17px | 1.40 | 600 | 0 | Sans | list-item titles, active nav item |
| `body-lg` | 1.125rem / 18px | 1.60 | 400 | 0 | Sans | hero sub-headline, lead paragraph |
| `body-md` | 1rem / 16px | 1.60 | 400 | 0 | Sans | default body text (base size) |
| `body-sm` | 0.875rem / 14px | 1.55 | 400 | 0 | Sans | card descriptions, form helper text |
| `caption` | 0.8125rem / 13px | 1.40 | 500 | 0 | Sans | timestamps, metadata, badge label |
| `overline` | 0.75rem / 12px | 1.30 | 600 | +0.04em, uppercase | Sans | section eyebrow ("01 · HOW IT WORKS") — max one per screen |
| `mono-md` | 0.9375rem / 15px | 1.60 | 400 | 0 | Mono | install-snippet code blocks, CLI commands |
| `mono-sm` | 0.8125rem / 13px | 1.50 | 400 | 0 | Mono | inline code, endpoint paths, source URLs, rubric IDs |

---

## 3. Components

### 3.0 Foundational atoms (not in the required list, but every component below is built from these)
- **Button** — primary (`accent-9` fill)/secondary (`neutral-3` fill)/ghost (transparent, `neutral-2` on hover)/destructive (`danger-9` fill) variants; built on **Radix Slot** so it can render as a native `<button>` or, via `asChild`, as a Next.js `<Link>`.
- **Badge / StatusPill** — `subtle` (step-2 bg + step-11 text) and `solid` (step-9 bg + the on-solid text rule from §2.1) variants, in neutral/accent/success/caution/danger tones.
- **Card** — shell at `elevation-1` + `radius-lg`, `elevation-2` on hover only if the whole card is a click target.
- **Input / Select / SegmentedControl** — `radius-sm`, `neutral-7` border, `accent-8` border on focus plus a 2px `accent-6` focus ring offset 2px.
- **Chip** — small `radius-full` pill, used by `source-citation-chip` and by filter tags.

### 3.1 `hero`
**Purpose:** the single above-the-fold statement of what this is, plus proof it's real. One `overline`, one `display-2xl`/`display-xl` headline, one `body-lg` sentence (not a paragraph), two CTAs (primary → jump to install-snippet; secondary, ghost → "Open the playground," links to `/try`), and — fulfilling the parent brief's hard requirement — a **real, live chat-transcript UI panel** (actual rendered markup: a user bubble, a "⚙ calling `tool_name`" status line, an assistant bubble with a `source-citation-chip` inline), never a screenshot or stock image. On first paint the transcript may type out once (respecting `prefers-reduced-motion`: render instantly, no animation, if set); after that it's static.

### 3.2 `install-snippet tabs-with-copy-button`
**Purpose:** the one-decision install flow (see synthesis in §1.14). Structure, top to bottom:
1. A promoted **"Fastest path" callout** (not a tab) with the single Claude Code one-liner: `claude mcp add --transport http clearance-lens https://clearance-lens.vercel.app/mcp`, plus its own copy button.
2. **Radix Tabs** (`@radix-ui/react-tabs`, already installed) labeled `Claude` · `Cursor` · `ChatGPT` · `VS Code` · `JSON`. Each panel shows exactly one `mono-md` fenced snippet with a copy button pinned top-right (icon button, `radius-sm`, `elevation-0` at rest) that swaps its icon + `caption`-sized label to a check mark + "Copied" for 1200ms, then reverts.
3. A collapsed **Accordion** item below the tabs, closed by default, labeled "Manual setup (JSON)," for anyone whose client isn't listed — generic `mcpServers` JSON using the same server URL constant.
The server URL/command string is defined exactly once in code and interpolated into every tab — never hand-duplicated (this mirrors Stripe's and Linear's own pattern, §1.3/§1.12).

### 3.3 `tool-card`
**Purpose:** one per MCP tool, in a grid on `/`. Shows the tool's literal name in `mono-sm` (e.g. `search_defense_roles`), a one-sentence purpose in `body-sm`, 2–4 input/output field chips in `mono-sm`, and a ghost-button "Try it" (Slot → Next.js `Link` to `/try?tool=...`). Grid: 3 columns desktop / 2 tablet / 1 mobile, equal-height via CSS grid (`grid-auto-rows: 1fr`), never JS-measured.

### 3.4 `role-search-result-card`
**Purpose:** one role in `/try`'s search results. Company name, role title (`heading-sm`), 2–3 requirement chips distinguishing **stated** (solid `neutral-7` border) from **inferred** (dashed border + Radix Tooltip: "inferred from the job post, not stated") requirements, and a `source-citation-chip` to the original posting. Click opens the matching `company-profile-card`.

### 3.5 `timeline-estimator-widget`
**Purpose:** renders `estimate_timeline` output as a **range**, never a single confident number: a horizontal bar in `accent-9` from min→max with the "likely" point marked, a bullet list of key drivers each carrying a `source-citation-chip`, and a `caption`-sized uncertainty line ("Based on DCSA's published averages — your case can vary; see sources").

### 3.6 `rubric-checklist`
**Purpose:** renders `get_role_rubric` / per-criterion fit rows. Each row: criterion label (`body-md`) + a `StatusPill` in exactly three tones — **aligned = success, mixed = caution, unclear = neutral** (never danger — see Do/Don't #9) — with a Radix Tooltip on the pill revealing the agent's evidence/reasoning text. Rows group into a Radix **Accordion** (Eligibility / Skills / Logistics) once there are more than ~6.

### 3.7 `trial-assessment-card`
**Purpose:** renders `build_trial_assessment`. A `disclaimer-banner` ("Built only from the public job post — ITAR-safe") pinned above Radix **Tabs**: Brief / Deliverables / Rubric / What great looks like. A `SegmentedControl` for 60/90/180 minutes re-requests the assessment at a different length.

### 3.8 `job-preview-scene-player`
**Purpose:** renders `run_job_preview`'s 6-scene simulation **one scene at a time** — a 6-segment stepper (filled = current/past) above a single stage showing scene setup text, 2–4 choice buttons, then (after a choice) a "what real teams report" panel and debrief prompts inside an Accordion. Never a long scroll of all 6 scenes at once.

### 3.9 `fit-debrief-summary`
**Purpose:** renders `fit_debrief`. Loved/disliked tags as Chips, 2–3 suggested questions for the company, and an editable `<textarea>` share-draft. **No number, star rating, or progress bar anywhere in this component** — it is explicitly never a score (Hard Constraint 4 of the parent brief).

### 3.10 `company-profile-card`
**Purpose:** renders `get_company_profile`. Header (name/slug), then either: published criteria as `rubric-checklist`-style rows with a `source-citation-chip` + one-line job-relevance reason each, **or**, if none exist, an `empty-state` variant ("No published criteria — we won't guess") instead of any fit read. A "Work realities" section and a collapsed "Gaps" Accordion.

### 3.11 `source-citation-chip`
**Purpose:** the atomic trust unit, used everywhere a number/rule/claim appears (directly modeled on Perplexity's citation pattern, §1.6). A small Chip (`mono-sm`, truncated source title) that on hover/focus (Radix **Tooltip**) shows the full title + URL + "last verified" date, and on click opens the URL in a new tab. On `/sources` it expands into a full table row instead of a chip.

### 3.12 `disclaimer-banner`
**Purpose:** the one, consistent way every "not legal advice / ITAR-safe / stateless" notice appears. Deliberately undramatic: `neutral-2` background, `neutral-7` hairline border, `body-sm` text, at most one inline link — **never** caution/danger colored, never a floating toast, never repeated more than once per view (see Do/Don't #3).

### 3.13 `empty-state`
**Purpose:** shared zero-results component (search, no-published-criteria, `/sources` filter miss). An icon (single-color, `neutral-9`), one sentence explaining *why* it's empty (not just "no results"), and — where resolvable — one button that fixes it (clear a filter, widen the search).

### 3.14 `loading-skeleton`
**Purpose:** shape-matched placeholder for every async tool call — never a generic spinner. Each consumer (`tool-card`, `role-search-result-card`, `rubric-checklist`, `timeline-estimator-widget`) gets its own skeleton variant mirroring its real box layout, pulsing opacity between `neutral-3` and `neutral-4` over 1.6s; freezes on `neutral-3` (no pulse) under `prefers-reduced-motion`.

### 3.15 `error-state`
**Purpose:** shared component for a failed tool call/fetch. States what failed in plain language (never a raw error code/stack), a Retry button, and — specifically for the PII/CUI rejector — a distinct, non-alarming copy variant ("we can't process that here — here's why, and what to do instead" rather than a security-alert tone).

### 3.16 `theme-toggle`
**Purpose:** light/dark/system switch in `nav`, built on Radix **Switch** but styled visually as a 2-position sun/moon icon toggle rather than a literal on/off track, wired to `next-themes` (which already owns persistence — no custom storage code needed).

### 3.17 `nav`
**Purpose:** sticky top bar; once scrolled, `background: color-mix(in oklch, var(--neutral-1) 85%, transparent)` + `backdrop-filter: blur(8px)`. Wordmark in `mono-sm`/weight 600, 3–4 text links (How it works / Tools / Try it / Sources), `theme-toggle`, one primary `Button` ("Add to your agent"). On mobile, links become a horizontally scrollable row — not a hidden hamburger drawer, since 4 items don't need one.

### 3.18 `footer`
**Purpose:** calm, dense close for every page — two link columns (Product: Tools/Try it/GitHub; Trust: Privacy/Sources/Status) plus one `caption`-sized disclaimer line ("Clearance Lens is not legal advice and never queries DISS/NBIS/DCSA. See Privacy."). No newsletter field, no social icon row, no logo cloud.

---

## 4. Radix primitive → component map
(All six are already installed per `package.json`: `@radix-ui/react-tabs@^1.2.1`, `@radix-ui/react-dialog@^1.3.1`, `@radix-ui/react-tooltip@^1.4.1`, `@radix-ui/react-accordion@^1.3.1`, `@radix-ui/react-switch@^1.4.1`, `@radix-ui/react-slot@^1.5.0`.)

| Radix primitive | Maps to | Why |
|---|---|---|
| **Tabs** | `install-snippet tabs-with-copy-button` (client tabs); `trial-assessment-card` (Brief/Deliverables/Rubric/What-great-looks-like); `company-profile-card` (Published Criteria/Work Realities/Gaps, on wide screens) | any UI that shows exactly one of N labeled panels at a time |
| **Dialog** | `company-profile-card` "view full profile" expansion; `job-preview-scene-player` full-screen scene takeover on mobile; the consented-card preview in `fit-debrief-summary`'s share flow; a keyboard-shortcuts helper | any full-attention, modal overlay with a scrim |
| **Tooltip** | `source-citation-chip` (hover → full citation); `rubric-checklist` (hover a `StatusPill` → evidence text); inferred-vs-stated chips in `role-search-result-card`; icon-only buttons in `nav`/`theme-toggle` | any hover/focus-revealed detail that shouldn't need a click |
| **Accordion** | FAQ on `hero`'s page; `rubric-checklist` criterion groups; `company-profile-card`'s Gaps section; `/sources` category groups; the install-snippet's "Manual setup (JSON)" fallback | any content that should default closed to protect density |
| **Switch** | `theme-toggle`; binary filters in `/try` (e.g. "ITAR only," "Remote only") | strictly binary, immediately-applied state — not for the 60/90/180 minute picker, which is a `SegmentedControl`, not binary |
| **Slot** | the shared `Button`/`Badge`/`Chip`/nav-`Link` atoms underneath almost every component above | the cross-cutting rule: *any* component that must sometimes render as a native element and sometimes as a Next.js `<Link>` composes through `asChild` on Slot, so styling never forks between the two cases |

---

## 5. ASCII wireframes

### `/` — landing
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⌁ Clearance Lens     How it works   Tools   Try it   Sources        [☾]  [Add to agent]│ nav (sticky)
├──────────────────────────────────────────────────────────────────────────────────────┤
│  STATELESS MCP SERVER                            ┌ live agent transcript ───────────┐  │
│                                                   │ > can a green-card holder work   │  │
│  Pursue defense-tech roles from                  │   the Anduril Fury role?         │  │ hero
│  inside your own agent.                          │ ⚙ calling check_my_eligibility   │  │
│                                                   │ Green-card holders are US        │  │
│  Your agent reasons privately on rubrics,        │ persons under ITAR §120.62 ...   │  │
│  timelines, and trial work — we never see        │ [22 CFR 120.62 ↗]                │  │
│  your answers.                                   └───────────────────────────────────┘  │
│  [ Add to your agent ↓ ]  [ Open the playground → ]                                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ADD TO YOUR AGENT                                                                        │
│ ⚡ Fastest path — Claude Code:  $ claude mcp add --transport http clearance-lens ... [⧉] │ install-snippet
│ ┌ Claude │ Cursor │ ChatGPT │ VS Code │ JSON ┐                                           │
│ │  { "mcpServers": { "clearance-lens": { "url": "https://clearance-lens.vercel.app/mcp" │
│ │  } } }                                                               [⧉ Copy]  │        │
│ │  ▸ Manual setup (JSON)                                          (closed accordion)     │
│ └──────────────────────────────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ HOW IT WORKS                                                                             │
│  01 — Your agent calls our tools   02 — We return public knowledge  03 — Your agent     │
│       for a role or a rule              only — never PII                 reasons privately│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ TOOLS                                                                                     │
│ ┌ tool-card ──────┐  ┌ tool-card ──────┐  ┌ tool-card ──────┐                            │
│ │ search_defense_ │  │ estimate_       │  │ build_trial_    │   (3 × N grid)              │
│ │ roles           │  │ timeline        │  │ assessment      │                             │
│ │ [Try it →]      │  │ [Try it →]      │  │ [Try it →]      │                             │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ⓘ Clearance Lens is not legal advice and never touches DISS/NBIS/DCSA.  [Privacy →]      │ disclaimer-banner
├──────────────────────────────────────────────────────────────────────────────────────┤
│ FAQ  ▸▸▸▸▸ (accordion, 5–6 items, all closed by default)                                 │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Product: Tools · Try it · GitHub      Trust: Privacy · Sources · Status                  │ footer
│ Clearance Lens is not legal advice and never queries DISS/NBIS/DCSA. See Privacy.        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
*Mobile (≤480px): transcript panel moves below the headline; the two hero CTAs stack full-width; the tool grid becomes 1 column; nav links become a horizontally-scrollable row under the logo row rather than a drawer.*

### `/try` — playground
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⌁ Clearance Lens        Playground · no agent required                 [☾]   [Home]   │ nav
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌ Search roles │ Timeline │ Trial assessment │ Job preview │ Explain a rule ┐  (Tabs)   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS (240px)          │ RESULTS                                                      │
│ Clearance   [ None ▾ ]   │ ┌ role-search-result-card ─────────────────────────────┐    │
│ ITAR only   [ ○ Switch ] │ │ Anduril · Software Engineer, Lattice    [Secret][ITAR]│    │
│ Location    [_________]  │ │ ┄┄ inferred: Secret clearance (tooltip) ┄┄   [src ↗] │    │
│ Remote      [ ○ Switch ] │ └────────────────────────────────────────────────────────┘    │
│ [ Search ]               │ ┌ role-search-result-card ─────────────────────────────┐    │
│                          │ │ Saronic · Controls Engineer               [TS/SCI]    │    │
│                          │ └────────────────────────────────────────────────────────┘    │
│                          │ (loading-skeleton while fetching · empty-state if 0 results)  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ⓘ Role data is cached from public postings — see Sources for what's verified.           │ disclaimer-banner
└──────────────────────────────────────────────────────────────────────────────────────┘
```
*Mobile: the filter column collapses above the results as a single-row horizontal scroller of filter chips; tabs become a horizontally-scrollable row instead of wrapping.*

### `/privacy`
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⌁ Clearance Lens     How it works   Tools   Try it   Sources        [☾]  [Add to agent]│ nav
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Privacy                                                                    (heading-xl) │
│ Stateless by design. No account, no database, no PII.                      (body-lg)    │
│                                                                                           │
│ What we receive                                                            (heading-lg) │
│ A role ID, a rule topic, or fields you explicitly approved for a share card. Nothing else.│
│                                                                                           │
│ What we store                                                                             │
│ Nothing. No database of users or queries.                                                │
│                                                                                           │
│ What we refuse                                                                            │
│ SSNs, dates of birth, passport numbers, case/investigation numbers, clearance record text,│
│ image uploads — rejected with a plain-language explanation, not a security-alert tone.    │
│  ┌ example (mono-sm) ───────────────────────────────┐                                     │
│  │ POST /api/tools/explain_rule  { "topic": "123-45-6789 is my SSN, am I eligible?" }     │
│  │ → 400  "We can't process identifying numbers here. Remove it and ask again — see       │
│  │         Privacy for why." (error-state copy variant)                                   │
│  └────────────────────────────────────────────────────┘                                   │
│                                                                                           │
│ What we log                                                                               │
│ Timestamps and tool names only. Request bodies are never logged.                          │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Product: Tools · Try it · GitHub      Trust: Privacy · Sources · Status                  │ footer
└──────────────────────────────────────────────────────────────────────────────────────┘
```
*This page is plain prose, not a dashboard — no `disclaimer-banner` component here (the whole page already is the disclaimer; wrapping it in its own banner would be redundant chrome, see Do/Don't #3). One narrow column, max-width ~680px, left-aligned, no sidebar.*

### `/sources`
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⌁ Clearance Lens     How it works   Tools   Try it   Sources        [☾]  [Add to agent]│ nav
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Sources                                      N sources · last verified YYYY-MM-DD       │ heading-xl + caption
│ [ Search sources__________ ]  [ All ▾ ]  ITAR  Clearance process  Compliance  Assessment│ filter row
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ▾ ITAR & export control (12)                                                 (Accordion) │
│    "US person" definition        22 CFR 120.62         verified YYYY-MM-DD        [↗]    │ source-citation-chip
│    Deemed export rule            15 CFR 734.13         verified YYYY-MM-DD        [↗]    │ (expanded row form)
│ ▸ Clearance process & timelines (18)                                                     │
│ ▸ Hiring compliance & bias law (9)                                                       │
│ ▸ Assessment science (6)                                                                 │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Product: Tools · Try it · GitHub      Trust: Privacy · Sources · Status                  │ footer
└──────────────────────────────────────────────────────────────────────────────────────┘
```
*This is the one page allowed to be dense and table-like (see Do/Don't #2) — rows use `mono-sm` for citation codes/dates and sit tighter (`space-2` row padding) than any other page's list rows.*

---

## 6. Do / Don't rules

1. **Motion.** Do use short, `150ms ease-out` opacity+4px-translate transitions for state changes only (hover, tab switch, copy confirmation). Don't use spring/bounce physics, scroll-triggered parallax, or any auto-playing looped animation — restraint reads as credibility here, exactly as in Anduril's and Linear's reference patterns (§1.1, §1.9).
2. **Density is page-dependent, deliberately.** Do let `/sources` and `/try`'s result lists run dense and table-like (tight `mono-sm` rows), mirroring Stripe's API-reference register. Don't let `/`'s hero or "How it works" section exceed ~2 short sentences per block or stack more than 2 CTAs on one screen — marketing surfaces stay sparse even though data surfaces don't.
3. **Show uncertainty as content, not as a warning.** Do fold uncertainty into the data itself — a range instead of a point estimate, a tooltip with the actual reasoning behind an "unclear" pill — styled with the exact same type scale as surrounding body text. Don't render disclaimers as a yellow caution-triangle banner repeated at every step; `disclaimer-banner` (§3.12) is one calm, neutral-colored component that appears once per view, directly above the content it qualifies.
4. **One-click install, really.** Do put the copy/deep-link action as the very first thing in every install-snippet tab, before any explanatory text, with a visible confirmation state (checkmark + "Copied," 1200ms) — exactly the Stripe/Context7 pattern in §1.3/§1.11/§1.14. Don't make a visitor read prose before they can act, and don't give the manual-JSON fallback equal visual weight to the one-click path — it's smaller, mono, and collapsed behind an Accordion by default.
5. **Color is reserved for interaction and status, never decoration.** Do keep `accent` and the three semantic hues strictly on buttons, links, pills, focus rings, and the live transcript's tool-call line — "used like a highlighter," per the Ramp pattern (§1.8). Don't tint page backgrounds, hero panels, or illustrations with brand color; backgrounds stay `neutral-1`/`neutral-2` in both themes, as in Linear/Vercel/Anduril.
6. **The product demonstrates itself.** Do represent "an agent using this tool" as a real, rendered chat-transcript component with real component markup and real copy (per the parent brief's hard requirement and the `hero` spec in §3.1). Don't use a screenshot, a mockup image, or any stock photography (laptops, soldiers, circuit boards) to stand in for the product — Anduril and Mercury both demonstrate the product as itself, never as a photo of it.
7. **One dominant element per screen.** Do give every page exactly one `display-*` element and treat everything else as `heading-lg` or smaller. Don't let a `tool-card` title, a page's hero headline, and the nav wordmark compete at similar visual weight on the same screen — see Raycast's single-headline hero (§1.4) as the model.
8. **States write in the product's voice, with a next action.** Do make every `empty-state`/`error-state` explain *why* and offer one button that resolves it ("No roles match these filters — widen clearance level or location"). Don't ship a bare "No results" string or an unlabeled spinner; every `loading-skeleton` must match the exact shape of the content it's replacing, not a generic bar.
9. **Status has exactly three tones, and danger is never a verdict on a person.** Do use success/caution/neutral for aligned/mixed/unclear everywhere a per-criterion result appears, using the exact on-solid text rule from §2.1. Don't invent a 4th "fail" status for any fit output — `danger` is reserved exclusively for system errors and destructive actions (a failed request, a reject-this-PII confirmation), never for describing a candidate, per Hard Constraint 4 of the parent brief.
10. **Two typefaces, two weights, one eyebrow per screen.** Do use Geist Sans for all UI text and Geist Mono exclusively for code, commands, endpoints, source URLs, and numeric IDs; use weight 600 for emphasis and 400 for body (500 only for `caption`). Don't introduce a third typeface, a serif/script accent, or more than one `overline`-styled eyebrow label per screen.

---

## 7. Implementation checklist
- [ ] Replace `next/font/google` Geist/Geist_Mono in `app/layout.tsx` with `geist/font/sans` + `geist/font/mono` (§2.1 code block).
- [ ] Replace `app/globals.css`'s two-variable (`--background`/`--foreground`) scheme with the full token block in §2.1, including `@custom-variant dark (&:where(.dark, .dark *));`.
- [ ] Wrap the app in `next-themes`' `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` (package already installed, `^0.4.6`) — `theme-toggle` (§3.16) assumes this.
- [ ] Scaffold `components/ui/` for the foundational atoms (§3.0: Button, Badge, Card, Input/Select/SegmentedControl, Chip) before the 18 named components, since every one of them composes from these.
- [ ] Build the 18 named components (§3) as individual files matching their kebab-case names (e.g. `components/install-snippet.tsx`, `components/rubric-checklist.tsx`), each importing only the Radix primitive(s) listed for it in §4.
- [ ] Define the Clearance Lens MCP server URL (`https://clearance-lens.vercel.app/mcp`, per `DECISIONS.md`'s Vercel project name) as a single exported constant and interpolate it into every `install-snippet` tab and the Claude Code one-liner — never hand-duplicate it.
- [ ] Verify all four wireframed routes (`/`, `/try`, `/privacy`, `/sources`) against the Do/Don't list in §6 before shipping a design-review pass.

---

## Sources
- Radix Themes color system (12-step scale) — https://www.radix-ui.com/themes/docs/theme/color
- Vercel Geist design system / color token roles — https://vercel.com/geist , https://vercel.com/geist/colors , https://vercel.com/geist/colors.md
- Vercel dashboard redesign (context) — https://vercel.com/blog/dashboard-redesign
- Vercel dashboard concrete radius/shadow values (secondary teardown) — https://blakecrosley.com/guides/design/vercel
- Tailwind CSS v4 theme docs (`--spacing: 0.25rem`, oklch default palette) — https://tailwindcss.com/docs/theme
- Tailwind v4 dark-mode class variant recipe — https://dev.to/khanrabiul/nextjs-tailwindcss-v4-how-to-add-darklight-theme-with-next-themes-3c6l , https://dev.to/abujakariacse/dark-mode-with-tailwind-v4-next-themes-1mag
- `geist` npm package (GeistSans/GeistMono import paths) — https://www.npmjs.com/package/geist
- Stripe MCP docs (install pattern, per-client sections, deep-link buttons) — https://docs.stripe.com/mcp
- Stripe docs site structure — https://docs.stripe.com
- Linear MCP changelog (install sections, SSE endpoint) — https://linear.app/changelog/2025-05-01-mcp
- Linear MCP setup guide, HTTP endpoint note (secondary) — https://www.builder.io/blog/linear-mcp-server
- Linear brand color (secondary) — https://colorfyi.com/brands/linear/ , https://colors.codes/color/5e6ad2
- Linear design philosophy / dark-mode backgrounds (secondary) — https://cdn.jsdelivr.net/npm/oh-my-opencode@4.18.2/dist/skills/frontend/references/design/linear.app.md
- Context7 install page (single setup command, client table, not tabs) — https://context7.com , https://context7.com/install
- speedrun-talent-network.com homepage — https://speedrun-talent-network.com
- speedrun-talent-network.com developer docs (REST + MCP, curl example) — https://speedrun-talent-network.com/developers
- Raycast official brand color — https://developers.raycast.com/api-reference/user-interface/colors
- Raycast homepage copy/tone — https://www.raycast.com
- Raycast hero gradient (secondary) — https://www.webdesignhot.com/design.md/raycast/
- Arc / The Browser Company sunset notice (Dec 22, 2026 → Dia) — https://arc.net
- Arc design pattern notes (secondary) — https://www.howtogeek.com/888738/ways-arc-transforms-your-web-browser-experience/ , https://open-design.ai/systems/arc/
- Perplexity citation-as-interface pattern — https://aiuxplayground.com/guides/how-to-design-ai-citations , https://theneuralbase.com/perplexity-api/learn/advanced/ui-patterns-for-citations/
- Perplexity brand colors (secondary) — https://www.designpieces.com/palette/perplexity-color-palette-hex-and-rgb/ , https://brand-atoms.pages.dev/dist/brands/perplexity/1.0.0/markdown/brand-guide.md
- Mercury design pattern (secondary teardown) — https://blakecrosley.com/guides/design/mercury
- Ramp design pattern (secondary) — https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825 , https://www.webdesignhot.com/design.md/ramp/
- Anduril typeface (Helvetica Now) — https://fontsinuse.com/uses/32662/anduril-industries
- Anduril visual tone (secondary) — https://uiuxshowcase.com/industrial-design/anduril-defence-technology/
- Clearance Lens repo state used for this report (local, read directly): `/Users/zakirjiwani/speedrunapps/package.json`, `app/layout.tsx`, `app/globals.css`, `README.md`, `DECISIONS.md`

**Methodology note on OKLCH→hex and contrast numbers in §2.1:** computed directly (not sourced) via a Python script implementing the standard CSS Color 4 OKLab conversion matrices and the WCAG 2.x relative-luminance/contrast formula; script and raw output available in this session's scratchpad if re-verification is needed.
