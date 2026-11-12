import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Foundational atom (research/R2-design-system.md §3.0). Built on Radix Slot
 * so it renders as a native <button> or, via asChild, as a Next.js <Link> —
 * styling never forks between the two cases (§4, the Slot row).
 */
const buttonVariants = cva(
  // box-shadow deliberately excluded from the transitioned properties —
  // found live via the spec §6 judging panel round 4 (product_designer):
  // reproduced via getComputedStyle immediately after a keyboard Tab vs.
  // after a 250ms wait — the focus ring IS correctly defined (the
  // underlying --tw-ring-* variables were set correctly in both captures)
  // but was ANIMATING in over this component's own 150ms transition
  // duration, unlike every other focusable element on the site (skip-link,
  // toggles, tab triggers), none of which use this transition system and
  // so render their ring instantly. A keyboard user tabbing faster than
  // 150ms per stop would genuinely see no ring on this component's
  // buttons specifically — not a missing ring, a late one. No Button
  // variant below sets its own box-shadow, so this only affects how fast
  // the focus ring appears/disappears, nothing else.
  "inline-flex items-center justify-center gap-2 rounded-md text-[0.9375rem] font-medium transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent-9 text-on-solid-light dark:text-on-solid-dark hover:bg-accent-10",
        secondary: "bg-neutral-3 text-neutral-12 hover:bg-neutral-4 border border-neutral-6",
        ghost: "bg-transparent text-neutral-12 hover:bg-neutral-2",
        destructive: "bg-danger-9 text-on-solid-light dark:text-on-solid-dark hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
