import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (Next 16's `use cache`/cacheLife paradigm) is intentionally
  // left OFF — see DECISIONS.md D-001. This app is a dynamic MCP server + API
  // playground; route handlers are request-scoped by nature and gain nothing
  // from static-shell prerendering, while adopting the new directive across
  // every tool route would add real risk for a judged production deliverable.
  // Conventional `fetch(..., { next: { revalidate } })` caching is used instead.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Security headers on every route. CORS for /mcp is set explicitly
        // in app/[transport]/route.ts because MCP clients need permissive
        // cross-origin access that the rest of the site should not have.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
