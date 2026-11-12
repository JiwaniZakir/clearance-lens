import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The one, consistent way every "not legal advice / ITAR-safe / stateless"
 * notice appears (R2 §3.12). Deliberately undramatic: neutral background,
 * neutral hairline border, body-sm text — NEVER caution/danger colored,
 * never a toast, never repeated more than once per view (Do/Don't #3).
 */
export function DisclaimerBanner({
  children,
  className,
  href,
  linkLabel,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-neutral-6 bg-neutral-2 px-4 py-3 text-sm leading-[1.55] text-neutral-11",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 flex-none text-neutral-9" aria-hidden />
      <p>
        {children}
        {href && linkLabel ? (
          <>
            {" "}
            <a href={href} className="text-accent-11 underline underline-offset-2 hover:text-accent-10">
              {linkLabel}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
