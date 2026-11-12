import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

// Added alongside robots.ts (judging panel round 6) — the site's own
// pages, all public, none dynamic/parameterized.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/try`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/sources`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
