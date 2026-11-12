"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Built on Radix Switch but styled as a 2-position sun/moon icon toggle
 * rather than a literal on/off track (R2 §3.16). next-themes already owns
 * persistence — no custom storage code needed. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // next-themes' own documented hydration-safety idiom: the server can't
  // know the client's theme, so this renders a neutral state on the server
  // and flips to the real theme after mount. The one extra render this
  // causes is the intended, unavoidable cost of that guarantee.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <SwitchPrimitive.Root
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      aria-label="Toggle dark mode"
      className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border border-neutral-7 bg-neutral-2 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
    >
      <Sun className="absolute left-1.5 h-4 w-4 text-neutral-9" aria-hidden />
      <Moon className="absolute right-1.5 h-4 w-4 text-neutral-9" aria-hidden />
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none z-10 block h-6 w-6 rounded-full bg-neutral-1 shadow-elevation-2 transition-transform duration-150 ease-out",
          isDark ? "translate-x-[27px]" : "translate-x-[3px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
