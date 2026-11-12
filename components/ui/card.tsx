import * as React from "react";
import { cn } from "@/lib/cn";

/** Card shell (R2 §3.0): elevation-1 + radius-lg at rest; elevation-2 on
 * hover ONLY when the whole card is a click target (pass `interactive`). */
export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-neutral-1 shadow-elevation-1 transition-shadow duration-150 ease-out",
        interactive && "hover:shadow-elevation-2",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[1.25rem] leading-[1.4] font-semibold text-neutral-12", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-[1.55] text-neutral-11", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 sm:px-6 sm:pb-6", className)} {...props} />;
}
