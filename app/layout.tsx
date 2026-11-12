import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Clearance Lens",
    template: "%s · Clearance Lens",
  },
  description:
    "A stateless MCP server that helps you pursue US defense-tech roles from inside your own AI agent — eligibility checklists, timeline estimates, trial work samples, and realistic job previews. No account, no PII.",
  openGraph: {
    title: "Clearance Lens",
    description:
      "Pursue defense-tech roles from inside your own agent. Your agent reasons privately on rubrics, timelines, and trial work — we never see your answers.",
    url: SITE_URL,
    siteName: "Clearance Lens",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clearance Lens",
    description: "Pursue defense-tech roles from inside your own agent.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
