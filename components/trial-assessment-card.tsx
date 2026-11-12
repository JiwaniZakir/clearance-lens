"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Check } from "lucide-react";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { RubricChecklist, type RubricGroup } from "@/components/rubric-checklist";
import { cn } from "@/lib/cn";
import type { TrialAssessmentOutput, TrialMinutes } from "@/lib/try-tool-types";

const MINUTE_OPTIONS: { value: `${TrialMinutes}`; label: string }[] = [
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "180", label: "180 min" },
];

const tabTriggerClass =
  "shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-11 transition-colors duration-150 ease-out hover:text-neutral-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6 data-[state=active]:border-accent-9 data-[state=active]:text-neutral-12";

/**
 * Renders build_trial_assessment (R2 §3.7). A disclaimer-banner pinned
 * above Tabs for Brief / Deliverables / Rubric / What-great-looks-like, and
 * a SegmentedControl that re-requests the assessment at a different length
 * (the parent /try tab owns the actual re-fetch; this component is
 * controlled — it just reports the new value up).
 */
export function TrialAssessmentCard({
  data,
  minutes,
  onMinutesChange,
  changingMinutes,
}: {
  data: TrialAssessmentOutput;
  minutes: TrialMinutes;
  onMinutesChange: (minutes: TrialMinutes) => void;
  changingMinutes?: boolean;
}) {
  const rubricGroups: RubricGroup[] = [
    {
      title: "Rubric",
      rows: data.rubric.map((c, i) => ({
        id: `${i}-${c.criterion}`,
        label: c.criterion,
        quote: c.tracedToQuote.startsWith("(") ? undefined : c.tracedToQuote,
        detail: [
          { label: "Exceptional", text: c.bands.exceptional },
          { label: "Proficient", text: c.bands.proficient },
          { label: "Developing", text: c.bands.developing },
          { label: "Not demonstrated", text: c.bands.notDemonstrated },
        ],
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[1.25rem] font-semibold leading-[1.4] text-neutral-12">{data.roleTitle}</h3>
          <p className="text-sm text-neutral-11">{data.company}</p>
        </div>
        <div className={cn("flex items-center gap-2", changingMinutes && "opacity-60")}>
          <SegmentedControl
            options={MINUTE_OPTIONS}
            value={String(minutes) as `${TrialMinutes}`}
            onChange={(v) => onMinutesChange(Number(v) as TrialMinutes)}
          />
        </div>
      </div>

      <DisclaimerBanner>{data.itarSafetyNote}</DisclaimerBanner>

      <TabsPrimitive.Root defaultValue="brief">
        <TabsPrimitive.List className="flex gap-1 overflow-x-auto border-b border-neutral-6 [scrollbar-width:none]">
          <TabsPrimitive.Trigger value="brief" className={tabTriggerClass}>
            Brief
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="deliverable" className={tabTriggerClass}>
            Deliverable
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="rubric" className={tabTriggerClass}>
            Rubric
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="great" className={tabTriggerClass}>
            What great looks like
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="brief" className="pt-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-[1.6] text-neutral-12">{data.brief}</pre>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="deliverable" className="flex flex-col gap-4 pt-4">
          <p className="text-sm leading-[1.6] text-neutral-12">{data.deliverableRequirement}</p>
          {data.outOfScope.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">Out of scope</p>
              <ul className="flex flex-col gap-1.5 text-sm leading-[1.55] text-neutral-11">
                {data.outOfScope.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden>·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[0.8125rem] leading-[1.5] text-neutral-10">{data.limitsNote}</p>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="rubric" className="flex flex-col gap-3 pt-4">
          <RubricChecklist groups={rubricGroups} />
          <p className="text-[0.8125rem] leading-[1.5] text-neutral-10">{data.rubricRefinementNote}</p>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="great" className="pt-4">
          <ul className="flex flex-col gap-3">
            {data.rubric.map((c, i) => (
              <li key={i} className="flex gap-2.5 rounded-md border border-neutral-6 bg-neutral-2 px-3 py-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-none text-accent-11" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-neutral-12">{c.criterion}</p>
                  <p className="text-sm leading-[1.5] text-neutral-11">{c.bands.exceptional}</p>
                </div>
              </li>
            ))}
          </ul>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      {data.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-6 pt-4">
          <span className="text-xs text-neutral-10">Sources:</span>
          {data.sources.map((s, i) => (
            <SourceCitationChip key={i} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
