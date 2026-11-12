import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// TEMPORARY foundation smoke-test page — replaced by the real landing page
// build (research/R2-design-system.md §5's `/` wireframe).
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto flex max-w-[1120px] flex-1 flex-col gap-6 px-6 py-16">
        <h1 className="text-[2.25rem] font-semibold text-neutral-12">Foundation smoke test</h1>
        <div className="flex gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex gap-3">
          <Badge tone="success" appearance="subtle">
            aligned
          </Badge>
          <Badge tone="caution" appearance="solid">
            mixed
          </Badge>
          <Badge tone="neutral" appearance="subtle">
            unclear
          </Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>search_defense_roles</CardTitle>
            <CardDescription>Searches live defense/hard-tech roles.</CardDescription>
          </CardHeader>
        </Card>
        <DisclaimerBanner href="/privacy" linkLabel="See Privacy.">
          Clearance Lens is not legal advice and never queries DISS/NBIS/DCSA.
        </DisclaimerBanner>
        <SourceCitationChip source={{ title: "22 CFR 120.62", url: "https://www.ecfr.gov", lastVerified: "2026-11-11" }} />
      </main>
      <Footer />
    </div>
  );
}
