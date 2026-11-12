"use client";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SourceRef {
  title: string;
  url: string;
  lastVerified?: string;
}

/**
 * The atomic trust unit (R2 §3.11), modeled on Perplexity's citation
 * pattern — used everywhere a number/rule/claim appears. A small Chip that
 * on hover/focus shows the full title + URL + last-verified date, and on
 * click opens the URL in a new tab. On /sources it renders as a full row
 * instead (see `expanded` prop).
 */
export function SourceCitationChip({
  source,
  className,
  expanded = false,
}: {
  source: SourceRef;
  className?: string;
  expanded?: boolean;
}) {
  if (expanded) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center justify-between gap-3 border-b border-neutral-5 py-2 text-sm hover:bg-neutral-2",
          className,
        )}
      >
        <span className="text-neutral-12">{source.title}</span>
        <span className="flex items-center gap-3 font-mono text-[0.8125rem] text-neutral-10">
          {source.lastVerified && <span>verified {source.lastVerified}</span>}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </span>
      </a>
    );
  }

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex max-w-[14rem] items-center gap-1 truncate rounded-full border border-neutral-7 bg-neutral-2 px-2.5 py-1 font-mono text-[0.8125rem] text-neutral-11 hover:border-accent-8 hover:text-accent-11",
              className,
            )}
          >
            <span className="truncate">{source.title}</span>
            <ExternalLink className="h-3 w-3 flex-none" aria-hidden />
          </a>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-md bg-neutral-12 px-3 py-2 text-xs text-neutral-1 shadow-elevation-3"
          >
            <p className="font-medium">{source.title}</p>
            <p className="mt-1 font-mono text-[0.75rem] opacity-80 break-all">{source.url}</p>
            {source.lastVerified && <p className="mt-1 opacity-70">Last verified {source.lastVerified}</p>}
            <TooltipPrimitive.Arrow className="fill-neutral-12" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
