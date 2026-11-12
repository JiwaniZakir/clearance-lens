/**
 * Requirement-signal extraction from a public job posting's description text.
 *
 * Spec requirement (search_defense_roles): "inferred requirements (labeled
 * inferred vs stated)". A `stated` signal always carries a verbatim excerpt
 * quoted directly from the posting — never paraphrased, so the user can judge
 * it themselves. An `inferred` signal is a pattern-based judgment call and
 * always says so explicitly, with a reason, and tells the user to confirm
 * directly with the employer. Nothing here is a clearance/eligibility
 * decision — it's just surfacing what the public text does and doesn't say.
 */

export type RequirementKind = "clearance_level" | "citizenship" | "polygraph" | "facility_access";
export type RequirementBasis = "stated" | "inferred";

export interface RequirementSignal {
  kind: RequirementKind;
  /** Short machine-friendly value, e.g. "ts_sci" | "secret" | "clearance_required_unspecified" | "us_person_likely" | "polygraph_likely" | "scif_onsite". */
  value: string;
  basis: RequirementBasis;
  /** `stated`: a verbatim quoted excerpt from the posting. `inferred`: the reasoning, always ending with a prompt to confirm directly. */
  evidence: string;
}

const MAX_EXCERPT_LENGTH = 220;

/**
 * Expand to the containing sentence/bullet-line where reasonable, else a
 * fixed window — always truncated and always a direct substring, never
 * paraphrased. Bounded by the NEARER of a period or a newline on each side,
 * not period alone: found live via the spec §5 agent-in-the-loop persona
 * eval (DECISIONS.md D-016/D-018) that real postings commonly format
 * requirements as newline-separated bullets with no trailing period on each
 * item — period-only boundary search then walks past the current bullet
 * entirely, either bleeding forward into unrelated later bullets (no period
 * to stop at) or backward into an unrelated earlier paragraph (the nearest
 * period could be several bullets/sections away). A bullet marker
 * ("- "/"• "/"* ") immediately after the start boundary is stripped so the
 * quoted excerpt reads as the requirement text itself, not the list syntax.
 */
function excerptAround(text: string, matchIndex: number, matchLength: number): string {
  const lastPeriod = text.lastIndexOf(".", matchIndex);
  const lastNewline = text.lastIndexOf("\n", matchIndex);
  const start = Math.max(0, lastPeriod, lastNewline) + 1;

  const searchFrom = matchIndex + matchLength;
  const nextPeriod = text.indexOf(".", searchFrom);
  const nextNewline = text.indexOf("\n", searchFrom);
  const candidates = [nextPeriod, nextNewline].filter((i) => i !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) : -1;
  const sliceEnd = end === -1 ? Math.min(text.length, searchFrom + 120) : end + 1;

  const raw = text
    .slice(start, sliceEnd)
    .replace(/^[\s\-•*]+/, "") // strip a leading bullet marker, not part of the requirement text itself
    .replace(/\s+/g, " ")
    .trim();
  return raw.length > MAX_EXCERPT_LENGTH ? `${raw.slice(0, MAX_EXCERPT_LENGTH - 1)}…` : raw;
}

interface StatedPattern {
  kind: RequirementKind;
  value: string;
  pattern: RegExp;
}

// Order matters within clearance_level: more specific levels first, so e.g.
// "Top Secret/SCI" is classified ts_sci rather than falling through to the
// bare "secret clearance" test matching nothing and a generic one firing instead.
const STATED_PATTERNS: StatedPattern[] = [
  { kind: "clearance_level", value: "ts_sci", pattern: /\btop secret\s*\/?\s*sci\b|\bts\s*\/\s*sci\b/i },
  { kind: "clearance_level", value: "ts", pattern: /\btop secret\b(?!\s*\/?\s*sci)/i },
  // "security" made optional between "secret" and "clearance": found live
  // via the spec §6 judging panel round 3 — "Secret security clearance" (a
  // common real phrasing) failed this pattern's old strict adjacency
  // requirement, falling through to only the generic
  // clearance_required_unspecified fallback below instead of "secret".
  // `(?<!top )` added: found live via round 4 — that same widening made
  // this pattern ALSO match inside "Top Secret security clearance" (a
  // literal substring starting at "Secret"), double-counting one phrase as
  // both "ts" and "secret" with identical evidence text — the exact
  // redundant-signal bug D-028 already fixed once for ts+unspecified,
  // reintroduced here between ts+secret instead.
  {
    kind: "clearance_level",
    value: "secret",
    pattern: /\b(?:active\s+)?(?<!top )secret (?:security\s+)?clearance\b/i,
  },
  {
    kind: "clearance_level",
    value: "clearance_required_unspecified",
    pattern: /\b(?:security clearance|active clearance|current clearance)\b/i,
  },
  // "us_citizen_required" excludes the case where "citizen" is itself one
  // branch of a broader citizen/national/permanent-resident disjunction —
  // found live via the spec §5 agent-in-the-loop eval (DECISIONS.md D-016/
  // D-018): "must be a citizen, national, or lawful permanent resident" is
  // the ITAR "US person" test (22 CFR 120.62) stated in its own words, not a
  // citizen-only requirement, and was being misclassified as the narrower
  // category. "us_person_required" below now also matches that disjunction
  // directly, in either order.
  {
    kind: "citizenship",
    value: "us_citizen_required",
    pattern: /\bmust be a\s+(?:u\.?s\.?|united states)\s+citizen\b(?!.{0,60}?\b(?:national|permanent resident)\b)|\bu\.?s\.?\s+citizenship required\b/i,
  },
  {
    kind: "citizenship",
    value: "us_person_required",
    pattern:
      /\bu\.?s\.?\s+person\b|\bitar[- ]?(?:regulated|controlled|restricted)\b|\bcitizen\b.{0,40}?\b(?:national|permanent resident)\b|\b(?:national|permanent resident)\b.{0,40}?\bcitizen\b/i,
  },
  { kind: "citizenship", value: "no_sponsorship", pattern: /\bno (?:visa )?sponsorship\b|\bunable to sponsor\b/i },
  { kind: "polygraph", value: "polygraph_required", pattern: /\bpolygraph\b/i },
  { kind: "facility_access", value: "scif_onsite", pattern: /\bscif\b/i },
];

