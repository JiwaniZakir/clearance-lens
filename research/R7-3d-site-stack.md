<!-- R7 — 3D marketing-site stack, device models, performance, and brand assets -->
> **Provenance:** research subagent report, 2026-11-12, saved verbatim. Claims are labeled in the text by source quality (official docs vs. vendor forum vs. third-party). Nothing here was verified with a signed-in account on the platforms described; the live-server probes were read-only. Decisions taken from it are recorded in `DECISIONS.md`.

# Clearance Lens 3D site: research report (checked 2026-11-12)

**Sources.** Versions come from registry.npmjs.org JSON. Repo data comes from the GitHub API via `gh`. Behaviour claims were read from package source (I downloaded the tarballs) and from official docs, including the Next 16.4.6 docs in `node_modules/next/dist/docs`. I also ran a strict `npm install --package-lock-only` peer check against your `next 16.4.6` / `react 19.3.0`. Third-party sources are labelled where I used them.

**What I couldn't fetch.** AgentMux returned `gateway-unavailable`, so I used the native tools. x.ai, npmjs.com, codepen.io and tympanus.net return 403 to curl because of bot protection. I read the x.ai and Codrops pages through Firecrawl instead. No repo files were changed.

## Bottom line
1. **Stack:** R3F 9.8.2 + drei 10.7.9 + three 0.187.0 + GSAP 3.15.1 (ScrollTrigger) + @gsap/react 2.1.2 + Lenis 1.3.27. This resolves cleanly with your Next 16.4.6 and React 19.3.0 under strict peer checking.
2. **GSAP license:** it really is free, including every plugin, since 3.13.0 (published 2025-04-30). It uses Webflow's "Standard No Charge" license, which is not an open-source license. The only use it bans is visual no-code animation builders that compete with Webflow, which doesn't apply to you.
3. **Devices:** I recommend building both devices in code. If you want modelled detail, use CC-BY models: the Rendercore phone, where I confirmed the screen is its own mesh, and Blaž Mraz's "Modern Slim Laptop". I rejected every Apple or Samsung lookalike.
4. **Three blockers to fix before building:**
   - **CSP:** your current CSP will break GLB textures, any WASM decoder, and drei's CDN defaults.
   - **Lighthouse:** `lighthouserc.json` requires a score of at least 0.95 in every category, so the 3D code has to stay out of the critical path.
   - **Logos:** you need written permission for the a16z and speedrun logos, and Meta requires approval for its logo. There is no Muse brand kit. x.ai logos may only be used exactly as provided.

## 1. 3D + scroll stack

