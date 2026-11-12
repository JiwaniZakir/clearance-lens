import { cn } from "@/lib/cn";

/** Non-binary choice between a small fixed set (e.g. 60/90/180 minutes) —
 * NOT a Switch, which is strictly binary (R2 §4's Switch row). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex rounded-full border border-neutral-7 bg-neutral-2 p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6",
              active ? "bg-neutral-1 text-neutral-12 shadow-elevation-1" : "text-neutral-11 hover:text-neutral-12",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
