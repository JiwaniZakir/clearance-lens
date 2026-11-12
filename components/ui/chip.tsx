import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** Small radius-full pill (R2 §3.0), used by source-citation-chip and filter
 * tags. `dashed` is used specifically for inferred-vs-stated distinctions
 * (role-search-result-card) — a dashed border means "inferred, not stated". */
const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.8125rem] font-mono leading-[1.4] whitespace-nowrap",
  {
    variants: {
      border: {
        solid: "border-neutral-7",
        dashed: "border-dashed border-neutral-7",
        none: "border-transparent",
      },
      tone: {
        neutral: "bg-neutral-2 text-neutral-11",
        accent: "bg-accent-2 text-accent-11",
      },
    },
    defaultVariants: { border: "solid", tone: "neutral" },
  },
);

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {}

export function Chip({ className, border, tone, ...props }: ChipProps) {
  return <span className={cn(chipVariants({ border, tone }), className)} {...props} />;
}
