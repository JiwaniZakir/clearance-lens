"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, ExternalLink, ShieldOff } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { RubricChecklist, type RubricGroup } from "@/components/rubric-checklist";
import { EmptyState } from "@/components/empty-state";
import type { CompanyProfileOutput } from "@/lib/try-tool-types";

function formatCompRange(range: CompanyProfileOutput["workRealities"]["compRangeObserved"]): string | null {
  if (!range || (range.min == null && range.max == null)) return null;
  const currency = range.currency ?? "USD";
  const prefix = currency === "USD" ? "$" : `${currency} `;
  const fmt = (n: number) => `${prefix}${Math.round(n / 1000)}k`;
  if (range.min != null && range.max != null && range.min !== range.max) return `${fmt(range.min)}–${fmt(range.max)}`;
  return fmt(range.min ?? range.max ?? 0);
}

/**
 * Renders get_company_profile (R2 §3.10). Header, then either published
 * criteria as rubric-checklist-style rows (each with a real source +
 * one-line job-relevance reason) or — if none exist — an empty-state
 * variant instead of any fit read, by design: this product never guesses
 * at culture fit without a source. A "Work realities" section of computed
 * facts, and a collapsed "Gaps" accordion.
 */
export function CompanyProfileCard({ data }: { data: CompanyProfileOutput }) {
  const { company, criteria, workRealities, gaps, sources, disclaimer } = data;
  const compRange = formatCompRange(workRealities.compRangeObserved);
  const workplaceEntries = Object.entries(workRealities.workplaceMix).sort((a, b) => b[1] - a[1]);

  const criteriaGroups: RubricGroup[] = [
    {
      title: "Published criteria",
      rows: criteria.map((c, i) => ({
        id: `${c.sourceUrl}-${i}`,
        label: c.criterion,
        evidence: c.jobRelevanceReason,
        source: { title: c.criterion, url: c.sourceUrl },
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[1.5rem] font-semibold leading-[1.3] text-neutral-12">{company.name}</h2>
          <a
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-mono text-[0.8125rem] text-accent-11 hover:text-accent-10"
          >
            {company.slug} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
        {company.blurb && <p className="text-sm leading-[1.55] text-neutral-11">{company.blurb}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {company.industries.map((ind) => (
            <Chip key={ind} tone="neutral">
              {ind}
            </Chip>
          ))}
          {company.stage && <Chip tone="neutral">{company.stage}</Chip>}
          {company.size && <Chip tone="neutral">{company.size}</Chip>}
          {company.businessModel && <Chip tone="neutral">{company.businessModel}</Chip>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
          Published hiring criteria
        </p>
        {criteria.length === 0 ? (
          <EmptyState
            icon={ShieldOff}
            title="No published criteria — we won't guess"
            description="Clearance Lens has not independently sourced published hiring criteria for this company. Ask the recruiter directly what they evaluate for, and ask for a source."
          />
        ) : (
          <RubricChecklist groups={criteriaGroups} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">Work realities</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-neutral-6 px-3 py-2.5">
            <p className="text-xs text-neutral-10">Open roles sampled</p>
            <p className="font-mono text-sm text-neutral-12">{workRealities.sampleSize}</p>
          </div>
          <div className="rounded-md border border-neutral-6 px-3 py-2.5">
            <p className="text-xs text-neutral-10">Unique locations</p>
            <p className="font-mono text-sm text-neutral-12">{workRealities.uniqueLocationCount}</p>
          </div>
          {compRange && (
            <div className="rounded-md border border-neutral-6 px-3 py-2.5">
              <p className="text-xs text-neutral-10">Comp observed</p>
              <p className="font-mono text-sm text-neutral-12">{compRange}</p>
            </div>
          )}
        </div>
        {workplaceEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {workplaceEntries.map(([type, count]) => (
              <Chip key={type} tone="accent">
                {type}: {count}
              </Chip>
            ))}
          </div>
        )}
        {workRealities.topLocations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {workRealities.topLocations.map((loc) => (
              <Chip key={loc.location} tone="neutral">
                {loc.location} ({loc.count})
              </Chip>
            ))}
          </div>
        )}
      </div>

      {gaps.length > 0 && (
        <AccordionPrimitive.Root type="single" collapsible>
          <AccordionPrimitive.Item value="gaps" className="overflow-hidden rounded-md border border-neutral-6">
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between bg-neutral-2 px-3 py-2 text-left text-[0.8125rem] font-semibold uppercase tracking-wide text-neutral-11 hover:bg-neutral-3">
                Gaps &amp; sampling notes ({gaps.length})
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180" aria-hidden />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content className="p-3">
              <ul className="flex flex-col gap-2 text-sm leading-[1.55] text-neutral-11">
                {gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
      )}

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-10">Sources:</span>
          {sources.map((s, i) => (
            <SourceCitationChip key={i} source={s} />
          ))}
        </div>
      )}

      <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{disclaimer}</p>
    </div>
  );
}
