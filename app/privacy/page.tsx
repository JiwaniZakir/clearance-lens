import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { scanValueForPiiCui, buildFriendlyRejectionMessage, type PiiCategory } from "@/lib/guard/pii";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Clearance Lens receives, stores, refuses, and logs. Stateless by design: no account, no database, no PII.",
};

/**
 * Plain-language description of each REAL rejection category from
 * lib/guard/pii.ts's `PiiCategory` union — typed as `Record<PiiCategory, …>`
 * so this list can't silently go stale: if pii.ts ever adds an 8th
 * category, `tsc --noEmit` fails here until this page is updated too.
 */
const REFUSAL_CATEGORIES: Record<PiiCategory, string> = {
  ssn: "Social Security numbers",
  dob: "Dates of birth",
  passport: "Passport or other government ID document numbers",
  case_number: "Investigation or case numbers (e.g. an OPM, e-QIP, or DCSA case ID)",
  clearance_record: "Clearance record or adjudication-system text (e.g. a DISS, JPAS, or NBIS record)",
  image_upload: "Image uploads or screenshots of any kind",
  binary_data: "Embedded files or other binary data",
  unscannable_structure: "Requests structured too deeply (nested many levels deep) for us to safely check",
  credit_card: "Credit or debit card numbers",
};

// A real-shaped request to explain_rule's actual input field ("topic"),
// run through the REAL guard function below — not a paraphrased mock-up —
// so the worked example on this page is guaranteed to show byte-for-byte
// what the running system actually produces.
const EXAMPLE_REQUEST_BODY = { topic: "123-45-6789 is my SSN, am I eligible?" };
const exampleFindings = scanValueForPiiCui(EXAMPLE_REQUEST_BODY);

if (exampleFindings.length !== 1 || exampleFindings[0].category !== "ssn") {
  // Fail fast (same philosophy as lib/rules-data.ts's own import-time
  // parse) rather than let this page silently show a stale or wrong
  // worked example if lib/guard/pii.ts's detection logic ever changes.
  throw new Error(
    "app/privacy/page.tsx's worked PII example no longer matches lib/guard/pii.ts's real output for this input — update the example or the copy around it.",
  );
}

// This mirrors exactly what app/api/tools/[name]/route.ts returns: callTool
// catches the thrown PiiCuiError and responds
// `{ ok: false, error: { code: "pii_cui_rejected", message } }` at HTTP 400
// (see lib/tools/wrap.ts's STATUS_BY_CODE / callTool).
const EXAMPLE_RESPONSE_BODY = {
  ok: false as const,
  error: {
    code: "pii_cui_rejected" as const,
    message: buildFriendlyRejectionMessage(exampleFindings),
  },
};

const EXAMPLE_BLOCK = [
  "POST /api/tools/explain_rule",
  JSON.stringify(EXAMPLE_REQUEST_BODY),
  "",
  "→ 400",
  JSON.stringify(EXAMPLE_RESPONSE_BODY, null, 2),
].join("\n");

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      {/* One narrow column, ~680px max-width, left-aligned, no sidebar — no
          disclaimer-banner wrapper here, the whole page already is the
          disclaimer (R2 §5's own note; Do/Don't #3). */}
      <main id="main-content" className="mx-auto w-full max-w-[680px] flex-1 px-6 py-16 sm:py-20">
        <h1 className="text-[1.875rem] leading-[1.25] font-semibold tracking-[-0.005em] text-neutral-12">Privacy</h1>
        <p className="mt-3 text-[1.125rem] leading-[1.6] text-neutral-11">
          Stateless by design. No account, no database, no PII.
        </p>

        <section className="mt-10">
          <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
            What we receive
          </h2>
          <p className="mt-3 text-base leading-[1.6] text-neutral-11">
            {
              "A role ID, a rule topic, or fields you explicitly listed to include on a share card (for example a headline, availability, or a self-reported clearance/citizenship status). Nothing else — each tool call sends exactly the one small, specific input that tool needs, never everything your agent happens to know about you."
            }
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
            What we store
          </h2>
          <p className="mt-3 text-base leading-[1.6] text-neutral-11">
            {
              "Nothing. There is no database of users, accounts, or past queries — every request is handled and immediately forgotten. The only thing that persists on this server at all is the public rules and timelines data every visitor can already see on "
            }
            <Link href="/sources" className="text-accent-11 underline underline-offset-2 hover:text-accent-10">
              Sources
            </Link>
            {"."}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
            What we refuse
          </h2>
          <p className="mt-3 text-base leading-[1.6] text-neutral-11">
            {
              "Every tool call is scanned before anything else happens — before validation, before any handler runs. If it looks like it contains any of the following, the request is rejected with a plain-language explanation, never a security-alert tone:"
            }
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-[1.6] text-neutral-11">
            {Object.entries(REFUSAL_CATEGORIES).map(([key, label]) => <li key={key}>{label}</li>)}
          </ul>
          <p className="mt-4 text-base leading-[1.6] text-neutral-11">
            {
              "Here is a real, worked example — the exact request shape and the exact response our code returns for it, not a paraphrase:"
            }
          </p>
          {/* tabIndex/aria-label: same scrollable-region-focusable fix as
              components/install-snippet.tsx (DECISIONS.md) — overflow-x-auto
              with no way for a keyboard-only user to reach and scroll it. */}
          <pre
            tabIndex={0}
            aria-label="Example request and response"
            className="mt-3 overflow-x-auto rounded-lg border border-neutral-6 bg-neutral-2 p-4 text-[0.8125rem] leading-[1.5] text-neutral-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
          >
            <code className="font-mono whitespace-pre-wrap break-words">{EXAMPLE_BLOCK}</code>
          </pre>
        </section>

        <section className="mt-8">
          <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
            What we log
          </h2>
          <p className="mt-3 text-base leading-[1.6] text-neutral-11">
            {
              "Only failures are logged, and only as metadata: the tool's name and a short, fixed error category (for example, an upstream data source timing out) — timestamped automatically by our hosting platform's own log pipeline, not by us recording a clock reading next to your input. Request bodies and free-text input are never logged, and a successful call leaves no record of what you asked at all."
            }
          </p>
        </section>

        <p className="mt-10 border-t border-neutral-6 pt-6 text-sm leading-[1.6] text-neutral-11">
          {DISCLAIMERS.neverVerifiesClearance}
          {
            " That restraint is also what keeps this product ITAR-safe end to end: every tool runs only on public role postings, public rules, and whatever you chose to share — never on export-controlled technical data."
          }
        </p>
      </main>
      <Footer />
    </div>
  );
}
