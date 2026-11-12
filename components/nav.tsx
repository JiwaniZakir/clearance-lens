import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#tools", label: "Tools" },
  { href: "/try", label: "Try it" },
  { href: "/sources", label: "Sources" },
];

/**
 * Sticky top bar (R2 §3.17). Two layouts, not one squeezed row: at sm+ the
 * wordmark, nav links, and actions share one row (R2's `/` wireframe). Below
 * sm, the links move to their own horizontally-scrollable row UNDER the logo
 * row (R2's own mobile note: "nav links become a horizontally-scrollable row
 * under the logo row rather than a drawer") — a single row at 360-390px
 * can't fit the wordmark + 4 links + theme-toggle + button without either
 * overflowing or squeezing the toggle/button off-screen, which an earlier
 * single-row version did (caught by a downstream agent's 360px check).
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-6 bg-neutral-1/85 backdrop-blur-sm">
      <div className="mx-auto max-w-[1120px] px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-mono text-[0.9375rem] font-semibold text-neutral-12"
          >
            <span aria-hidden>⌁</span> Clearance Lens
          </Link>
          <nav className="hidden min-w-0 flex-1 gap-5 overflow-x-auto whitespace-nowrap text-sm text-neutral-11 sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="shrink-0 hover:text-neutral-12">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/#install">Add to your agent</Link>
            </Button>
          </div>
        </div>
        <nav className="-mx-6 mt-2 flex gap-5 overflow-x-auto whitespace-nowrap px-6 text-sm text-neutral-11 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="shrink-0 hover:text-neutral-12">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
