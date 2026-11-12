import { cn } from "@/lib/cn";

/**
 * Shape-matched loading placeholders (R2 §3.14) — never a generic spinner.
 * Each export mirrors the real box layout of the component it stands in
 * for. `motion-safe:animate-pulse` pulses opacity on a neutral-3 box when
 * motion is allowed, and freezes to a static neutral-3 box under
 * prefers-reduced-motion (both the Tailwind variant and the global
 * @media(prefers-reduced-motion) rule in app/globals.css collapse the
 * animation duration to ~0, so there's no separate "paused" state to wire
 * up by hand).
 */
function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-neutral-3 motion-safe:animate-pulse", className)} />;
}

function SkeletonCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-lg border border-neutral-6 bg-neutral-1 p-4 sm:p-5", className)}>{children}</div>;
}

/** Mirrors role-search-result-card: title line, meta line, a row of chip-shaped bones, a source chip. */
export function RoleResultsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Searching for roles">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-56" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Bone className="h-6 w-28 rounded-full" />
            <Bone className="h-6 w-24 rounded-full" />
            <Bone className="h-6 w-20 rounded-full" />
          </div>
          <Bone className="h-6 w-32 rounded-full" />
        </SkeletonCard>
      ))}
    </div>
  );
}

/** A smaller single-line variant for the inline role picker used by three tabs. */
export function RolePickerSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading roles">
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={i} className="h-11 w-full rounded-md" />
      ))}
    </div>
  );
}

/** Mirrors timeline-estimator-widget: a range bar, 2-3 driver lines, a caption line. */
export function TimelineSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4" >
      <div role="status" aria-label="Estimating timeline" className="flex flex-col gap-4">
        <Bone className="h-3 w-24" />
        <Bone className="h-3 w-full" />
        <div className="flex flex-col gap-2">
          <Bone className="h-4 w-full max-w-sm" />
          <Bone className="h-4 w-full max-w-xs" />
          <Bone className="h-4 w-full max-w-sm" />
        </div>
        <Bone className="h-3 w-5/6" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors rubric-checklist: a group label then N rows of label+pill. */
export function RubricChecklistSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading checklist">
      <Bone className="h-3 w-28" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-neutral-6 px-3 py-2.5">
          <Bone className="h-4 w-2/3" />
          <Bone className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors trial-assessment-card: a tab strip then a content block. */
export function TrialAssessmentSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Building trial assessment" className="flex flex-col gap-4">
        <Bone className="h-9 w-full max-w-md rounded-full" />
        <Bone className="h-4 w-1/2" />
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-4/5" />
        </div>
      </div>
    </SkeletonCard>
  );
}

/** Mirrors job-preview-scene-player: a 6-dot stepper, a stage block, choice buttons. */
export function JobPreviewSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-5">
      <div role="status" aria-label="Loading job preview" className="flex flex-col gap-5">
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
        <Bone className="h-5 w-48" />
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-3/4" />
        </div>
        <div className="flex flex-col gap-2">
          <Bone className="h-10 w-full rounded-md" />
          <Bone className="h-10 w-full rounded-md" />
          <Bone className="h-10 w-full rounded-md" />
        </div>
      </div>
    </SkeletonCard>
  );
}

/** Mirrors company-profile-card: header, a few criteria rows, a work-realities block. */
export function CompanyProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading company profile" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Bone className="h-5 w-40" />
        <Bone className="h-3 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-10 w-full" />
        ))}
      </div>
      <Bone className="h-24 w-full" />
    </div>
  );
}

/** Mirrors fit-debrief-summary: two chip rows, a question list, a textarea block. */
export function FitDebriefSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Preparing debrief" className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Bone className="h-6 w-24 rounded-full" />
          <Bone className="h-6 w-20 rounded-full" />
          <Bone className="h-6 w-28 rounded-full" />
        </div>
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-5/6" />
        <Bone className="h-28 w-full" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors the explain-a-rule result: a title line, a paragraph, a key-points list, source chips. */
export function RuleExplainSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-3">
      <div role="status" aria-label="Looking up rule" className="flex flex-col gap-3">
        <Bone className="h-5 w-56" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Bone className="h-6 w-28 rounded-full" />
          <Bone className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </SkeletonCard>
  );
}

/** Mirrors readiness-brief's output: three prompt+focus-areas blocks, a question list. */
export function ReadinessBriefSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Building readiness brief" className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-4/5" />
          </div>
        ))}
        <Bone className="h-3 w-24" />
        <Bone className="h-10 w-full" />
        <Bone className="h-10 w-full" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors a GitHub profile card: avatar-row, repo-count/followers stats, a language-chip row, a recent-activity list. */
export function VerifyEvidenceSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Checking GitHub profile" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Bone className="h-5 w-40" />
          <Bone className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-6 w-20 rounded-full" />
          <Bone className="h-6 w-20 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-10 w-full" />
        ))}
      </div>
    </SkeletonCard>
  );
}

/** Mirrors the consented-card preview: a markdown-block, a not-verified note. */
export function ConsentedCardSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Building your card" className="flex flex-col gap-4">
        <Bone className="h-4 w-1/2" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
        <Bone className="h-16 w-full" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors the signed-attestation credential preview: a proof block, a markdown block. */
export function SignedAttestationSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Verifying signature" className="flex flex-col gap-4">
        <Bone className="h-4 w-1/2" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-5/6" />
        <Bone className="h-16 w-full" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors a simple confirmation message. */
export function AnonymousSignalSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-3">
      <div role="status" aria-label="Recording contribution" className="flex flex-col gap-3">
        <Bone className="h-4 w-1/3" />
        <Bone className="h-3 w-full" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors the aggregated-signal percentage breakdown: a few labeled bars. */
export function AggregatedSignalSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Reading aggregated signal" className="flex flex-col gap-3">
        <Bone className="h-4 w-1/3" />
        <Bone className="h-3 w-5/6" />
        <Bone className="h-3 w-2/3" />
        <Bone className="h-3 w-3/4" />
      </div>
    </SkeletonCard>
  );
}

/** Mirrors the interview-guide output: a guardrail list, then N question blocks. */
export function InterviewGuideSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div role="status" aria-label="Generating interview guide" className="flex flex-col gap-4">
        <Bone className="h-4 w-1/2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

/** Mirrors the verify-attestation result: a verdict line, then a few detail lines. */
export function VerifyAttestationSkeleton() {
  return (
    <SkeletonCard className="flex flex-col gap-3">
      <div role="status" aria-label="Verifying credential" className="flex flex-col gap-3">
        <Bone className="h-4 w-1/3" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
      </div>
    </SkeletonCard>
  );
}
