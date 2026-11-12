import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#tools", label: "Tools" },
  { href: "/try", label: "Try it" },
  { href: "/sources", label: "Sources" },
];

/** Sticky top bar (R2 §3.17). On mobile, links become a horizontally
 * scrollable row — not a hidden hamburger drawer, since 4 items don't need one. */
export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-6 bg-neutral-1/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-mono text-[0.9375rem] font-semibold text-neutral-12">
          <span aria-hidden>⌁</span> Clearance Lens
        </Link>
        <nav className="flex min-w-0 flex-1 gap-5 overflow-x-auto whitespace-nowrap text-sm text-neutral-11 [scrollbar-width:none]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="shrink-0 hover:text-neutral-12">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/#install">Add to your agent</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