| Package | Version (published) | License | Peers / notes |
|---|---|---|---|
| three / @types/three | 0.187.0 (2026-10-30) | MIT | Pin to 0.187.x, because postprocessing 6.39.6 requires `three <0.188`. |
| @react-three/fiber | 9.8.2 (2026-10-14) | MIT | `react` and `react-dom` must be `>=19 <19.4`. Don't move to React 19.4 until R3F widens this. v10 is still alpha and WebGPU-first; skip it. |
| @react-three/drei | 10.7.9 (2026-09-25) | MIT | Requires react ^19, fiber ^9, three >=0.159. |
| gsap | 3.15.1 (2026-11-04) | [GSAP Standard License](https://gsap.com/standard-license), effective 2025-04-30, © Webflow | The 3.15.1 tarball ships ScrollTrigger, ScrollSmoother, SplitText, Flip, MorphSVG, DrawSVG, Inertia and the rest. Webflow's announcement: [webflow.com/blog/gsap-becomes-free](https://webflow.com/blog/gsap-becomes-free). A beta `4.0.0-beta.4` came out 2026-11-11; stay on 3.x. |
| @gsap/react | 2.1.2 (2025-01-15) | GSAP license | gsap ^3.12.5, react >=17. Provides `useGSAP`. |
| lenis | 1.3.27 (2026-10-15) | MIT | Import from `lenis/react` (`ReactLenis`, `useLenis`). `respectReducedMotion` defaults to `true`. The old `@studio-freight/*` packages are deprecated. |
| zustand / maath | 5.1.0 / 0.10.8 | MIT | For passing scroll progress into the scene and for damping. |
| Optional: @react-three/postprocessing 3.2.2 + postprocessing 6.39.6 | 2026-10 / 2026-11 | MIT / Zlib | Requires fiber >=9.7.0. |
| framer-motion 14.13.0 | 2026-11-12 | MIT | Already in your repo at ^14.12. Use it only for DOM micro-interactions. |

**Alternatives, and why I'm not recommending them**

| Option | Version / license | Verdict |
|---|---|---|
| Spline: `@splinetool/react-spline` 4.2.0 (MIT wrapper) with `@splinetool/runtime` 2.0.178 | The runtime has no license field; Spline's own terms apply | **No.** The standalone runtime builds are 1.75–3.4 MB raw, about 400–716 KB brotli, and load WASM from Spline's CDN by default. Scenes are hosted on prod.spline.design unless you self-host them. The watermark is baked into the scene according to your plan. CSP would need Spline origins plus `'wasm-unsafe-eval'`. It's fine for prototyping. |
| Theatre.js 0.7.2 (2024-05-19; repo last pushed 2024-08) | core Apache-2.0, studio AGPL-3.0-only | **No.** `@theatre/r3f` requires `@react-three/fiber ^8.13.6`; I confirmed it fails with ERESOLVE against R3F 9. |
| drei `ScrollControls` | MIT | **No** for a content page. It scrolls a virtual container inside the canvas instead of the page, which hurts SEO, keyboard use and accessibility. |
| Motion `useScroll` | MIT | Fine for DOM work, but it has no pinning, snapping or timeline labels. |
| `@14islands/r3f-scroll-rig` 8.15.0 (2024-12) | MIT on GitHub, ISC on npm | Worth reading for the pattern, but built for R3F 8 / React 18 and it pulls in zustand 3.7.2. |
| Rive (`@rive-app/react-webgl2` 4.39.0) | MIT runtime | Optional: designer-built screen animations driven by scroll inputs, drawn to a CanvasTexture. |
| model-viewer 4.4.0, Babylon 9.36, Needle 6.0-alpha | Apache / Apache / commercial | Wrong fit for a React-first site. |

**Why this stack:**
- R3F and drei are React 19-native. They include `<Html>`, `<View>`, `<RenderTexture>`, `<PerformanceMonitor>` and `RoundedBox`, and the pmndrs examples already run on R3F 9.8.2 / drei 10.7.9.
- ScrollTrigger gives you pinning, scrubbing, snapping and labels. One master timeline can drive both the camera and the screen UI, and `gsap.matchMedia()` covers reduced motion.
- Lenis keeps native scrolling, so `position: sticky`, anchors and accessibility keep working, and it documents its ScrollTrigger sync (`lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t*1000))`; `lagSmoothing(0)`).

**Suggested architecture:**
- The page is a Server Component that contains all the story text.
- A small `'use client'` wrapper decides whether the device can run 3D, then loads the scene with `dynamic(() => import('./Scene'), { ssr: false })`.
- One fixed, `aria-hidden` canvas sits behind the DOM.
- Each chapter's GSAP timeline is pinned and scrubbed by scroll. It tweens a plain `story` object, which `useFrame` reads and damps.
- The device screens are real Tailwind components in `<Html transform occlude="blending">`, attached to the screen mesh and animated by the same timeline, so scrolling backwards rewinds the UI.
- Run a single animation loop: Lenis feeds `gsap.ticker`, which drives R3F (`frameloop="never"` plus `advance()`, or `"demand"` plus `invalidate()`).

## 2. Repos and examples to build on

| Repo | License | Last push | What to reuse |
|---|---|---|---|
| [pmndrs/examples](https://github.com/pmndrs/examples) | MIT | 2026-10-22 (examples on R3F 9.8.2 / drei 10.7.9 / React 19.2.9) | `mixing-html-and-webgl-w-occlusion`: `<Html transform occlude>` attached to a laptop screen mesh. `floating-laptop`: lid opening with react-spring. `monitors`: `<RenderTexture>` plus `<Text>` on screen meshes. `view-tracking`: several `<View>`s in one canvas. `tying-canvas-to-scroll-offset`. `interactive-spline-scene-live-html`. Live demos are at pmndrs.github.io/examples/<name>. **Don't reuse `mac-draco.glb`; it's a MacBook.** |
| [darkroomengineering/satus](https://github.com/darkroomengineering/satus) | MIT | 2026-11-12 (Next 16.4.5, React 19.3.1, R3F 9.8.2, drei 10.7.9, three 0.187, Tailwind 4.3.5) | The closest match to your stack. Reuse: a persistent root canvas fed through tunnels; three.js isn't downloaded until something renders into it; it only runs on WebGL2, desktop, non-touch devices without reduced motion, with a required fallback; it redraws on demand with `frameloop="never"`; and it composes its CSP per integration. |
| [JosephASG/codrops-cinematic-scroll-animations](https://github.com/JosephASG/codrops-cinematic-scroll-animations), for the Codrops tutorial "How to Build Cinematic 3D Scroll Experiences with GSAP" (2025-11-19) | No LICENSE file; Codrops says its demos are MIT unless noted ([licensing](https://tympanus.net/codrops/licensing/)) | 2026-03-16 (React 19.1, R3F 9.4, GSAP 3.13, Tailwind 4.1) | GSAP timeline driving camera moves and typography beats. |
| [codrops/SeamTransitions](https://github.com/codrops/SeamTransitions), [codrops/TextCharacterAnimations](https://github.com/codrops/TextCharacterAnimations) | MIT | 2026-10-30 / 2026-11-03 | Transitions from the hero into the page; SplitText headline reveals. |
| [GSAP imageSequenceScrub helper](https://gsap.com/docs/v3/HelperFunctions/helpers/imageSequenceScrub) and the official [CodePen VwgevYW](https://codepen.io/GreenSock/pen/VwgevYW) | GSAP | n/a | Apple AirPods-style scrubbing through canvas frames, if you want a photoreal pre-rendered hero. |
| [WhiiteRose/Apple](https://github.com/WhiiteRose/Apple), [adrianhajdin/gsap_macbook_landing](https://github.com/adrianhajdin/gsap_macbook_landing), [adrianhajdin/iphone](https://github.com/adrianhajdin/iphone) | **No license**, so all rights reserved | 2026-03 / 2025-10 / 2024-07 | Read only for pinned-timeline patterns. They use Apple models. |
| [paper-design/shaders](https://github.com/paper-design/shaders) (`@paper-design/shaders-react` 0.0.82) | Apache-2.0 | 2026-11-12 | Hero backgrounds with no dependencies: Dithering, GrainGradient, MeshGradient, DotGrid, Metaballs, Voronoi, Waves. They suit a monochrome look. Pre-1.0, so expect API changes. |
| [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) | MIT + Commons Clause, so use on a site is fine but resale isn't | 2026-11-10 | Copy-paste background components. |
| [pmndrs/uikit](https://github.com/pmndrs/uikit) (`@react-three/uikit` 1.0.78) | MIT | 2026-10-27 | UI drawn inside WebGL: crisp, and occludes correctly. An alternative to `<Html>` for screens. |
| [pmndrs/react-three-next](https://github.com/pmndrs/react-three-next) | MIT | 2024-06 | **Skip.** Stale (Next 14 / R3F 8). |

## 3. Device models
**Recommended first: build both devices in code.** Use drei `RoundedBox` or an `ExtrudeGeometry` rounded rectangle, a separate screen plane, and a lid group pivoting at the hinge. Light it with `MeshPhysicalMaterial` plus `<Environment>` and `<Lightformer>`s, which need no HDR download. That's roughly 2–5k triangles, zero bytes of model download, no license or trade-dress risk, and no CSP changes.

| Model | Author / license | Source / download | Size / polycount | Screen separate? |
|---|---|---|---|---|
| **Phone: "Smart phone"** | Rendercore / CC BY 3.0 | [poly.pizza/m/wBYYnxC42K](https://poly.pizza/m/wBYYnxC42K), direct GLB `https://static.poly.pizza/bf6cc972-27d1-4bb8-9490-a5859421a728.glb` | 0.47 MB / 7,947 tris | **Yes, confirmed** by parsing the GLB: a "Main Screen" material on the "Cube.001" and "Screen Protector" meshes. Generic punch-hole Android. |
| Phone: "Off-brand Android Smartphone" | SabasGT / CC BY 4.0 | [Sketchfab](https://sketchfab.com/3d-models/off-brand-android-smartphone-2a1c8666306e4116980daeb9406e7780) (download needs a free login) | 1.9 MB GLB (2 textures at 2K) / 4,054 faces | **Likely**: 8 materials, one with a wallpaper-textured screen. That wallpaper is Xiaomi's Mi 10 art and must be replaced. No notch. |
| Phone: "Generic Modern Phone Model" | ToMar_ / CC BY 4.0 | [Sketchfab](https://sketchfab.com/3d-models/generic-modern-phone-model-3eea9dd94d554e95b143b7b090b89f1f) | 5.9 MB / 95.7k faces | Likely (13 flat-colour materials). Original design; needs decimating. |
| **Laptop: "Modern Slim Laptop"** | Blaž Mraz / CC BY 4.0 | [Sketchfab](https://sketchfab.com/3d-models/modern-slim-laptop-fbf172f8b14241feab581dcb1fbcd475) | 2.1 MB (one 4K keyboard texture) / 43.2k faces, real scale 34 × 24 × 1.14 cm | Likely (8 materials). Dark, premium, generic look. **The keyboard texture has a Windows-logo key; edit "Keyboard Symbols.png".** |
| Laptop: "Laptop" | Aullwen / CC BY 4.0 | [Sketchfab](https://sketchfab.com/3d-models/laptop-7d870e900889481395b4a575b9fa8c3e) | 0.5 MB / 8,322 faces | The lid is its own object with its pivot on the hinge, per the author. The display is part of the lid texture, so you'd overlay a screen plane. Silver body reads slightly MacBook-like. |
| Laptop: "Laptop" | J-Toastie / CC BY 3.0 | [poly.pizza/m/UGOWjMUC5U](https://poly.pizza/m/UGOWjMUC5U), GLB `https://static.poly.pizza/c5e17526-37cf-42e5-b5f0-b426e1774e91.glb` | 0.13 MB / 2,000 tris | **Yes, confirmed**: a "Screen" material. The lid isn't a separate node. Stylised. |
| CC0, low-poly only | Quaternius "Phone" ([k2kgBepoMU](https://poly.pizza/m/k2kgBepoMU), 224 tris); smallbigsquare "Smartphone" ([4DRZmTs3jq](https://poly.pizza/m/4DRZmTs3jq), 182 tris, one texture atlas); Kenney "Laptop" ([GnbwSUiVty](https://poly.pizza/m/GnbwSUiVty), 136 tris) | | | Too simple for an Apple-style look. |

- **Where I couldn't confirm screen separation:** Sketchfab models can't be downloaded without logging in, so for those rows I inferred it from material counts and texture names. Run `npx @gltf-transform/cli inspect` after downloading.
- **No CC0 options at this quality:** Sketchfab's CC0 filter returned nothing relevant, and Poly Haven's only CC0 laptop is a vintage beige one.
- **Rejected:** Naudaff3D "Smartphone" (iPhone X notch), lucss_3d "Realistic Smartphone" (iPhone Pro camera block), Ottto3d "Black Generic Smartphone" (iPhone X camera), olemuzyka "Laptop" (MacBook Pro look), matds "Premium Laptop 15" (MacBook-inspired; its textures are named `mbpro_*`), OrbArts (built from a Galaxy S8+ file), nebulariser "Smartphone" (CC BY-NC, no commercial use), devOMAR (Sketchfab flags it as AI-generated), and Renend's laptop (Windows desktop screenshot baked into a single material).
- **Attribution:** CC BY needs the title, author, source link, license link, and a note of what you changed. Put it on your existing `/sources` page and in `SOURCES.md`.
- **Pipeline:** `gltf-transform optimize in.glb public/models/phone.v1.glb --compress quantize --texture-compress webp --texture-size 1024`. Quantize and WebP need no decoder at runtime. Then generate a typed component with `npx gltfjsx@6.5.3 … --types`, but skip `--transform`, which defaults to Draco.

## 4. Performance and accessibility

**CSP changes for your `next.config.ts`.** Your current policy is `img-src 'self' data:; connect-src 'self'`, with no `worker-src`.
- **Always needed:** add `blob:` to `img-src` and to `connect-src`. three's GLTFLoader turns textures embedded in a GLB into `blob:` URLs. Safari loads them through `<img>`; Chromium uses ImageBitmapLoader, which calls `fetch()`.
- **Only if you use Draco, meshopt, KTX2 or drei `<Text>`:** add `'wasm-unsafe-eval'` to `script-src`; [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src) confirms WebAssembly is blocked without it. Also add `worker-src 'self' blob:`, because those loaders start workers from Blob URLs.
- **Self-host or avoid drei's CDN defaults.** I confirmed these in the 10.7.9 source; all are blocked by `connect-src 'self'`:
  - Draco decoder: `www.gstatic.com/draco/...1.5.5/`
  - KTX2 transcoder: jsDelivr `drei-assets/basis/`
  - `<Environment preset>`: raw.githack.com
  - `<Text>` fallback fonts (troika): jsDelivr `unicode-font-resolver`
  - `useDetectGPU` benchmarks: `unpkg.com/detect-gpu@5.0.70`
  
  For Draco and Basis, copy `three/examples/jsm/libs/{draco/gltf,basis}` into `/public` and point the loaders there (for example `useGLTF.setDecoderPath('/draco/')`).

**Lighthouse (your config: desktop, every category ≥ 0.95).**
- Make the server-rendered hero headline the LCP element. A canvas never counts as LCP ([web.dev](https://web.dev/articles/lcp)).
- I measured three.js 0.187 alone, minified with esbuild for a basic WebGL scene, at about 540 KB, or 135 KB gzipped. Load the 3D chunk only when the story section is near the viewport, or on idle after LCP. Lighthouse doesn't scroll, so it won't download it.
- Use `dpr={[1,1.75]}`, render on demand, and pause when the canvas is off screen. Use `<PerformanceMonitor>` and `<AdaptiveDpr>`.
- Reserve the canvas box so there's no layout shift.
- Next serves files in `/public` with `Cache-Control: public, max-age=0`. Add `immutable` headers for versioned `/models/*` files.

**Reduced motion.** Use `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)`. Lenis 1.3.27 respects it by default. Following satus, don't mount the canvas at all in that case; show a static stepper of AVIF poster frames instead.

**No WebGL or a weak device.**
- Use R3F's `<Canvas fallback>` prop.
- Pre-check with `getContext('webgl2', { failIfMajorPerformanceCaveat: true })`.
- Also check Save-Data, and use `useDetectGPU` (self-host its benchmarks with `benchmarksURL`) and treat tier 0 as no 3D.
- Listen for `webglcontextlost` and swap to the fallback.

**SSR pitfalls in the App Router** (from the Next 16 docs):
- `ssr:false` is only allowed inside Client Components.
- A Server Component that dynamically imports a client component doesn't get it code-split, so do the dynamic import inside a client wrapper.
- Never import three, R3F or drei from Server Components.
- Read `matchMedia` and `navigator` in effects or `useSyncExternalStore`, not during render.
- Keep `gsap.registerPlugin` and `useGLTF.preload` in client-only modules.
- Add `transpilePackages:['three']` only if an add-on ships untranspiled code (R3F docs).
- Use one persistent canvas so navigating doesn't churn WebGL contexts.

**Accessibility.**
- Keep the whole story as real DOM: headings and ordered steps. Mark the canvas `aria-hidden`, and mark the `<Html>` screen copies `aria-hidden` and `inert`.
- Add a "Skip animation" link, and keep native scroll and keyboard paging working.
- Give any looping typing animation a pause control ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html); see also [2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).
- `<Html transform>` can blur on some browsers. drei's documented fix ([#859](https://github.com/pmndrs/drei/issues/859)) is to scale the parent down and the children up.
- Add axe and Playwright checks for the reduced-motion variant and for CSP violations.

## 5. Brand and logo assets

| Brand | Official source (status) | Logo files | Rules |
|---|---|---|---|
| a16z | No press kit: a16z.com/press, /brand and /media-kit all return 404. [Terms of use](https://a16z.com/terms-of-use/) (200) | No official download. Third-party logo sites aren't authorised. | "ANDREESSEN HOROWITZ and A16Z are registered trademarks … may not be used without the prior written permission of Andreessen Horowitz." |
| a16z speedrun | [speedrun.a16z.com/terms-of-use](https://speedrun.a16z.com/terms-of-use) (200) | The header logo is an inline SVG on the page, not a downloadable asset. | Same wording, with SPEEDRUN added as a registered trademark. **Ask for written permission.** |
| SpaceXSI (formerly SpaceXAI, formerly xAI) and Grok | [x.ai/legal/brand-guidelines](https://x.ai/legal/brand-guidelines). Read via Firecrawl because curl gets 403. Page dated Feb 14, 2025; footer "© 2026 SpaceX Super Intelligence LLC"; X handle @SpaceXSI. | `https://data.x.ai/logos/SpaceXAI_Grok_Assets.zip`, linked from that page. Automated download was blocked and I didn't try to get around it, so open it in a browser; contents unverified. The site's logo menu also offers "Copy black/white SVG". | Use the marks only to refer accurately to them. Don't imply endorsement, and don't use them in app titles, domains or product names, or combine them into a new mark. Logos must be used "exactly as provided … without any alteration." Contact legal@x.ai before mentioning them in press materials. Grok-generated content needs a "Written with Grok" or "Created with Grok" credit. |
| Grok Bot | [x.ai/bot](https://x.ai/bot); [1.0 launch post](https://x.ai/news/grok-bot-1-0) | No separate kit found. | Treat it as a Grok mark. It's a macOS app for Apple silicon, plus iOS, Slack and Teams. |
| Meta | [Brand Resource Center](https://www.meta.com/brand/resources/), which lists Meta, Instagram, WhatsApp, Facebook and Threads only; [company-brand page](https://www.meta.com/brand/resources/meta/company-brand/) | `Meta_Company-Lockup.zip`, available after ticking a terms checkbox. | "All use of the Meta logo requires approval" through a Meta contact's Brand Review request. Minimum size 12px / 5mm; clear space of twice the symbol height. |
| Muse (Meta) | [Newsroom post](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/), 2026-09-08, updated Nov 10. It offers a sizzle MP4 and a bulk image download, plus press@meta.com. Product site: muse.ai. | No Muse brand kit exists. The logo on the site is `https://muse.ai/images/landing/brand/muse-logo.svg` (200, SVG, 2.6 KB), but it isn't a licensed press asset. | Ask Meta before using it. |

The rename history (SpaceX acquired xAI on 2026-02-02, it became SpaceXAI on 2026-07-06, and SpaceXSI was announced 2026-10-04) comes from third-party press only: [Engadget](https://www.engadget.com/2209300/xai-now-officially-spacexai/), [notateslaapp](https://www.notateslaapp.com/news/4770/musk-spacexai-will-be-renamed-spacexsi-dropping-ai). The live x.ai site is the primary evidence for the current name.

**What I'd do:**
- Refer to the companies and apps by name in text only, and draw original, clearly illustrative app UIs rather than copies of theirs.
- Add a footer line: "Grok, Grok Bot, SpaceXSI, Meta, Muse, a16z and speedrun are trademarks of their owners; Clearance Lens is not affiliated with or endorsed by them."
- Use logos only after permission.
- Before depicting it, confirm that Grok Bot and Muse can actually connect to custom MCP servers.

## Files
Everything is in `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/`:
- `scripts/glb_inspect.py`: the GLB inspector I used to check screen meshes.
- `dl_pp/`: the downloaded Poly Pizza GLBs.
- `peercheck/package.json`: the peer-resolution test.
