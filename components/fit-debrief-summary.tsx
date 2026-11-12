"use client";

import * as React from "react";
import { Check, Copy, Heart, ThumbsDown } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { SourceCitationChip } from "@/components/source-citation-chip";
import { FIT_TAG_LABELS, type FitTag } from "@/data/fit-tags";
import type { FitDebriefOutput } from "@/lib/try-tool-types";

function tagLabel(tag: string): string {
  return FIT_TAG_LABELS[tag as FitTag] ?? tag;
}

/**
 * Renders fit_debrief (R2 §3.9). Loved/disliked as Chips, suggested
 * questions for the company, and an editable share-draft textarea. No
 * number, star rating, or progress bar anywhere — this is never a score
 * (Hard Constraint 4). `summaryTemplate` is an INSTRUCTION written for an
 * agent to act on ("Using what you know about the user, write a short,
 * honest summary...") — rendering it as if it were already a finished,
 * personalized paragraph would be dishonest with no agent here to have
 * written it, so it's shown as a labeled raw instruction instead.
 */
export function FitDebriefSummary({
  data,
  loved,
  disliked,
}: {
  data: FitDebriefOutput;
  loved: string[];
  disliked: string[];
}) {
  const [draft, setDraft] = React.useState(data.shareDraft.markdown);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setDraft(data.shareDraft.markdown);
  }, [data.shareDraft.markdown]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard access can be denied by the browser — the textarea text
      // is still selectable/copyable by hand, so this is a silent no-op.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-[1.25rem] font-semibold leading-[1.4] text-neutral-12">{data.roleTitle}</h3>
        <p className="text-sm text-neutral-11">{data.company}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
            <Heart className="h-3.5 w-3.5" aria-hidden /> What stood out positively
          </p>
          {loved.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {loved.map((t) => (
                <Chip key={t} tone="accent">
                  {tagLabel(t)}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-10">Nothing marked as loved.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden /> What gave pause
          </p>
          {disliked.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {disliked.map((t) => (
                <Chip key={t} tone="neutral">
                  {tagLabel(t)}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-10">Nothing flagged as a concern.</p>
          )}
        </div>
      </div>

      {data.questionsToAskTheCompany.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
            Questions worth asking the company
          </p>
          <ul className="flex flex-col gap-1.5 text-sm leading-[1.55] text-neutral-12">
            {data.questionsToAskTheCompany.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>·</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
            Share draft (edit before sending)
          </p>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={7}
          className="w-full rounded-md border border-neutral-7 bg-neutral-1 px-3 py-2.5 font-mono text-[0.8125rem] leading-[1.5] text-neutral-12 focus-visible:outline-none focus-visible:border-accent-8 focus-visible:ring-2 focus-visible:ring-accent-6"
        />
        <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{data.shareDraft.note}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-neutral-6 bg-neutral-2 p-3">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-neutral-10">
          What your agent would do with this
        </p>
        <p className="text-sm leading-[1.5] text-neutral-11">
          This tool hands your agent an instruction, not a finished summary — your own agent would turn it into a
          short, personalized paragraph using what it already knows about you. There's no agent in this playground,
          so here's the raw instruction it would act on:
        </p>
        <pre className="whitespace-pre-wrap rounded-sm bg-neutral-1 p-2.5 font-mono text-[0.75rem] leading-[1.5] text-neutral-11">
          {data.summaryTemplate}
        </pre>
      </div>

      {data.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-10">Sources:</span>
          {data.sources.map((s, i) => (
            <SourceCitationChip key={i} source={s} />
          ))}
        </div>
      )}

      <p className="text-[0.8125rem] leading-[1.4] text-neutral-10">{data.disclaimer}</p>
    </div>
  );
}
