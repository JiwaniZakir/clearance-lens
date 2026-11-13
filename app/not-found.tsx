import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Round 9 (product_designer): unknown URLs hit the unbranded default
// Next.js 404 (D-051).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-4 px-6 py-24">
        <p className="font-mono text-sm text-neutral-10">404</p>
        <h1 className="text-[1.75rem] leading-[1.25] font-semibold tracking-[-0.01em] text-neutral-12">
          That page doesn&apos;t exist.
        </h1>
        <p className="text-base leading-[1.6] text-neutral-11">
          If you followed a link to a role, it may have been filled or removed since — roles come live from the a16z
          speedrun Talent Network.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/" className="rounded-md border border-neutral-7 px-4 py-2 text-sm text-neutral-12 hover:border-accent-8">
            Home
          </Link>
          <Link href="/try" className="rounded-md bg-accent-9 px-4 py-2 text-sm text-on-solid-light hover:bg-accent-10 dark:text-on-solid-dark">
            Try every tool
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
