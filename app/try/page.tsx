"use client";

/**
 * /try — the playground that exercises every MCP tool without an agent,
 * calling the app's own /api/tools/{name} directly (research/R2-design-
 * system.md §3.4-3.10, §3.13-3.15, §5's /try wireframe, §6 Do/Don't rules).
 *
 * Six tabs. The wireframe names five (Search roles / Timeline / Trial
 * assessment / Job preview / Explain a rule); a sixth, "Role rubric", is
 * added here because get_role_rubric is one of the tool files this page was
 * explicitly scoped to call, and rubric-checklist's own spec (§3.6)
 * describes exactly how to render that tool's output — it needed a real
 * place to be called from.
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Search, SearchX, X, Heart, ThumbsDown, RotateCcw } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SourceCitationChip } from "@/components/source-citation-chip";

import { RoleSearchResultCard } from "@/components/role-search-result-card";
import { CompanyProfileCard } from "@/components/company-profile-card";
import { TimelineEstimatorWidget } from "@/components/timeline-estimator-widget";
import { RubricChecklist, type RubricGroup } from "@/components/rubric-checklist";
import { TrialAssessmentCard } from "@/components/trial-assessment-card";
import { JobPreviewScenePlayer } from "@/components/job-preview-scene-player";
import { FitDebriefSummary } from "@/components/fit-debrief-summary";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  RoleResultsSkeleton,
  RolePickerSkeleton,
  TimelineSkeleton,
  RubricChecklistSkeleton,
  TrialAssessmentSkeleton,
  JobPreviewSkeleton,
  CompanyProfileSkeleton,
  FitDebriefSkeleton,
  RuleExplainSkeleton,
} from "@/components/loading-skeleton";

import { useToolCall } from "@/lib/use-tool-call";
import { cn } from "@/lib/cn";
import { FIT_TAGS, FIT_TAG_LABELS } from "@/data/fit-tags";
import type {
  SearchDefenseRolesInput,
  SearchDefenseRolesOutput,
  ClearanceFilter,
  EstimateTimelineInput,
  EstimateTimelineOutput,
  TargetLevel,
  CurrentStatus,
  EmployerFclStatus,
  TrialAssessmentInput,
  TrialAssessmentOutput,
  TrialMinutes,
  JobPreviewInput,
  JobPreviewOutput,
  JobPreviewMinutes,
  FitDebriefInput,
  FitDebriefOutput,
  ExplainRuleInput,
  ExplainRuleOutput,
  CompanyProfileInput,
  CompanyProfileOutput,
  RoleRubricInput,
  RoleRubricOutput,
  PickedRole,
} from "@/lib/try-tool-types";

const TAB_DEFS = [
  { id: "search", label: "Search roles" },
  { id: "timeline", label: "Timeline" },
  { id: "trial", label: "Trial assessment" },
  { id: "rubric", label: "Role rubric" },
  { id: "preview", label: "Job preview" },
  { id: "explain", label: "Explain a rule" },
] as const;

const tabTriggerClass =
  "shrink-0 whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-neutral-11 transition-colors duration-150 ease-out hover:text-neutral-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6 data-[state=active]:border-accent-9 data-[state=active]:text-neutral-12";

const filterFieldClass = "flex shrink-0 flex-col gap-1.5 min-w-[160px] lg:min-w-0 lg:w-full";

/* ------------------------------------------------------------------------ */
/* Small shared bits                                                        */
/* ------------------------------------------------------------------------ */

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-11">
      {children}
    </label>
  );
}

function LabeledSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className={cn(filterFieldClass, "flex-row items-center justify-between gap-3 rounded-sm border border-neutral-7 bg-neutral-1 px-3 py-2")}>
      <label htmlFor={id} className="text-sm text-neutral-12">
        {label}
      </label>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-neutral-5 transition-colors duration-150 ease-out data-[state=checked]:bg-accent-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6"
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-neutral-1 shadow-elevation-1 transition-transform duration-150 ease-out data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

/** Shared by Trial assessment / Role rubric / Job preview — all three need
 * "pick a role from live data" and nothing more. Runs an initial unfiltered
 * search on mount so there's always something to click, per spec: "a small
 * set of real roles," never hardcoded fakes. */
