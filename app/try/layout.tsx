import type { Metadata } from "next";

// /try/page.tsx is a client component ("use client", for the tab state and
// useSearchParams), so it can't export metadata itself — Next.js only reads
// that from a Server Component. Without this sibling layout, /try silently
// inherited the root layout's bare "Clearance Lens" default instead of the
// "<Page> · Clearance Lens" template every other page gets. Found live via
// the spec §6 judging panel round 3.
export const metadata: Metadata = {
  title: "Try it",
  description: "Every Clearance Lens tool, live, with no agent or LLM key required.",
};

export default function TryLayout({ children }: LayoutProps<"/try">) {
  return children;
}
