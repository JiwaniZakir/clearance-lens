import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Badge / StatusPill (R2 §3.0). `subtle` = step-2 bg + step-11 text; `solid`
 * = step-9 bg + the on-solid text rule from R2 §2.1. Status has exactly
 * three tones for a fit result — success/caution/neutral — danger is
 * reserved for system errors, never a verdict on a person (Do/Don't #9).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-medium leading-[1.4] whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "",
        accent: "",
        success: "",
        caution: "",
        danger: "",
      },
      appearance: {
        subtle: "",
        solid: "",
      },
    },
    compoundVariants: [
      { tone: "neutral", appearance: "subtle", class: "bg-neutral-3 text-neutral-11" },
      { tone: "neutral", appearance: "solid", class: "bg-neutral-9 text-on-solid-light dark:text-on-solid-dark" },
      { tone: "accent", appearance: "subtle", class: "bg-accent-2 text-accent-11" },
      { tone: "accent", appearance: "solid", class: "bg-accent-9 text-on-solid-light dark:text-on-solid-dark" },
      { tone: "success", appearance: "subtle", class: "bg-success-2 text-success-11" },
      { tone: "success", appearance: "solid", class: "bg-success-9 text-on-solid-light dark:text-on-solid-dark" },
      { tone: "caution", appearance: "subtle", class: "bg-caution-2 text-caution-11" },
      // Caution is the one exception to "light=white, dark=ink" (R2 §2.1):
      // ink text in BOTH modes, computed — white-on-caution-9 fails AA badly
      // in light mode too (2.54:1).
      { tone: "caution", appearance: "solid", class: "bg-caution-9 text-on-solid-dark" },
      { tone: "danger", appearance: "subtle", class: "bg-danger-2 text-danger-11" },
      { tone: "danger", appearance: "solid", class: "bg-danger-9 text-on-solid-light dark:text-on-solid-dark" },
    ],
    defaultVariants: { tone: "neutral", appearance: "subtle" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, appearance, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, appearance }), className)} {...props} />;
}
