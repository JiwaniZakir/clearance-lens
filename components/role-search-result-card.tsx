"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Building2, MapPin, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { cn } from "@/lib/cn";
import type { RequirementSignal, RoleResult } from "@/lib/try-tool-types";

const SIGNAL_LABELS: Record<string, string> = {
  ts_sci: "TS/SCI",
  ts: "Top Secret",
  secret: "Secret",
  none: "No clearance signal",
  us_citizen_required: "US citizen required",
  us_person_required: "US person required",
  us_person_likely: "Likely US-person required",
  no_sponsorship: "No visa sponsorship",
  clearance_required_unspecified: "Clearance required (level unspecified)",
  clearance_possibly_required: "Clearance possibly required",
  polygraph_required: "Polygraph required",
  scif_onsite: "Onsite SCIF",
};

function humanizeSignal(value: string): string {
  if (SIGNAL_LABELS[value]) return SIGNAL_LABELS[value];
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** clearance_level/citizenship signals read first — they're the two filters
 * this tab actually exposes, so they're the two things a scanning user most
 * wants to see without expanding anything. */
function signalPriority(signal: RequirementSignal): number {
  if (signal.kind === "clearance_level") return 0;
  if (signal.kind === "citizenship") return 1;
  return 2;
}

function RequirementChip({ signal }: { signal: RequirementSignal }) {
  const stated = signal.basis === "stated";
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button type="button" className="focus-visible:outline-none">
            <Chip border={stated ? "solid" : "dashed"} tone="neutral" className="cursor-default">
              {humanizeSignal(signal.value)}
            </Chip>
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-md bg-neutral-12 px-3 py-2 text-xs text-neutral-1 shadow-elevation-3"
          >
            <p className="font-medium">
              {stated ? "Stated directly in the posting." : "Inferred from the job post, not stated."}
            </p>
            <p className="mt-1 opacity-85">
              {stated ? `"${signal.evidence}"` : signal.evidence}
            </p>
            {!stated && <p className="mt-1 opacity-70">Confirm this directly with the employer.</p>}
            <TooltipPrimitive.Arrow className="fill-neutral-12" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function formatComp(role: RoleResult): string | null {
  if (role.compMin == null && role.compMax == null) return null;
  const currency = role.compCurrency ?? "USD";
  const fmt = (n: number) => `${currency === "USD" ? "$" : currency + " "}${Math.round(n / 1000)}k`;
  if (role.compMin != null && role.compMax != null && role.compMin !== role.compMax) {
    return `${fmt(role.compMin)}–${fmt(role.compMax)}`;
  }
  return fmt(role.compMin ?? role.compMax ?? 0);
}

/**
 * One role in /try's search results (R2 §3.4). Company name, role title,
 * 2-3 requirement chips distinguishing stated (solid border) from inferred
 * (dashed border + tooltip), and a source-citation-chip back to the
 * original posting. Clicking opens the matching company-profile-card —
 * disabled when the posting is a stealth listing with no public company
 * slug to look up.
 */
export function RoleSearchResultCard({
  role,
  onViewCompany,
}: {
  role: RoleResult;
  onViewCompany?: (role: RoleResult) => void;
}) {
  const sorted = [...role.requirementSignals].sort((a, b) => signalPriority(a) - signalPriority(b));
  const VISIBLE = 3;
  const visibleSignals = sorted.slice(0, VISIBLE);
  const hiddenCount = sorted.length - visibleSignals.length;
  const canViewCompany = role.companySlug !== null && !!onViewCompany;
  const comp = formatComp(role);

  return (
    <Card
      interactive={canViewCompany}
      className={cn("flex flex-col gap-3 p-4 sm:p-5", canViewCompany && "cursor-pointer")}
      onClick={canViewCompany ? () => onViewCompany?.(role) : undefined}
      role={canViewCompany ? "button" : undefined}
      tabIndex={canViewCompany ? 0 : undefined}
      onKeyDown={
        canViewCompany
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onViewCompany?.(role);
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-sm text-neutral-11">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            <span>{role.company}</span>
          </div>
          <h3 className="text-[1.0625rem] font-semibold leading-[1.4] text-neutral-12">{role.title}</h3>
        </div>
        {comp && (
          <span className="shrink-0 rounded-full bg-neutral-3 px-2.5 py-1 font-mono text-[0.8125rem] text-neutral-11">
            {comp}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-11">
        {role.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {role.location}
          </span>
        )}
        {role.remote && (
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" aria-hidden /> Remote
          </span>
        )}
      </div>

      {visibleSignals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleSignals.map((signal, i) => (
            <RequirementChip key={`${signal.kind}-${signal.value}-${i}`} signal={signal} />
          ))}
          {hiddenCount > 0 && <span className="text-xs text-neutral-10">+{hiddenCount} more</span>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <SourceCitationChip source={{ title: `${role.company} posting`, url: role.url }} />
        {canViewCompany ? (
          <span className="text-xs text-accent-11">View company profile →</span>
        ) : (
          <span className="text-xs text-neutral-9">Stealth posting — no company profile</span>
        )}
      </div>
    </Card>
  );
}
