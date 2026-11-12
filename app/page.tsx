import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { InstallSnippet } from "@/components/install-snippet";
import { HowItWorks } from "@/components/how-it-works";
import { ToolCard } from "@/components/tool-card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { FaqAccordion } from "@/components/faq-accordion";
import { TOOL_REGISTRY } from "@/lib/tools/registry";

/**
 * Per-card display copy for the tools grid: each `blurb` is the tool's own
 * real `description` field (from lib/tools/*.ts) trimmed to one sentence for
 * card-sized reading, and each `fields` entry is a real key name taken
 * straight from that tool's own zod input/output schema — nothing here is
 * invented. Falls back to the tool's raw description if a name is ever
 * missing from this map, so a newly-registered tool still renders.
 */
const TOOL_CARD_META: Record<string, { blurb: string; fields: string[] }> = {
  explain_rule: {
    blurb:
      "Plain-English explanation of a clearance or export-control rule (ITAR, FCL sponsorship, SEAD 4/7, continuous vetting, and more) with primary-source links.",
    fields: ["topic", "sources", "disclaimer"],
  },
  estimate_timeline: {
    blurb:
      "Estimates how long reaching a target clearance level might realistically take, given current status — a real range where the data supports one, a single sourced figure where it doesn't, never an invented number.",
    fields: ["target_level", "current_status", "estimate"],
  },
  search_defense_roles: {
    blurb: "Searches live defense/hard-tech roles from the a16z speedrun Talent Network's public API.",
    fields: ["query", "clearance", "roles"],
  },
  verify_evidence: {
    blurb: "Summarizes a GitHub, GitLab, or Cosign profile's already-public signal via that platform's own public REST API only — no scraping, never used to rank candidates.",
    fields: ["github_username_or_url", "platform", "profile"],
  },
  get_company_profile: {
    blurb: "Published facts about a company plus computed work realities from its currently-open roles.",
    fields: ["company_slug", "criteria", "workRealities"],
  },
  build_trial_assessment: {
    blurb:
      "Generates an ITAR-safe, time-boxed work-sample exercise built only from a role's public posting text — never invented technical specifications.",
    fields: ["role_id", "minutes", "rubric"],
  },
  run_job_preview: {
    blurb: "Returns a complete “first week” realistic job preview script for your agent to run with you, scene by scene.",
    fields: ["role_id", "minutes", "scenes"],
  },
  get_role_rubric: {
    blurb: "An eligibility checklist and skills rubric for a role, built for your agent to evaluate privately.",
    fields: ["role_id", "eligibilityChecklist", "skillsRubric"],
  },
  readiness_brief: {
    blurb: "A structured brief template for your agent to fill in locally: eligibility, gaps, and a 2-week prep plan.",
    fields: ["role_id", "template", "questionsToAskTheRecruiter"],
  },
  fit_debrief: {
    blurb: "Turns loved/disliked work-reality tags into a summary template and concrete questions to ask the company.",
    fields: ["loved", "disliked", "shareDraft"],
  },
  prepare_consented_card: {
    blurb: "A fill-in intro card for only the fields you approve — your agent fills in your answers locally, so they never reach the server.",
    fields: ["role_id", "approved_fields", "cardTemplate"],
  },
  prepare_signed_attestation: {
    blurb:
      "Wraps a self-asserted claim (clearance level, citizenship status, or availability) in a credential your own agent signs locally — proves who signed it and when, never that the claim itself is true.",
    fields: ["claims", "signature_base64", "credential"],
  },
  contribute_anonymous_signal: {
    blurb:
      "Opts one role-interest into an anonymous, aggregated signal pool — no name, contact info, or identifier of any kind, only closed-enum buckets you explicitly choose to include.",
    fields: ["role_id", "contribution", "recorded"],
  },
  get_aggregated_signal: {
    blurb:
      "Reads that pool back as rounded percentages for a role or company — never an individual record, and never before at least 5 people have contributed (a k-anonymity floor).",
    fields: ["role_id", "company_slug", "percentages"],
  },
  generate_interview_guide: {
    blurb:
      "A structured interview guide for a startup's own human panel, built only from the posting — traced questions and evaluation anchors, never a candidate score.",
    fields: ["role_id", "minutes", "questions"],
  },
  verify_signed_attestation: {
    blurb:
      "The recipient's side of a signed attestation: checks it was really signed by the key it names and hasn't been altered — never that the claim is true.",
    fields: ["signed_payload", "signatureValid", "keyFingerprint"],
  },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <Hero />
        <InstallSnippet />
        <HowItWorks />

        <section id="tools" className="mx-auto max-w-[1120px] px-6 py-16 sm:py-20 lg:py-24">
          <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">Tools</h2>
          <p className="mt-2 max-w-2xl text-[0.875rem] leading-[1.55] text-neutral-11">
            Every tool below is live on the MCP server right now — call it by name from your agent, or try it without
            one in the playground.
          </p>
          <div className="mt-8 grid grid-cols-1 auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_REGISTRY.map((tool) => {
              const meta = TOOL_CARD_META[tool.name];
              return (
                <ToolCard
                  key={tool.name}
                  name={tool.name}
                  description={meta?.blurb ?? tool.description}
                  fields={meta?.fields ?? []}
                />
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] px-6 pb-16 sm:pb-20 lg:pb-24">
          <DisclaimerBanner href="/privacy" linkLabel="Privacy →">
            Clearance Lens is not legal advice and never touches DISS/NBIS/DCSA.
          </DisclaimerBanner>
        </section>

        <section className="mx-auto max-w-[1120px] px-6 pb-16 sm:pb-20 lg:pb-24">
          <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
            Frequently asked questions
          </h2>
          <div className="mt-6">
            <FaqAccordion />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