function RolePicker({
  label,
  selectedRole,
  onSelect,
}: {
  label: string;
  selectedRole: PickedRole | null;
  onSelect: (role: PickedRole) => void;
}) {
  const { data, error, loading, call } = useToolCall<SearchDefenseRolesInput, SearchDefenseRolesOutput>(
    "search_defense_roles",
  );
  const [query, setQuery] = React.useState("");
  const ranOnce = React.useRef(false);

  React.useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    void call({ limit: 6 });
  }, [call]);

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    void call({ query: query.trim() || undefined, limit: 6 });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-6 bg-neutral-2 p-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">{label}</p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roles — e.g. autonomy"
          aria-label="Search roles"
          className="flex-1"
        />
        <Button type="submit" size="sm" variant="secondary" aria-label="Search">
          <Search className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      {selectedRole && (
        <div className="rounded-md border border-accent-8 bg-accent-2 px-3 py-2 text-sm text-neutral-12">
          Selected: <span className="font-medium">{selectedRole.title}</span> at {selectedRole.company}
        </div>
      )}

      {loading && <RolePickerSkeleton rows={4} />}
      {!loading && error && <ErrorState error={error} onRetry={handleSearch} />}
      {!loading && !error && data && data.roles.length === 0 && (
        <EmptyState icon={SearchX} title="No roles found" description="Try a different search term." />
      )}
      {!loading && !error && data && data.roles.length > 0 && (
        <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {data.roles.map((role) => {
            const active = role.id === selectedRole?.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelect({ id: role.id, title: role.title, company: role.company })}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors duration-150 ease-out",
                  active ? "border-accent-8 bg-accent-1" : "border-neutral-6 bg-neutral-1 hover:border-accent-8",
                )}
              >
                <span className="text-sm font-medium text-neutral-12">{role.title}</span>
                <span className="text-xs text-neutral-11">{role.company}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Search roles                                                             */
/* ------------------------------------------------------------------------ */

function SearchRolesTab({ onViewCompany }: { onViewCompany: (companySlug: string) => void }) {
  const { data, error, loading, call } = useToolCall<SearchDefenseRolesInput, SearchDefenseRolesOutput>(
    "search_defense_roles",
  );
  const [query, setQuery] = React.useState("");
  const [clearance, setClearance] = React.useState<ClearanceFilter | "">("");
  const [itarOnly, setItarOnly] = React.useState(false);
  const [location, setLocation] = React.useState("");
  const [remoteOnly, setRemoteOnly] = React.useState(false);
  const [limit, setLimit] = React.useState(10);
  const ranOnce = React.useRef(false);

  function runSearch() {
    void call({
      query: query.trim() || undefined,
      clearance: clearance || undefined,
      itar_only: itarOnly ? true : undefined,
      location: location.trim() || undefined,
      remote: remoteOnly ? true : undefined,
      limit,
    });
  }

  React.useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    void call({ limit: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearFilters() {
    setQuery("");
    setClearance("");
    setItarOnly(false);
    setLocation("");
    setRemoteOnly(false);
    setLimit(10);
    void call({ limit: 10 });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:w-[240px] lg:flex-none lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
        <div className={filterFieldClass}>
          <FieldLabel htmlFor="search-query">Keyword</FieldLabel>
          <Input
            id="search-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. autonomy"
          />
        </div>
        <div className={filterFieldClass}>
          <FieldLabel htmlFor="search-clearance">Clearance level</FieldLabel>
          <Select
            id="search-clearance"
            value={clearance}
            onChange={(e) => setClearance(e.target.value as ClearanceFilter | "")}
          >
            <option value="">Any clearance level</option>
            <option value="none">No clearance required</option>
            <option value="secret">Secret</option>
            <option value="ts">Top Secret</option>
            <option value="ts_sci">Top Secret/SCI</option>
          </Select>
        </div>
        <LabeledSwitch id="search-itar" label="ITAR only" checked={itarOnly} onCheckedChange={setItarOnly} />
        <div className={filterFieldClass}>
          <FieldLabel htmlFor="search-location">Location</FieldLabel>
          <Input
            id="search-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Austin, TX"
          />
        </div>
        <LabeledSwitch id="search-remote" label="Remote only" checked={remoteOnly} onCheckedChange={setRemoteOnly} />
        <div className={filterFieldClass}>
          <FieldLabel htmlFor="search-limit">Results</FieldLabel>
          <Select id="search-limit" value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="25">25</option>
          </Select>
        </div>
        <Button onClick={runSearch} className="shrink-0 lg:mt-1 lg:w-full">
          Search roles
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {loading && <RoleResultsSkeleton rows={3} />}
        {!loading && error && <ErrorState error={error} onRetry={runSearch} />}
        {!loading && !error && data && data.roles.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="No roles match these filters"
            description="Try widening your clearance level, clearing the location filter, or broadening your keyword."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        )}
        {!loading && !error && data && data.roles.length > 0 && (
          <>
            <p className="text-sm text-neutral-11">{data.note}</p>
            <div className="flex flex-col gap-3">
              {data.roles.map((role) => (
                <RoleSearchResultCard
                  key={role.id}
                  role={role}
                  onViewCompany={(r) => r.companySlug && onViewCompany(r.companySlug)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-6 pt-4">
              <span className="text-xs text-neutral-10">Sources:</span>
              {data.sources.map((s, i) => (
                <SourceCitationChip key={i} source={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Timeline                                                                  */
/* ------------------------------------------------------------------------ */

function TimelineTab() {
  const { data, error, loading, call } = useToolCall<EstimateTimelineInput, EstimateTimelineOutput>(
    "estimate_timeline",
  );
  const [targetLevel, setTargetLevel] = React.useState<TargetLevel>("secret");
  const [currentStatus, setCurrentStatus] = React.useState<CurrentStatus>("none");
  const [employerFcl, setEmployerFcl] = React.useState<EmployerFclStatus>("unknown");
  const ranOnce = React.useRef(false);

  function runEstimate() {
    void call({ target_level: targetLevel, current_status: currentStatus, employer_has_fcl: employerFcl });
  }

  React.useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    runEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="target-level">Target level</FieldLabel>
          <Select id="target-level" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value as TargetLevel)}>
            <option value="secret">Secret</option>
            <option value="ts">Top Secret</option>
            <option value="ts_sci">Top Secret/SCI</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="current-status">Current status</FieldLabel>
          <Select
            id="current-status"
            value={currentStatus}
            onChange={(e) => setCurrentStatus(e.target.value as CurrentStatus)}
          >
            <option value="none">None yet</option>
            <option value="interim">Interim</option>
            <option value="active">Active</option>
            <option value="lapsed_lt_2y">Lapsed, under 2 years</option>
            <option value="lapsed_gt_2y">Lapsed, over 2 years</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="employer-fcl">Employer has an FCL?</FieldLabel>
          <Select
            id="employer-fcl"
            value={employerFcl}
            onChange={(e) => setEmployerFcl(e.target.value as EmployerFclStatus)}
          >
            <option value="unknown">Not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
      </div>
      <Button onClick={runEstimate} className="self-start">
        Estimate timeline
      </Button>

      {loading && <TimelineSkeleton />}
      {!loading && error && <ErrorState error={error} onRetry={runEstimate} />}
      {!loading && !error && data && <TimelineEstimatorWidget data={data} />}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Trial assessment                                                         */
/* ------------------------------------------------------------------------ */

function TrialAssessmentTab() {
  const { data, error, loading, call } = useToolCall<TrialAssessmentInput, TrialAssessmentOutput>(
    "build_trial_assessment",
  );
  const [selectedRole, setSelectedRole] = React.useState<PickedRole | null>(null);
  const [minutes, setMinutes] = React.useState<TrialMinutes>(60);

  function fetchFor(roleId: string, m: TrialMinutes) {
    void call({ role_id: roleId, minutes: m });
  }

  function handleSelectRole(role: PickedRole) {
    setSelectedRole(role);
    fetchFor(role.id, minutes);
  }

  function handleMinutesChange(m: TrialMinutes) {
    setMinutes(m);
    if (selectedRole) fetchFor(selectedRole.id, m);
  }

  return (
    <div className="flex flex-col gap-6">
      <RolePicker label="Pick a role to build a trial assessment for" selectedRole={selectedRole} onSelect={handleSelectRole} />

      {!selectedRole && (
        <EmptyState
          icon={SearchX}
          title="Pick a role above"
          description="Trial assessments are generated from a real, live job posting — select one to continue."
        />
      )}
      {loading && <TrialAssessmentSkeleton />}
      {!loading && error && (
        <ErrorState error={error} onRetry={() => selectedRole && fetchFor(selectedRole.id, minutes)} />
      )}
      {!loading && !error && data && (
        <TrialAssessmentCard data={data} minutes={minutes} onMinutesChange={handleMinutesChange} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Role rubric                                                              */
/* ------------------------------------------------------------------------ */

function RoleRubricTab() {
  const { data, error, loading, call } = useToolCall<RoleRubricInput, RoleRubricOutput>("get_role_rubric");
  const [selectedRole, setSelectedRole] = React.useState<PickedRole | null>(null);

  function fetchFor(roleId: string) {
    void call({ role_id: roleId });
  }

  function handleSelectRole(role: PickedRole) {
    setSelectedRole(role);
    fetchFor(role.id);
  }

  const groups: RubricGroup[] = data
    ? [
        {
          title: "Eligibility",
          rows: data.eligibilityChecklist.map((item, i) => ({
            id: `elig-${i}`,
            label: item.question,
            basis: item.basis,
            evidence: item.whyItMatters,
          })),
        },
        {
          title: "Skills",
          rows: data.skillsRubric.map((item, i) => ({
            id: `skill-${i}`,
            label: item.skill,
            evidence: item.evidenceFromPosting,
          })),
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <RolePicker label="Pick a role to see its eligibility checklist and skills rubric" selectedRole={selectedRole} onSelect={handleSelectRole} />

      {selectedRole && (
        <DisclaimerBanner>
          In a real agent, this checklist is evaluated privately against what your agent already knows about you —
          here, with no agent, you&rsquo;re just seeing the structure.
        </DisclaimerBanner>
      )}

      {!selectedRole && (
        <EmptyState
          icon={SearchX}
          title="Pick a role above"
          description="The eligibility checklist and skills rubric are built from a real, live job posting — select one to continue."
        />
      )}
      {loading && <RubricChecklistSkeleton rows={5} />}
      {!loading && error && <ErrorState error={error} onRetry={() => selectedRole && fetchFor(selectedRole.id)} />}
      {!loading && !error && data && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-[1.0625rem] font-semibold text-neutral-12">{data.roleTitle}</h3>
            <p className="text-sm text-neutral-11">{data.company}</p>
          </div>
          <RubricChecklist groups={groups} />
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-6 pt-4">
            <span className="text-xs text-neutral-10">Sources:</span>
            {data.sources.map((s, i) => (
              <SourceCitationChip key={i} source={s} />
            ))}
          </div>
          <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{data.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Job preview (+ fit debrief)                                              */
/* ------------------------------------------------------------------------ */

const PREVIEW_MINUTE_OPTIONS: { value: `${JobPreviewMinutes}`; label: string }[] = [
  { value: "20", label: "20 min · 4 scenes" },
  { value: "30", label: "30 min · 6 scenes" },
];

function JobPreviewTab() {
  const preview = useToolCall<JobPreviewInput, JobPreviewOutput>("run_job_preview");
  const fit = useToolCall<FitDebriefInput, FitDebriefOutput>("fit_debrief");

  const [selectedRole, setSelectedRole] = React.useState<PickedRole | null>(null);
  const [minutes, setMinutes] = React.useState<JobPreviewMinutes>(20);
  const [showAggregate, setShowAggregate] = React.useState(false);
  const [loved, setLoved] = React.useState<string[]>([]);
  const [disliked, setDisliked] = React.useState<string[]>([]);

  function fetchFor(roleId: string, m: JobPreviewMinutes) {
    setShowAggregate(false);
    fit.reset();
    void preview.call({ role_id: roleId, minutes: m });
  }

  function handleSelectRole(role: PickedRole) {
    setSelectedRole(role);
    fetchFor(role.id, minutes);
  }

  function handleMinutesChange(value: `${JobPreviewMinutes}`) {
    const m = Number(value) as JobPreviewMinutes;
    setMinutes(m);
    if (selectedRole) fetchFor(selectedRole.id, m);
  }

  function toggleTag(tag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  function startOver() {
    setSelectedRole(null);
    setShowAggregate(false);
    setLoved([]);
    setDisliked([]);
    preview.reset();
    fit.reset();
  }

  function generateDebrief() {
    if (!selectedRole) return;
    void fit.call({ role_id: selectedRole.id, loved, disliked });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[260px] flex-1">
          <RolePicker label="Pick a role to preview" selectedRole={selectedRole} onSelect={handleSelectRole} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-11">Length</span>
          <SegmentedControl options={PREVIEW_MINUTE_OPTIONS} value={String(minutes) as `${JobPreviewMinutes}`} onChange={handleMinutesChange} />
        </div>
      </div>

      {!selectedRole && (
        <EmptyState
          icon={SearchX}
          title="Pick a role above"
          description="The job preview runs a realistic first-week simulation for a real, live role — select one to start."
        />
      )}
      {preview.loading && <JobPreviewSkeleton />}
      {!preview.loading && preview.error && (
        <ErrorState error={preview.error} onRetry={() => selectedRole && fetchFor(selectedRole.id, minutes)} />
      )}
      {!preview.loading && !preview.error && preview.data && !showAggregate && (
        <JobPreviewScenePlayer data={preview.data} onFinished={() => setShowAggregate(true)} />
      )}

      {!preview.loading && !preview.error && preview.data && showAggregate && (
        <div className="flex flex-col gap-6 rounded-lg border border-neutral-6 bg-neutral-1 p-4 sm:p-5">
          <div>
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
              Looking back on the whole preview
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-neutral-12">{preview.data.aggregateDebriefPrompt}</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
              What stood out to you?
            </p>
            <div className="flex flex-col gap-1.5">
              {FIT_TAGS.map((tag) => {
                const isLoved = loved.includes(tag);
                const isDisliked = disliked.includes(tag);
                return (
                  <div
                    key={tag}
                    className="flex items-center justify-between gap-3 rounded-md border border-neutral-6 px-3 py-2"
                  >
                    <span className="text-sm text-neutral-12">{FIT_TAG_LABELS[tag]}</span>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        aria-pressed={isLoved}
                        aria-label={`Mark "${FIT_TAG_LABELS[tag]}" as loved`}
                        onClick={() => toggleTag(tag, loved, setLoved)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-150 ease-out",
                          isLoved
                            ? "border-accent-8 bg-accent-2 text-accent-11"
                            : "border-neutral-6 text-neutral-9 hover:text-neutral-11",
                        )}
                      >
                        <Heart className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-pressed={isDisliked}
                        aria-label={`Mark "${FIT_TAG_LABELS[tag]}" as gave pause`}
                        onClick={() => toggleTag(tag, disliked, setDisliked)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-150 ease-out",
                          isDisliked
                            ? "border-neutral-8 bg-neutral-3 text-neutral-12"
                            : "border-neutral-6 text-neutral-9 hover:text-neutral-11",
                        )}
                      >
                        <ThumbsDown className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={generateDebrief} className="self-start">
            Generate debrief
          </Button>

          {fit.loading && <FitDebriefSkeleton />}
          {!fit.loading && fit.error && <ErrorState error={fit.error} onRetry={generateDebrief} />}
          {!fit.loading && !fit.error && fit.data && (
            <FitDebriefSummary data={fit.data} loved={loved} disliked={disliked} />
          )}
        </div>
      )}

      {selectedRole && (
        <Button variant="ghost" size="sm" onClick={startOver} className="self-start">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Start over with a different role
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Explain a rule                                                           */
/* ------------------------------------------------------------------------ */

function ExplainRuleTab() {
  const seed = useToolCall<ExplainRuleInput, ExplainRuleOutput>("explain_rule");
  const explain = useToolCall<ExplainRuleInput, ExplainRuleOutput>("explain_rule");
  const [topic, setTopic] = React.useState("");
  const seededOnce = React.useRef(false);

  React.useEffect(() => {
    if (seededOnce.current) return;
    seededOnce.current = true;
    // A deliberate miss, purely to seed the topic datalist/chips below —
    // never shown to the user as a result.
    void seed.call({ topic: "__browse_all_topics__" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableTopics = explain.data?.availableTopics ?? seed.data?.availableTopics ?? [];

  function runLookup(t: string) {
    const trimmed = t.trim();
    if (!trimmed) return;
    void explain.call({ topic: trimmed });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runLookup(topic);
  }

  function handleTopicChipClick(id: string) {
    setTopic(id);
    runLookup(id);
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. itar, fcl, reciprocity, sf86"
          aria-label="Rule topic"
          list="rule-topics"
          className="flex-1"
        />
        <datalist id="rule-topics">
          {availableTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </datalist>
        <Button type="submit">Explain</Button>
      </form>

      {explain.loading && <RuleExplainSkeleton />}

      {!explain.loading && explain.error && (
        <ErrorState error={explain.error} onRetry={() => explain.reset()} retryLabel="Edit and try again" />
      )}

      {!explain.loading && !explain.error && explain.data?.found && explain.data.topic && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-6 bg-neutral-1 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[1.0625rem] font-semibold text-neutral-12">{explain.data.topic.title}</h3>
            <span className="shrink-0 rounded-full bg-neutral-3 px-2.5 py-1 text-xs text-neutral-11">
              {explain.data.topic.category}
            </span>
          </div>
          <p className="text-sm leading-[1.6] text-neutral-12">{explain.data.topic.summary}</p>
          {explain.data.topic.keyPoints.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm leading-[1.55] text-neutral-11">
              {explain.data.topic.keyPoints.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>·</span>
                  {p}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {explain.data.sources.map((s, i) => (
              <SourceCitationChip key={i} source={s} />
            ))}
          </div>
          <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{explain.data.disclaimer}</p>
        </div>
      )}

      {!explain.loading && !explain.error && explain.data && !explain.data.found && (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={SearchX}
            title="We don't have a rule for that yet"
            description="Try one of these topics instead — clicking one runs the lookup again."
          />
          <div className="flex flex-wrap gap-2">
            {availableTopics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTopicChipClick(t.id)}
                className="rounded-full border border-neutral-7 bg-neutral-2 px-3 py-1.5 text-sm text-neutral-11 transition-colors duration-150 ease-out hover:border-accent-8 hover:text-accent-11"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Company profile dialog                                                   */
/* ------------------------------------------------------------------------ */

function CompanyProfileDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const { data, error, loading, call, reset } = useToolCall<CompanyProfileInput, CompanyProfileOutput>(
    "get_company_profile",
  );

  React.useEffect(() => {
    if (slug) void call({ company_slug: slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <DialogPrimitive.Root
      open={slug !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          reset();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-neutral-1 p-5 shadow-elevation-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DialogPrimitive.Title className="text-[1.25rem] font-semibold text-neutral-12">
              Company profile
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Published hiring criteria and computed work realities for this company.
          </DialogPrimitive.Description>
          {loading && <CompanyProfileSkeleton />}
          {!loading && error && (
            <ErrorState error={error} onRetry={() => slug && call({ company_slug: slug })} />
          )}
          {!loading && !error && data && <CompanyProfileCard data={data} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------------------------------------------------ */
/* Page                                                                      */
/* ------------------------------------------------------------------------ */

export default function TryPage() {
  const [profileSlug, setProfileSlug] = React.useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-6 px-6 py-10 sm:py-12">
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-accent-11">
            Playground · no agent required
          </p>
          <h1 className="text-[1.875rem] font-semibold leading-[1.25] text-neutral-12">Try every tool, live</h1>
          <p className="max-w-2xl text-[1.0625rem] leading-[1.6] text-neutral-11">
            Each tab below calls Clearance Lens&rsquo;s real API directly — the same tools your agent would call, no
            LLM key needed here.
          </p>
        </div>

        <DisclaimerBanner href="/sources" linkLabel="See Sources.">
          Role data is cached from public postings — see Sources for what&rsquo;s verified.
        </DisclaimerBanner>

        <TabsPrimitive.Root defaultValue="search" className="flex flex-col gap-6">
          <TabsPrimitive.List className="flex gap-1 overflow-x-auto border-b border-neutral-6 [scrollbar-width:none]">
            {TAB_DEFS.map((t) => (
              <TabsPrimitive.Trigger key={t.id} value={t.id} className={tabTriggerClass}>
                {t.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          {/* Each panel gets a visually-hidden <h2> — found via Lighthouse
              (DECISIONS.md): the page went straight from its one <h1> to
              <h3>s inside tab content (role cards, rubric titles) with no
              <h2> anywhere, an invalid heading order for screen-reader/
              structural navigation even though nothing here is visually
              wrong. The tab trigger above already shows the label
              visually, so a second VISIBLE heading here would just be
              redundant clutter — sr-only gives the correct semantic
              structure without changing anything sighted users see. */}
          <TabsPrimitive.Content value="search">
            <h2 className="sr-only">Search roles</h2>
            <SearchRolesTab onViewCompany={setProfileSlug} />
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="timeline">
            <h2 className="sr-only">Timeline</h2>
            <TimelineTab />
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="trial">
            <h2 className="sr-only">Trial assessment</h2>
            <TrialAssessmentTab />
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="rubric">
            <h2 className="sr-only">Role rubric</h2>
            <RoleRubricTab />
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="preview">
            <h2 className="sr-only">Job preview</h2>
            <JobPreviewTab />
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="explain">
            <h2 className="sr-only">Explain a rule</h2>
            <ExplainRuleTab />
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>
      </main>
      <Footer />
      <CompanyProfileDialog slug={profileSlug} onClose={() => setProfileSlug(null)} />
    </div>
  );
}
