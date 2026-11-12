"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ChevronDown, Info, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { cn } from "@/lib/cn";
import type { SourceRef } from "@/lib/try-tool-types";

export interface RubricRow {
  id: string;
  label: string;
  /** "stated" | "inferred" — rendered with the same solid/dashed chip
   * convention as role-search-result-card, for visual consistency. */
  basis?: "stated" | "inferred";
  /** A StatusPill-style Badge (R2 §3.6) — aligned=success / mixed=caution /
   * unclear=neutral. Deliberately unused by the get_role_rubric view on this
   * page (there's no agent here to actually evaluate anything), but the
   * component supports it so it stays genuinely reusable. */
  badge?: { tone: "success" | "caution" | "neutral"; text: string };
  /** Tooltip content revealed on the badge/basis-chip/info-affordance. */
  evidence?: string;
  /** A verbatim quote the row traces back to (build_trial_assessment). */
  quote?: string;
  /** A real citation for this row (company-profile-card's criteria rows). */
  source?: SourceRef;
  /** Expandable extra rows, e.g. the 4 "what great looks like" bands. */
  detail?: { label: string; text: string }[];
}

export interface RubricGroup {
  title: string;
  rows: RubricRow[];
  /** Small caption under the group title, e.g. a scope note. */
  note?: string;
}

function BasisChip({ basis }: { basis: "stated" | "inferred" }) {
  return (
    <Chip border={basis === "stated" ? "solid" : "dashed"} tone="neutral" className="shrink-0">
      {basis === "stated" ? "Stated" : "Inferred"}
    </Chip>
  );
}

function RowIndicator({ row }: { row: RubricRow }) {
  const trigger = row.badge ? (
    <Badge tone={row.badge.tone} appearance="subtle" className="cursor-default">
      {row.badge.text}
    </Badge>
  ) : row.basis ? (
    <BasisChip basis={row.basis} />
  ) : row.evidence ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-neutral-9 hover:text-neutral-11">
      <Info className="h-4 w-4" aria-hidden />
    </span>
  ) : null;

  if (!trigger) return null;
  if (!row.evidence) return trigger;

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button type="button" className="focus-visible:outline-none">
            {trigger}
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-md bg-neutral-12 px-3 py-2 text-xs text-neutral-1 shadow-elevation-3"
          >
            {row.evidence}
            <TooltipPrimitive.Arrow className="fill-neutral-12" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function RubricRowView({ row }: { row: RubricRow }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasDetail = !!row.detail?.length;

  return (
    <div className="rounded-md border border-neutral-6 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[0.9375rem] leading-[1.5] text-neutral-12">{row.label}</p>
          {row.quote && (
            <p className="flex items-start gap-1.5 border-l-2 border-neutral-6 pl-2 text-sm italic leading-[1.5] text-neutral-11">
              <Quote className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
              <span>&ldquo;{row.quote}&rdquo;</span>
            </p>
          )}
          {row.source && <SourceCitationChip source={row.source} className="mt-0.5" />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RowIndicator row={row} />
          {hasDetail && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-9 hover:bg-neutral-3 hover:text-neutral-11"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", expanded && "rotate-180")} aria-hidden />
              <span className="sr-only">{expanded ? "Hide details" : "Show what great looks like"}</span>
            </button>
          )}
        </div>
      </div>
      {hasDetail && expanded && (
        <dl className="mt-3 flex flex-col gap-2 border-t border-neutral-5 pt-3">
          {row.detail!.map((d) => (
            <div key={d.label} className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-10">{d.label}</dt>
              <dd className="text-sm leading-[1.5] text-neutral-11">{d.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function GroupBody({ group }: { group: RubricGroup }) {
  return (
    <div className="flex flex-col gap-2">
      {group.note && <p className="text-xs text-neutral-10">{group.note}</p>}
      {group.rows.map((row) => (
        <RubricRowView key={row.id} row={row} />
      ))}
    </div>
  );
}

/**
 * Reusable checklist renderer (R2 §3.6) — used for get_role_rubric's
 * eligibility/skills rows, build_trial_assessment's rubric, and
 * company-profile-card's published criteria. Rows group into a Radix
 * Accordion once the combined list runs past ~6 rows; below that, groups
 * render flat (accordion overhead isn't worth it for a short list).
 */
export function RubricChecklist({ groups }: { groups: RubricGroup[] }) {
  const totalRows = groups.reduce((n, g) => n + g.rows.length, 0);
  const useAccordion = totalRows > 6 && groups.length > 1;

  if (!useAccordion) {
    return (
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            {groups.length > 1 && (
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">{group.title}</p>
            )}
            <GroupBody group={group} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <AccordionPrimitive.Root type="multiple" defaultValue={groups.map((g) => g.title)} className="flex flex-col gap-2">
      {groups.map((group) => (
        <AccordionPrimitive.Item
          key={group.title}
          value={group.title}
          className="overflow-hidden rounded-md border border-neutral-6"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between bg-neutral-2 px-3 py-2 text-left text-[0.8125rem] font-semibold uppercase tracking-wide text-neutral-11 hover:bg-neutral-3">
              <span>
                {group.title} <span className="font-mono text-neutral-10">({group.rows.length})</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180" aria-hidden />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="p-3">
            <GroupBody group={group} />
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
