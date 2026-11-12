import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Shared zero-results component (R2 §3.13) — search, no-published-criteria,
 * explain_rule misses. A single-color neutral-9 icon, one sentence
 * explaining WHY it's empty (never a bare "No results"), and — where
 * resolvable — one button that fixes it (Do/Don't #8).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-neutral-6 bg-neutral-2 px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-neutral-9" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-[1.0625rem] font-semibold leading-[1.4] text-neutral-12">{title}</p>
        <p className="max-w-sm text-sm leading-[1.55] text-neutral-11">{description}</p>
      </div>
      {action && (
        <Button size="sm" variant="secondary" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
