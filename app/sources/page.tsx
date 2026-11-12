import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SourcesTable, type SourceRow, type DisplayCategory } from "@/components/sources-table";
import { RULES, RULES_LAST_VERIFIED, type RuleEntry } from "@/lib/rules-data";
import { TIMELINES, TIMELINES_LAST_VERIFIED } from "@/lib/timelines-data";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "Every rule, timeline figure, and citation behind Clearance Lens — primary-source links and last-verified dates, nothing hand-copied.",
};

function displayCategoryForRule(category: RuleEntry["category"]): DisplayCategory {
  switch (category) {
    case "itar":
      return "ITAR & export control";
    // Everything else is "how the clearance process itself works" —
    // eligibility criteria, process steps, sponsorship, reciprocity,
    // continuous vetting, and the verification-tech survey all land in the
    // one remaining process bucket from R2 §5's category list.
    case "eligibility":
    case "clearance-process":
    case "sponsorship":
    case "reciprocity":
    case "continuous-vetting":
    case "verification-tech":
      return "Clearance process & timelines";
    default: {
      // Exhaustiveness guard: if RuleCategorySchema ever gains a new
      // category, this fails tsc at build time instead of silently
      // dropping its sources from the page.
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}

/**
 * Pulled directly from the typed, validated accessors (lib/rules-data.ts,
 * lib/timelines-data.ts) rather than hand-copied, so this list can't drift
 * from data/rules.json / data/timelines.json (see PLAN.md's own note on
 * this page). Deduplicated by URL: several rules and timeline modifiers
 * cite the exact same primary document (e.g. the SEAD 7 text, or the
 * Trusted Workforce 2.0 quarterly report) — each unique source still
 * appears exactly once, just tagged with whichever rule/modifier id first
 * introduced it, rather than once per citing rule.
 */
function ruleAndTimelineRows(): SourceRow[] {
  const rows: SourceRow[] = [];

  for (const rule of RULES) {
    const category = displayCategoryForRule(rule.category);
    for (const source of rule.sources) {
      rows.push({ title: source.title, url: source.url, lastVerified: source.lastVerified, tag: rule.id, category });
    }
  }

  for (const level of ["secret", "ts"] as const) {
    const stats = TIMELINES.investigations[level];
    rows.push({
      title: stats.source.title,
      url: stats.source.url,
      lastVerified: stats.source.lastVerified,
      tag: `investigations.${level}`,
      category: "Clearance process & timelines",
    });
  }

  for (const modifier of TIMELINES.modifiers) {
    rows.push({
      title: modifier.source.title,
      url: modifier.source.url,
      lastVerified: modifier.source.lastVerified,
      tag: modifier.id,
      category: "Clearance process & timelines",
    });
  }

  const seen = new Map<string, SourceRow>();
  for (const row of rows) {
    if (!seen.has(row.url)) seen.set(row.url, row);
  }
  return [...seen.values()];
}

/**
 * research/jit/bias-compliance-law.md had already landed (6 numbered items,
 * "Verification date (all 6 items below): 2026-11-11" per that file's own
 * header) by the time this page was built, so its citations are folded in
 * here per the build brief. Each row uses the item's own stated PRIMARY/
 * authoritative source; the doc's secondary news write-ups (Law360,
 * Bloomberg Law commentary on Mobley v. Workday) are corroboration, not a
 * separate citation, so they're intentionally not duplicated as rows here.
 * If that research file is ever deleted, delete this array too — don't
 * leave invented placeholder citations in its place.
 */
const HIRING_COMPLIANCE_ROWS: SourceRow[] = [
  {
    category: "Hiring compliance & bias law",
    tag: "42 U.S.C. §2000e-2(k)",
    title: "Title VII disparate-impact doctrine (42 U.S.C. § 2000e-2(k))",
    url: "https://www.law.cornell.edu/uscode/text/42/2000e-2",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "E.O. 14281",
    title: 'E.O. 14281, "Restoring Equality of Opportunity and Meritocracy" (Apr. 23, 2025)',
    url: "https://www.govinfo.gov/content/pkg/FR-2025-04-28/html/2025-07378.htm",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "EEOC AI guidance",
    title: "EEOC's 2023 AI adverse-impact guidance — archived mirror (removed from eeoc.gov Jan. 2025)",
    url: "https://data.aclum.org/storage/2025/01/EOCC_www_eeoc_gov_laws_guidance_select-issues-assessing-adverse-impact-software-algorithms-and-artificial.pdf",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "NYC Local Law 144",
    title: "NYC Local Law 144 — automated employment decision tools",
    url: "https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "IL P.A. 103-0804",
    title:
      "Illinois AI hiring-notice law, Public Act 103-0804 — secondary-corroborated; primary statute text not independently re-confirmed this pass",
    url: "https://www.ilga.gov/Legislation/PublicActs/View/103-0804",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "CO SB 26-189",
    title: "Colorado automated decision-making law, SB 26-189 (replaces the repealed SB 24-205) — effective Jan. 1, 2027, still contested",
    url: "https://leg.colorado.gov/bills/SB26-189",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "EU AI Act Annex III",
    title: "EU AI Act, Annex III point 4 — hiring/employment AI classified high-risk",
    url: "https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "Digital Omnibus",
    title: "EU AI Act — Digital Omnibus delay of the high-risk compliance deadline to Dec. 2, 2027",
    url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "Mobley v. Workday",
    title: "Mobley v. Workday — court docket, N.D. Cal. No. 3:23-cv-00770-RFL",
    url: "https://www.pacermonitor.com/public/case/47898981/Mobley_v_WORKDAY,_INC",
    lastVerified: "2026-11-11",
  },
  {
    category: "Hiring compliance & bias law",
    tag: "Mobley v. Workday",
    title: "Mobley v. Workday — case tracker, Civil Rights Litigation Clearinghouse (Univ. of Michigan Law)",
    url: "https://clearinghouse.net/case/44074/",
    lastVerified: "2026-11-11",
  },
];

/**
 * research/R5-assessment-science.md's own "Sources" section — these back
 * build_trial_assessment / run_job_preview and are real, already-verified
 * citations even though they live in a research doc, not a JSON data file.
 * R5 states no explicit verification date for this list, so none is
 * invented here (lastVerified is left undefined; the row/chip render
 * without a "verified" date rather than fabricate one).
 */
const ASSESSMENT_SCIENCE_ROWS: SourceRow[] = [
  {
    category: "Assessment science",
    tag: "Sackett et al. 2022",
    title: "Sackett, Zhang, Berry & Lievens (2022) — Revisiting meta-analytic estimates of validity in personnel selection",
    url: "https://gwern.net/doc/statistics/meta-analysis/2021-sackett.pdf",
  },
  {
    category: "Assessment science",
    tag: "Sackett et al. 2023",
    title: "Sackett, Zhang, Berry & Lievens (2023) — Revisiting the design of selection systems",
    url: "https://www.cambridge.org/core/journals/industrial-and-organizational-psychology/article/revisiting-the-design-of-selection-systems-in-light-of-new-findings-regarding-the-validity-of-widely-used-predictors/A20984B138319E3D432E643978BF026D",
  },
  {
    category: "Assessment science",
    tag: "Premack & Wanous 1985",
    title: "Premack & Wanous (1985) — A meta-analysis of realistic job preview experiments",
    url: "https://www.researchgate.net/publication/232556638_A_Meta-Analysis_of_Realistic_Job_Preview_Experiments",
  },
  {
    category: "Assessment science",
    tag: "Earnest et al. 2011",
    title: "Earnest, Allen & Landis (2011) — Mechanisms linking realistic job previews with turnover",
    url: "https://stevenmbrownportfolio.weebly.com/uploads/1/7/4/6/17469871/earnest_et_al._2011_rjp.pdf",
  },
  {
    category: "Assessment science",
    tag: "Campion et al. 1997",
    title: "Campion, Palmer & Campion (1997) — A review of structure in the selection interview",
    url: "https://core.ac.uk/download/234763785.pdf",
  },
  {
    category: "Assessment science",
    tag: "Callinan & Robertson 2000",
    title: "Callinan & Robertson (2000) — Work sample testing",
    url: "https://doi.org/10.1111/1468-2389.00154",
  },
  {
    category: "Assessment science",
    tag: "BARS guide",
    title: "PeopleManagingPeople — Behaviorally Anchored Rating Scale: Expert Guide (illustrative, not a primary research source)",
    url: "https://peoplemanagingpeople.com/performance-management/behaviorally-anchored-rating-scale/",
  },
];

export default function SourcesPage() {
  const rows: SourceRow[] = [...ruleAndTimelineRows(), ...HIRING_COMPLIANCE_ROWS, ...ASSESSMENT_SCIENCE_ROWS];
  const lastVerified = RULES_LAST_VERIFIED > TIMELINES_LAST_VERIFIED ? RULES_LAST_VERIFIED : TIMELINES_LAST_VERIFIED;

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16 sm:py-20">
        <h1 className="text-[1.875rem] leading-[1.25] font-semibold tracking-[-0.005em] text-neutral-12">Sources</h1>
        <p className="mt-2 text-[0.8125rem] leading-[1.4] font-medium text-neutral-10">
          {rows.length} sources · last verified {lastVerified}
        </p>

        <div className="mt-8">
          <SourcesTable rows={rows} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