// Specific clearance levels whose detection makes the generic
// "clearance_required_unspecified" fallback redundant — found live via the
// spec §6 judging panel round 2 (DECISIONS.md): "an active Top Secret
// security clearance" independently matches BOTH the `ts` pattern (via
// "Top Secret") AND the `clearance_required_unspecified` pattern (via
// "security clearance"), citing the same evidence quote twice as if they
// were two distinct, possibly-conflicting requirements rather than one.
const SPECIFIC_CLEARANCE_LEVELS = new Set(["ts_sci", "ts", "secret"]);

export function extractStatedSignals(descriptionText: string): RequirementSignal[] {
  const signals: RequirementSignal[] = [];
  const seenValues = new Set<string>();
  for (const { kind, value, pattern } of STATED_PATTERNS) {
    const match = pattern.exec(descriptionText);
    if (match && !seenValues.has(value)) {
      seenValues.add(value);
      signals.push({
        kind,
        value,
        basis: "stated",
        evidence: excerptAround(descriptionText, match.index, match[0].length),
      });
    }
  }
  // Drop the generic fallback once a specific level is already present —
  // a specific level IS a security clearance, so the unspecified signal
  // adds no information and reads as a second, redundant requirement.
  if (signals.some((s) => s.kind === "clearance_level" && SPECIFIC_CLEARANCE_LEVELS.has(s.value))) {
    return signals.filter((s) => s.value !== "clearance_required_unspecified");
  }
  return signals;
}

// Found live via the spec §6 judging panel round 2 (DECISIONS.md): a real
// Anduril posting based in Sydney, Australia (asking for an Australian NV2
// clearance, not a US one) was tagged with the same inferred
// "us_person_likely" ITAR flag this function applies to domestic roles —
// ITAR's "US person" test (22 CFR 120.62) is a US-law-specific concept
// that doesn't straightforwardly apply to a role explicitly based abroad.
// Deliberately conservative: a short, curated list of countries where an
// a16z-portfolio defense-tech company plausibly has a real office (not an
// attempt at general geography parsing, which free-text location strings
// don't support reliably), checked against BOTH the location field and
// the description text (which is how the Australian NV2 mention itself
// was found — a foreign clearance-system name is a stronger, more direct
// signal than the location string alone).
const NON_US_LOCATION_SIGNAL =
  /\b(?:australia|sydney|melbourne|canberra|united kingdom|\buk\b|london|canada|toronto|ottawa|germany|berlin|munich|japan|tokyo|singapore|new zealand)\b/i;
const FOREIGN_CLEARANCE_SYSTEM =
  /\b(?:nv1|nv2|baseline clearance|negative vetting|positive vetting|\bsc clearance\b|\bdv clearance\b|developed vetting)\b/i;

/** Adds cautious, clearly-labeled inferred signals ONLY to fill gaps the stated
 * extraction left open — never contradicts or duplicates a stated signal. */
export function extractInferredSignals(
  descriptionText: string,
  stated: RequirementSignal[],
  context: { industry?: string | null; companyBlurb?: string | null; location?: string | null },
): RequirementSignal[] {
  const inferred: RequirementSignal[] = [];
  const hasStated = (kind: RequirementKind) => stated.some((s) => s.kind === kind);

  const looksDefenseRelated =
    context.industry === "defense_space" ||
    /\bdefense\b|\bmilitary\b|\bmunitions\b|\bnational security\b/i.test(context.companyBlurb ?? "");

  const looksNonUs =
    NON_US_LOCATION_SIGNAL.test(context.location ?? "") || FOREIGN_CLEARANCE_SYSTEM.test(descriptionText);

  if (looksDefenseRelated && !hasStated("citizenship") && !looksNonUs) {
    inferred.push({
      kind: "citizenship",
      value: "us_person_likely",
      basis: "inferred",
      evidence:
        "This posting is in the defense_space industry but doesn't explicitly state a citizenship requirement. US defense contractors commonly require US-person status under ITAR (22 CFR 120.62) even when the posting is silent on it. Not stated here — confirm directly with the employer before assuming either way.",
    });
  }

  if (looksDefenseRelated && !hasStated("clearance_level") && /\bgovernment\b|\bdod\b|\bclassified\b/i.test(descriptionText)) {
    inferred.push({
      kind: "clearance_level",
      value: "clearance_possibly_required",
      basis: "inferred",
      evidence:
        "This posting mentions government/DoD/classified work but doesn't state a specific clearance requirement. Some roles on a program like this require a clearance even when the individual posting doesn't say so (it may be added at the offer stage). Not stated here — ask the recruiter directly.",
    });
  }

  return inferred;
}

export function extractRequirementSignals(
  descriptionText: string,
  context: { industry?: string | null; companyBlurb?: string | null; location?: string | null } = {},
): RequirementSignal[] {
  const stated = extractStatedSignals(descriptionText);
  const inferred = extractInferredSignals(descriptionText, stated, context);
  return [...stated, ...inferred];
}
