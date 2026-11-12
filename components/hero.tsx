"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { cn } from "@/lib/cn";
import rulesData from "@/data/rules.json";

// The one real rule this demo cites — pulled live from data/rules.json
// rather than hand-copied, so the hero can never drift out of sync with the
// actual source of truth (task brief: "cite something real, not invented").
const ITAR_US_PERSON_RULE = rulesData.rules.find((rule) => rule.id === "itar-us-person");
const HERO_CITATION = ITAR_US_PERSON_RULE?.sources[0] ?? {
  title: "22 CFR § 120.62 — U.S. Person (eCFR)",
  url: "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.62",
  lastVerified: "2026-11-11",
};

const USER_MESSAGE = "can a green card holder work the Anduril Fury role?";
const TOOL_NAME = "explain_rule";
const ASSISTANT_TEXT =
  "Yes — green card holders qualify as U.S. persons under ITAR. Citizenship status is a separate test from holding a clearance.";

type Stage = 0 | 1 | 2 | 3;

/**
 * Drives the transcript's one-time reveal (R2 §3.1: "On first paint the
 * transcript may type out once"). Fully respects prefers-reduced-motion by
 * skipping straight to the final state with no stagger and no typing loop —
 * required explicitly because a JS setTimeout loop isn't stopped by the
 * global CSS reduced-motion override in app/globals.css (that override only
 * neutralizes CSS transitions/animations, not JS timers).
 */
function useTranscriptReveal() {
  const [stage, setStage] = React.useState<Stage>(0);
  const [typedLength, setTypedLength] = React.useState(0);
  const reducedMotionRef = React.useRef(false);

  React.useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedMotionRef.current = prefersReduced;

    // Every state update below is deferred through a timer callback (even a
    // 0ms one for the reduced-motion case) rather than called synchronously
    // in the effect body — this keeps the component's first render (on the
    // server and on the client, before this effect runs) identical and
    // hydration-safe, and avoids cascading renders during the commit phase.
    if (prefersReduced) {
      const id = setTimeout(() => {
        setStage(3);
        setTypedLength(ASSISTANT_TEXT.length);
      }, 0);
      return () => clearTimeout(id);
    }

    const timers = [
      setTimeout(() => setStage(1), 200),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  React.useEffect(() => {
    if (stage < 3 || reducedMotionRef.current || typedLength >= ASSISTANT_TEXT.length) return;
    const id = setTimeout(() => setTypedLength((n) => Math.min(n + 2, ASSISTANT_TEXT.length)), 16);
    return () => clearTimeout(id);
  }, [stage, typedLength]);

  return {
    stage,
    assistantText: ASSISTANT_TEXT.slice(0, typedLength),
    isAssistantDone: typedLength >= ASSISTANT_TEXT.length,
  };
}

function revealClass(active: boolean) {
  return cn("transition-all duration-150 ease-out", active ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0");
}

/**
 * The above-the-fold statement of what this is, plus proof it's real (R2
 * §3.1). A real, rendered chat-transcript panel — never a screenshot or
 * mockup (Do-Don't #6).
 */
export function Hero() {
  const { stage, assistantText, isAssistantDone } = useTranscriptReveal();

  return (
    <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-16 sm:pt-20 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-28 lg:pb-24">
      <div>
        <p className="text-[0.75rem] leading-[1.3] font-semibold tracking-[0.04em] text-neutral-10 uppercase">
          Stateless MCP server
        </p>
        <h1 className="mt-4 text-[2.75rem] leading-[1.1] font-semibold tracking-[-0.015em] text-neutral-12 sm:text-[3.5rem] sm:leading-[1.05] sm:tracking-[-0.02em]">
          Pursue defense-tech roles from inside your own agent.
        </h1>
        <p className="mt-5 max-w-lg text-[1.125rem] leading-[1.6] text-neutral-11">
          Your agent reasons privately on rubrics, timelines, and trial work — we never see your answers.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/#install">
              Add to your agent <ArrowDown className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
            <Link href="/try">
              Open the playground <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 lg:mt-0">
        <div className="overflow-hidden rounded-xl border border-neutral-6 bg-neutral-1 shadow-elevation-2">
          <div className="border-b border-neutral-6 bg-neutral-2 px-4 py-2 font-mono text-[0.8125rem] leading-[1.5] text-neutral-10">
            live agent transcript
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className={cn("flex", revealClass(stage >= 1))}>
              <p className="ml-auto max-w-[85%] rounded-lg bg-neutral-3 px-3.5 py-2 text-[0.875rem] leading-[1.5] text-neutral-12">
                {USER_MESSAGE}
              </p>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 font-mono text-[0.8125rem] leading-[1.5] text-accent-11",
                revealClass(stage >= 2),
              )}
            >
              <span aria-hidden>⚙</span>
              <span>
                calling <code className="font-semibold">{TOOL_NAME}</code>
              </span>
            </div>

            <div className={revealClass(stage >= 3)}>
              <div className="max-w-[90%] rounded-lg border border-neutral-6 bg-neutral-2 px-3.5 py-2.5">
                <p className="text-[0.875rem] leading-[1.55] text-neutral-12">
                  {assistantText}
                  {stage >= 3 && !isAssistantDone ? <span aria-hidden>▍</span> : null}
                </p>
                {isAssistantDone ? (
                  <div className="mt-2">
                    <SourceCitationChip source={HERO_CITATION} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
