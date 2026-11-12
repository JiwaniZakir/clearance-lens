import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/constants";

/** Calm, dense close for every page (R2 §3.18). No newsletter field, no
 * social icon row, no logo cloud. */
export function Footer() {
  return (
    <footer className="border-t border-neutral-6 bg-neutral-2">
      <div className="mx-auto max-w-[1120px] px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="font-mono text-sm font-semibold text-neutral-12">⌁ Clearance Lens</p>
          </div>
          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-neutral-12">Product</span>
              <Link href="/#tools" className="text-neutral-11 hover:text-neutral-12">
                Tools
              </Link>
              <Link href="/try" className="text-neutral-11 hover:text-neutral-12">
                Try it
              </Link>
              <a href={GITHUB_REPO_URL} className="text-neutral-11 hover:text-neutral-12">
                GitHub
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium text-neutral-12">Trust</span>
              <Link href="/privacy" className="text-neutral-11 hover:text-neutral-12">
                Privacy
              </Link>
              <Link href="/sources" className="text-neutral-11 hover:text-neutral-12">
                Sources
              </Link>
              <Link href="/api/health" className="text-neutral-11 hover:text-neutral-12">
                Status
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-8 text-[0.8125rem] text-neutral-10">
          Clearance Lens is not legal advice and never queries DISS/NBIS/DCSA.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-11">
            See Privacy.
          </Link>
        </p>
      </div>
    </footer>
  );
}
