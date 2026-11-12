"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const FAQ_ITEMS = [
  {
    question: "What is Clearance Lens?",
    answer:
      "An MCP server your AI agent calls directly. It returns public defense-tech role data and plain-English clearance/ITAR rule explanations, so your agent can help you evaluate a role entirely inside your own conversation.",
  },
  {
    question: "Is this legal advice?",
    answer:
      "No. Clearance and export-control rules have real exceptions, so every rule explanation links to its primary source and is framed as general information — always verify your specific situation with your Facility Security Officer (FSO) or an attorney before acting on it.",
  },
  {
    question: "Does Clearance Lens store my data?",
    answer:
      "Almost nothing, and nothing about who you are. There are no accounts and no log of what you asked. The one exception is opt-in: if you explicitly choose to contribute to the anonymous signal pool, it stores the few general answers you picked (like a clearance level), with no name, contact, or identifier attached, and only ever shows them as rounded percentages once at least 5 people have contributed. Every request is scanned, and identifying details — SSNs, dates of birth, ID numbers, contact details, clearance records — are rejected outright, never stored or forwarded.",
  },
  {
    question: "How do agents actually use it?",
    answer:
      "Your agent calls our tools the same way it calls any other MCP tool — it decides when a tool like search_defense_roles or explain_rule is relevant to what you asked, then reasons over the results privately in your own conversation. We never see that reasoning.",
  },
  {
    question: "What if my client doesn't support MCP yet?",
    answer:
      "You can still use every tool without an agent at all — the playground at /try runs the same tools from a plain web form, no MCP client or install step required.",
  },
  {
    question: "Why defense-tech specifically?",
    answer:
      "Clearance and export-control rules (ITAR, Facility Clearance sponsorship, SEAD 4/7) are unusually high-stakes and unusually hard to find explained in one place — a small misunderstanding can cost a candidate a role or a company a contract. That combination of real stakes and well-documented public rules is exactly what this kind of tool is good for.",
  },
] as const;

/**
 * FAQ (research/R2-design-system.md §5's `/` wireframe: "5–6 items, all
 * closed by default"). `type="single" collapsible` with no `defaultValue`
 * means nothing is open on load.
 */
export function FaqAccordion() {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="flex flex-col border-t border-neutral-6">
      {FAQ_ITEMS.map((item, index) => (
        <AccordionPrimitive.Item key={item.question} value={`faq-${index}`} className="border-b border-neutral-6">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger
              className={cn(
                "group flex w-full items-center justify-between gap-4 py-4 text-left text-[1.0625rem] leading-[1.4] font-semibold text-neutral-12 transition-colors duration-150 ease-out hover:text-accent-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8",
              )}
            >
              {item.question}
              <ChevronDown
                className="h-4 w-4 flex-none text-neutral-9 transition-transform duration-150 ease-out group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden text-[0.875rem] leading-[1.55] text-neutral-11 data-[state=closed]:hidden">
            <p className="max-w-2xl pb-4 pr-8">{item.answer}</p>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
