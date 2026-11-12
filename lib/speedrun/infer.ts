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

function excerptAround(text: string, matchIndex: number, matchLength: number): string {
  // Expand to the containing sentence where reasonable, else a fixed window —
  // always truncated and always a direct substring, never paraphrased.
  const start = Math.max(0, text.lastIndexOf(".", matchIndex) + 1);
  const end = text.indexOf(".", matchIndex + matchLength);
  const sliceEnd = end === -1 ? Math.min(text.length, matchIndex + matchLength + 120) : end + 1;
  const raw = text.slice(start, sliceEnd).replace(/\s+/g, " ").trim();
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
  { kind: "clearance_level", value: "secret", pattern: /\b(?:active\s+)?secret clearance\b/i },
  {
    kind: "clearance_level",
    value: "clearance_required_unspecified",
    pattern: /\b(?:security clearance|active clearance|current clearance)\b/i,
  },
  { kind: "citizenship", value: "us_citizen_required", pattern: /\bmust be a\s+(?:u\.?s\.?|united states)\s+citizen\b|\bu\.?s\.?\s+citizenship required\b/i },
  { kind: "citizenship", value: "us_person_required", pattern: /\bu\.?s\.?\s+person\b|\bitar[- ]?(?:regulated|controlled|restricted)\b/i },
  { kind: "citizenship", value: "no_sponsorship", pattern: /\bno (?:visa )?sponsorship\b|\bunable to sponsor\b/i },
  { kind: "polygraph", value: "polygraph_required", pattern: /\bpolygraph\b/i },
  { kind: "facility_access", value: "scif_onsite", pattern: /\bscif\b/i },
];

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
  return signals;
}

/** Adds cautious, clearly-labeled inferred signals ONLY to fill gaps the stated
 * extraction left open — never contradicts or duplicates a stated signal. */
export function extractInferredSignals(
  descriptionText: string,
  stated: RequirementSignal[],
  context: { industry?: string | null; companyBlurb?: string | null },
): RequirementSignal[] {
  const inferred: RequirementSignal[] = [];
  const hasStated = (kind: RequirementKind) => stated.some((s) => s.kind === kind);

  const looksDefenseRelated =
    context.industry === "defense_space" ||
    /\bdefense\b|\bmilitary\b|\bmunitions\b|\bnational security\b/i.test(context.companyBlurb ?? "");

  if (looksDefenseRelated && !hasStated("citizenship")) {
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
  context: { industry?: string | null; companyBlurb?: string | null } = {},
): RequirementSignal[] {
  const stated = extractStatedSignals(descriptionText);
  const inferred = extractInferredSignals(descriptionText, stated, context);
  return [...stated, ...inferred];
}
