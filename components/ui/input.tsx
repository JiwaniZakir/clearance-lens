import * as React from "react";
import { cn } from "@/lib/cn";

const fieldClass =
  "h-10 w-full rounded-sm border border-neutral-7 bg-neutral-1 px-3 text-[0.9375rem] text-neutral-12 placeholder:text-neutral-9 transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:border-accent-8 focus-visible:ring-2 focus-visible:ring-accent-8 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClass, className)} {...props} />,
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClass, "appearance-none pr-8", className)} {...props} />
  ),
);
Select.displayName = "Select";
