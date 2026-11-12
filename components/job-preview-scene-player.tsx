"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { JobPreviewOutput } from "@/lib/try-tool-types";

interface SceneAnswer {
  choiceId: string;
  rationale?: string;
}

/**
 * Renders run_job_preview's scenes ONE AT A TIME (R2 §3.8) — a stepper
 * above a single stage. Critically, `whatRealTeamsReportByChoice` is never
 * rendered until the viewer actually clicks a choice (the tool's own
 * `instructionsForAgent` says exactly this; this component enforces the
 * same rule in code, not just by convention): the outcome text for a scene
 * lives only in local state keyed by scene id, and nothing reads it into
 * the DOM until that scene has a recorded answer. When a scene's
 * `requiresStatedRationale` is true, the outcome stays hidden behind a
 * one-sentence rationale field until the viewer submits it.
 */
export function JobPreviewScenePlayer({
  data,
  onFinished,
}: {
  data: JobPreviewOutput;
  onFinished: () => void;
}) {
  const { scenes } = data;
  const [sceneIndex, setSceneIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, SceneAnswer>>({});
  const [pendingChoiceId, setPendingChoiceId] = React.useState<string | null>(null);
  const [rationaleDraft, setRationaleDraft] = React.useState("");
  const [reflectionNotes, setReflectionNotes] = React.useState<Record<string, string>>({});

  const scene = scenes[sceneIndex];
  const answer = answers[scene.id];
  const isAnswered = !!answer;
  const isLastScene = sceneIndex === scenes.length - 1;

  function recordAnswer(choiceId: string, rationale?: string) {
    setAnswers((prev) => ({ ...prev, [scene.id]: { choiceId, rationale } }));
    setPendingChoiceId(null);
    setRationaleDraft("");
  }

  function handleChoiceClick(choiceId: string) {
    if (isAnswered) return;
    if (scene.requiresStatedRationale) {
      setPendingChoiceId(choiceId);
    } else {
      recordAnswer(choiceId);
    }
  }

  function goTo(index: number) {
    setSceneIndex(index);
    setPendingChoiceId(null);
    setRationaleDraft("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 className="text-[1.25rem] font-semibold leading-[1.4] text-neutral-12">{data.roleTitle}</h3>
            <p className="text-sm text-neutral-11">{data.company} · first-week preview</p>
          </div>
          <span className="shrink-0 font-mono text-[0.8125rem] text-neutral-10">
            Scene {sceneIndex + 1} / {scenes.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {scenes.map((s, i) => {
            const reachable = i <= sceneIndex || !!answers[s.id];
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to scene ${i + 1}: ${s.title}`}
                aria-current={i === sceneIndex}
                disabled={!reachable}
                onClick={() => (reachable ? goTo(i) : undefined)}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed",
                  i <= sceneIndex ? "bg-accent-9" : "bg-neutral-3",
                )}
              />
            );
          })}
        </div>
        <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{data.polygraphNote}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-neutral-6 bg-neutral-1 p-4 sm:p-5">
        <h4 className="text-[1.0625rem] font-semibold leading-[1.4] text-neutral-12">{scene.title}</h4>
        <p className="text-sm leading-[1.6] text-neutral-12">{scene.setup}</p>

        <div className="flex flex-col gap-2">
          {scene.choices.map((choice) => {
            const isChosen = answer?.choiceId === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={isAnswered}
                onClick={() => handleChoiceClick(choice.id)}
                className={cn(
                  "flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-sm leading-[1.5] transition-colors duration-150 ease-out",
                  isChosen
                    ? "border-accent-8 bg-accent-2 text-neutral-12"
                    : isAnswered
                      ? "cursor-default border-neutral-6 text-neutral-9"
                      : "border-neutral-6 text-neutral-12 hover:border-accent-8 hover:bg-accent-1",
                )}
              >
                {isChosen ? (
                  <Check className="mt-0.5 h-4 w-4 flex-none text-accent-11" aria-hidden />
                ) : (
                  <span className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
                )}
                {choice.label}
              </button>
            );
          })}
        </div>

        {pendingChoiceId && !isAnswered && (
          <div className="flex flex-col gap-2 rounded-md border border-accent-7 bg-accent-1 p-3">
            <label htmlFor="rationale" className="text-sm font-medium text-neutral-12">
              Before we reveal what real teams report — state your one-sentence rationale.
            </label>
            <textarea
              id="rationale"
              value={rationaleDraft}
              onChange={(e) => setRationaleDraft(e.target.value)}
              rows={2}
              className="w-full rounded-sm border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 focus-visible:outline-none focus-visible:border-accent-8 focus-visible:ring-2 focus-visible:ring-accent-6"
              placeholder="Because…"
            />
            <Button
              size="sm"
              disabled={rationaleDraft.trim().length === 0}
              onClick={() => recordAnswer(pendingChoiceId, rationaleDraft.trim())}
              className="self-start"
            >
              Reveal outcome
            </Button>
          </div>
        )}

        {isAnswered && (
          <div className="flex flex-col gap-4 border-t border-neutral-5 pt-4">
            {answer.rationale && (
              <p className="text-sm italic leading-[1.5] text-neutral-11">Your rationale: &ldquo;{answer.rationale}&rdquo;</p>
            )}
            <div className="flex flex-col gap-1.5 rounded-md bg-neutral-2 p-3">
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
                What real teams report
              </p>
              <p className="text-sm leading-[1.6] text-neutral-12">{scene.whatRealTeamsReportByChoice[answer.choiceId]}</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">Debrief</p>
              <ul className="flex flex-col gap-1.5 text-sm leading-[1.55] text-neutral-11">
                {scene.debriefPrompts.map((prompt, i) => (
                  <li key={i}>{prompt}</li>
                ))}
              </ul>
              <textarea
                value={reflectionNotes[scene.id] ?? ""}
                onChange={(e) => setReflectionNotes((prev) => ({ ...prev, [scene.id]: e.target.value }))}
                rows={2}
                placeholder="Your reflection (optional — stays on this page only, nothing is sent anywhere)"
                className="w-full rounded-sm border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 placeholder:text-neutral-9 focus-visible:outline-none focus-visible:border-accent-8 focus-visible:ring-2 focus-visible:ring-accent-6"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={sceneIndex === 0} onClick={() => goTo(sceneIndex - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </Button>
        {isAnswered && (
          <Button
            size="sm"
            onClick={() => (isLastScene ? onFinished() : goTo(sceneIndex + 1))}
          >
            {isLastScene ? "Finish" : "Next scene"}
            {!isLastScene && <ChevronRight className="h-4 w-4" aria-hidden />}
          </Button>
        )}
      </div>
    </div>
  );
}
