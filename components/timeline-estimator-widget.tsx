import { SourceCitationChip } from "@/components/source-citation-chip";
import type { EstimateTimelineOutput } from "@/lib/try-tool-types";

/**
 * Renders estimate_timeline output as a RANGE, never a single confident
 * number (R2 §3.5) — a horizontal bar from min→max with the median marked
 * when one exists, key drivers as plain-text bullets, and a caption-sized
 * uncertainty line. A single point is only ever shown when min===max, i.e.
 * when the source data genuinely gives one number, not a range.
 *
 * Deviation note: estimate_timeline's output schema attaches `sources` to
 * the response as a whole, not to each entry in `keyDrivers` individually
 * (the handler in lib/tools/estimate-timeline.ts pushes to a shared array
 * with no stable index correspondence to drivers — e.g. the "already
 * active" branch clears `drivers` after an earlier driver already added a
 * source). Rather than guess an attribution the data doesn't actually make,
 * every source is shown once in a shared "Sources for this estimate" row
 * below the drivers, instead of one chip per bullet.
 */
export function TimelineEstimatorWidget({ data }: { data: EstimateTimelineOutput }) {
  const { estimate, keyDrivers, uncertaintyNote, sources, disclaimer } = data;
  const hasRange = estimate.minDays != null && estimate.maxDays != null;
  const isPoint = hasRange && estimate.minDays === estimate.maxDays;
  const domainMax = hasRange ? Math.max(estimate.maxDays as number, 1) : 1;
  const minPct = hasRange ? ((estimate.minDays as number) / domainMax) * 100 : 0;
  const medianPct =
    estimate.medianDays != null ? Math.min(100, Math.max(0, (estimate.medianDays / domainMax) * 100)) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {!hasRange && (
          <p className="text-sm leading-[1.55] text-neutral-11">
            No day-count estimate applies to this exact case — see the driver below for why. Ask your FSO for a
            case-specific read.
          </p>
        )}
        {hasRange && isPoint && (
          <div className="flex items-baseline gap-2">
            <span className="text-[1.5rem] font-semibold leading-[1.3] text-neutral-12">~{estimate.minDays}</span>
            <span className="text-sm text-neutral-11">days — a single reported figure, not a range</span>
          </div>
        )}
        {hasRange && !isPoint && (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.5rem] font-semibold leading-[1.3] text-neutral-12">
                {estimate.minDays}–{estimate.maxDays}
              </span>
              <span className="text-sm text-neutral-11">
                days{estimate.medianDays != null ? ` · likely ~${estimate.medianDays}` : ""}
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-neutral-3">
              <div
                className="absolute inset-y-0 rounded-full bg-accent-9"
                style={{ left: `${minPct}%`, right: 0 }}
              />
              {medianPct != null && (
                <div
                  className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-accent-11"
                  style={{ left: `${medianPct}%` }}
                  aria-hidden
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-neutral-10">
              <span>{estimate.minDays}d</span>
              <span>{estimate.maxDays}d</span>
            </div>
          </>
        )}
      </div>

      {keyDrivers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">Key drivers</p>
          <ul className="flex flex-col gap-2">
            {keyDrivers.map((driver, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-sm leading-[1.55]">
                <span className="font-medium capitalize text-neutral-12">{driver.label}</span>
                <span className="text-neutral-11">{driver.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{uncertaintyNote}</p>

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-10">Sources for this estimate:</span>
          {sources.map((s, i) => (
            <SourceCitationChip key={i} source={s} />
          ))}
        </div>
      )}

      <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{disclaimer}</p>
    </div>
  );
}
