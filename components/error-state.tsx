import { CircleAlert, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ToolErrorShape } from "@/lib/try-tool-types";

/**
 * Shared failed-tool-call component (R2 §3.15). States what failed in plain
 * language (never a raw error code/stack — `error.message` is already the
 * human sentence `lib/tools/wrap.ts`/`lib/guard/pii.ts` produced, so we just
 * render it verbatim), a Retry button, and a DISTINCT, calm — not
 * security-alert-toned — copy variant for `pii_cui_rejected` (Do/Don't #9:
 * danger is reserved for real system errors/destructive actions, never used
 * to make a rejection feel like an alarm).
 */
export function ErrorState({
  error,
  onRetry,
  retryLabel,
  className,
}: {
  error: ToolErrorShape;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const isPii = error.code === "pii_cui_rejected";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-4 text-sm leading-[1.55]",
        isPii ? "border-neutral-6 bg-neutral-2" : "border-danger-6 bg-danger-2",
        className,
      )}
    >
      {isPii ? (
        <Shield className="mt-0.5 h-4 w-4 flex-none text-neutral-9" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 flex-none text-danger-11" aria-hidden />
      )}
      <div className="flex flex-col gap-2">
        <div>
          <p className={cn("font-medium", isPii ? "text-neutral-12" : "text-danger-11")}>
            {isPii ? "We can't process that here" : "That didn't go through"}
          </p>
          <p className={cn("mt-0.5", isPii ? "text-neutral-11" : "text-danger-11")}>{error.message}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant={isPii ? "secondary" : "destructive"}
            onClick={onRetry}
            className="self-start"
          >
            {retryLabel ?? (isPii ? "Edit and try again" : "Retry")}
          </Button>
        )}
      </div>
    </div>
  );
}
