"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/input";
import { SourceCitationChip } from "@/components/source-citation-chip";

/**
 * The 4 category buckets from research/R2-design-system.md §5's `/sources`
 * wireframe. "Hiring compliance & bias law" is only ever passed in by
 * app/sources/page.tsx when research/jit/bias-compliance-law.md has
 * actually landed — this component never invents a category with no rows.
 */
export const DISPLAY_CATEGORIES = [
  "ITAR & export control",
  "Clearance process & timelines",
  "Hiring compliance & bias law",
  "Assessment science",
] as const;

export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

/** One row = one individual source URL, never a rule/stat grouping — every
 * row still links out via `source-citation-chip`'s `expanded` row form. */
export interface SourceRow {
  title: string;
  url: string;
  lastVerified?: string;
  /** The specific citation/rule id shown as a small mono tag (R2 §5's
   * wireframe row shape) — e.g. a rule's own id from rules-data.ts, a
   * modifier id from timelines-data.ts, or a short citation code. */
  tag: string;
  category: DisplayCategory;
}

function categoryKey(category: DisplayCategory): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Searchable/filterable, Accordion-grouped source list (R2 §5's `/sources`
 * wireframe; Do/Don't #2 — this page is explicitly allowed to be dense and
 * table-like, unlike the rest of the site). All data prep (pulling from
 * lib/rules-data.ts / lib/timelines-data.ts, deduping, categorizing) happens
 * in app/sources/page.tsx; this component only renders the `rows` it's given.
 */
export function SourcesTable({ rows }: { rows: SourceRow[] }) {
  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<DisplayCategory | "all">("all");
  const [openItems, setOpenItems] = React.useState<string[]>(() => {
    const first = DISPLAY_CATEGORIES.find((c) => rows.some((r) => r.category === c));
    return first ? [categoryKey(first)] : [];
  });

  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery !== "" || categoryFilter !== "all";

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (!normalizedQuery) return true;
      return (
        row.title.toLowerCase().includes(normalizedQuery) ||
        row.category.toLowerCase().includes(normalizedQuery) ||
        row.tag.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [rows, categoryFilter, normalizedQuery]);

  const availableCategories = React.useMemo(
    () => DISPLAY_CATEGORIES.filter((c) => rows.some((r) => r.category === c)),
    [rows],
  );

  const groups = React.useMemo(
    () =>
      DISPLAY_CATEGORIES.map((category) => ({
        category,
        key: categoryKey(category),
        rows: filteredRows.filter((r) => r.category === category),
      })).filter((g) => g.rows.length > 0),
    [filteredRows],
  );

  // While a search/filter is active, force every category that still has a
  // match open — a result hidden behind a closed trigger would look like
  // "search found nothing." Clearing the filter returns control to
  // `openItems` (manual toggling), matching the wireframe's default state:
  // first category open, the rest closed.
  const accordionValue = isFiltering ? groups.map((g) => g.key) : openItems;

  return (
    <div>
      {/* sr-only <h2> — found via Lighthouse (DECISIONS.md): Radix's
          AccordionHeader always renders a bare <h3> (this version has no
          level-override prop), and this table is the only thing after the
          page's single <h1>, so every group's h3 was an invalid h1->h3
          skip. The visible section title already lives in app/sources/
          page.tsx's own copy above this component, so a second VISIBLE
          heading here would be redundant — this just gives the correct
          semantic h1->h2->h3 structure without changing what's on screen. */}
      <h2 className="sr-only">Source list</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-9"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources by title or category"
            aria-label="Search sources"
            className="pl-9 pr-3"
          />
        </div>
        <div className="relative sm:w-64">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DisplayCategory | "all")}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-9"
            aria-hidden
          />
        </div>
      </div>

      <p className="mt-3 text-[0.8125rem] leading-[1.4] font-medium text-neutral-10">
        Showing {filteredRows.length} of {rows.length} sources.
      </p>

      <div className="mt-4">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-neutral-6 bg-neutral-2 px-4 py-10 text-center">
            <p className="text-sm leading-[1.55] text-neutral-11">
              {"No sources match "}
              {query ? `“${query}”` : "this filter"}
              {categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}
              {". Try a different term, or widen the category filter."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryFilter("all");
              }}
              className="mt-3 text-sm font-medium text-accent-11 underline underline-offset-2 hover:text-accent-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <AccordionPrimitive.Root
            type="multiple"
            value={accordionValue}
            onValueChange={(value) => {
              if (!isFiltering) setOpenItems(value);
            }}
            className="flex flex-col gap-3"
          >
            {groups.map((group) => (
              <AccordionPrimitive.Item
                key={group.key}
                value={group.key}
                className="overflow-hidden rounded-lg border border-neutral-6 bg-neutral-1 shadow-elevation-1"
              >
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-neutral-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="truncate text-[1.0625rem] leading-[1.4] font-semibold text-neutral-12">
                        {group.category}
                      </span>
                      <Badge tone="neutral" appearance="subtle" className="shrink-0">
                        {group.rows.length}
                      </Badge>
                    </span>
                    <ChevronDown
                      className="h-4 w-4 flex-none text-neutral-9 transition-transform duration-150 ease-out group-data-[state=open]:rotate-180"
                      aria-hidden
                    />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:hidden">
                  <div className="flex flex-col px-4 pb-2 sm:px-5">
                    {group.rows.map((row) => (
                      <div key={row.url} className="flex items-start gap-2 py-1 sm:gap-3">
                        <Chip
                          border="none"
                          tone="neutral"
                          className="mt-2 shrink-0 px-2 py-0.5 text-[0.75rem] break-words whitespace-normal sm:mt-0"
                        >
                          {row.tag}
                        </Chip>
                        <SourceCitationChip
                          expanded
                          source={{ title: row.title, url: row.url, lastVerified: row.lastVerified }}
                          className="min-w-0 flex-1 flex-col items-start justify-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                        />
                      </div>
                    ))}
                  </div>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            ))}
          </AccordionPrimitive.Root>
        )}
      </div>
    </div>
  );
}
