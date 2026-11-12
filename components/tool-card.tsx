import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

export interface ToolCardProps {
  /** The tool's literal registry name, e.g. "search_defense_roles". */
  name: string;
  /** One-sentence purpose, trimmed from the tool's real `description` field. */
  description: string;
  /** 2–4 real input/output field names from the tool's own zod schemas. */
  fields: string[];
}

/**
 * One MCP tool in the `/` tools grid (research/R2-design-system.md §3.3).
 * The parent grid uses `auto-rows-fr`; this card stretches to `h-full` and
 * pins its "Try it" button to the bottom with `flex-1` on the text block —
 * equal height via CSS grid alone, never JS-measured (R2 §3.3 / Do-Don't #8).
 */
export function ToolCard({ name, description, fields }: ToolCardProps) {
  return (
    <Card className="flex h-full flex-col gap-4 p-5 sm:p-6">
      <div className="flex-1">
        <p className="font-mono text-[0.8125rem] leading-[1.4] font-semibold text-neutral-12">{name}</p>
        <p className="mt-2 text-[0.875rem] leading-[1.55] text-neutral-11">{description}</p>
        {fields.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {fields.map((field) => (
              <Chip key={field}>{field}</Chip>
            ))}
          </div>
        )}
      </div>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href={`/try?tool=${name}`}>
          Try it
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}
