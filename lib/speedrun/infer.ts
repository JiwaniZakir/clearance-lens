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

/** For a clearance signal, WHEN the posting needs it — the difference that
 *  tells a new grad whether they can apply at all. Found via the spec §6
 *  judging panel round 9: "Eligible to obtain and maintain an active Top
 *  Secret clearance" (no clearance needed to apply) was being reported as a
 *  bare "Top Secret security clearance". Absent when the sentence doesn't say. */
export type ClearanceStage = "must_already_hold" | "must_be_able_to_obtain" | "may_be_required";

export interface RequirementSignal {
  kind: RequirementKind;
  /** Short machine-friendly value, e.g. "ts_sci" | "secret" | "clearance_required_unspecified" | "us_person_likely" | "polygraph_likely" | "scif_onsite". */
  value: string;
  basis: RequirementBasis;
  /** `stated`: a verbatim quoted excerpt from the posting. `inferred`: the reasoning, always ending with a prompt to confirm directly. */
  evidence: string;
  clearanceStage?: ClearanceStage;
}

const MAX_EXCERPT_LENGTH = 300;

/** Words whose trailing period belongs to the word, not the sentence. Found
 *  via the spec §6 judging panel round 9: 41 of 119 "stated" quotes (34%)
 *  were cut mid-sentence at an abbreviation — "Must be a U.S. Person due to
 *  required access to U." — because any "." counted as a sentence end. */
const ABBREVIATIONS = new Set([
  "u.s", "u.s.a", "u.s.c", "e.g", "i.e", "etc", "vs", "approx", "inc", "co", "corp", "ltd", "llc", "jr", "sr",
  "dr", "mr", "mrs", "ms", "no", "st", "dept", "gov", "govt", "a.m", "p.m", "ph.d", "b.s", "m.s", "b.a", "m.a",
  "sec", "fig", "min", "max", "est", "int'l", "nat'l",
]);

/** A "." ends a sentence only if whitespace (or the end) follows, the next
 *  word doesn't start lowercase, and the word it closes isn't an
 *  abbreviation or a single initial ("J."). */
function isSentenceEnd(text: string, i: number): boolean {
  if (text[i] !== ".") return false;
  const next = text[i + 1];
  if (next !== undefined && !/\s/.test(next)) return false;
  const after = text.slice(i + 1).match(/^\s*(\S)/);
  if (after && /[a-z]/.test(after[1])) return false;
  let j = i - 1;
  while (j >= 0 && !/[\s(\[\/"'“]/.test(text[j])) j--;
  const word = text.slice(j + 1, i).toLowerCase();
  if (ABBREVIATIONS.has(word)) return false;
  if (/^[a-z]$/.test(word)) return false;
  return true;
}

function sentenceStart(text: string, from: number): number {
  for (let i = from - 1; i >= 0; i--) {
    if (text[i] === "\n" || isSentenceEnd(text, i)) return i + 1;
  }
  return 0;
}

function sentenceEnd(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === "\n") return i;
    if (isSentenceEnd(text, i)) return i + 1;
  }
  return text.length;
}

/** The whole sentence/bullet containing a match — used both for the quoted
 *  excerpt and for reading qualifiers like "eligible to obtain". */
function sentenceAround(text: string, matchIndex: number, matchLength: number): { sentence: string; matchOffset: number } {
  const start = sentenceStart(text, matchIndex);
  const end = sentenceEnd(text, matchIndex + matchLength);
  const raw = text.slice(start, end);
  const lead = raw.match(/^[\s\-•*]+/)?.[0].length ?? 0; // a leading bullet marker isn't part of the requirement text
  return { sentence: raw.slice(lead), matchOffset: matchIndex - start - lead };
}

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
  const { sentence, matchOffset } = sentenceAround(text, matchIndex, matchLength);
  const flat = sentence.replace(/\s+/g, " ").trim();
  if (flat.length <= MAX_EXCERPT_LENGTH) return flat;
  // A long sentence is windowed around the match rather than cut from its
  // start, so the matched requirement itself is never the part dropped.
  const from = Math.max(0, Math.min(matchOffset - 100, flat.length - MAX_EXCERPT_LENGTH));
  const window = flat.slice(from, from + MAX_EXCERPT_LENGTH - 2).trim();
  return `${from > 0 ? "…" : ""}${window}${from + MAX_EXCERPT_LENGTH - 2 < flat.length ? "…" : ""}`;
}

const OBTAIN_QUALIFIER =
  /\b(?:abl\w*|abilit\w*|eligib\w*|willing\w*|capable)\b[^.]{0,40}?\b(?:obtain|acquire|attain|get|be granted)\b|\bobtain and maintain\b|\bclearable\b|\beligib\w*\s+for\b[^.]{0,30}\bclearance\b/i;
const MAY_QUALIFIER =
  /\bmay\s+(?:be\s+)?(?:require|need)\w*|\bdepending on\b|\bif required\b|\bpreferred\b|\bnice to have\b|\ba plus\b|\bbonus\b|\bdesired\b|\bdesirable\b/i;
const HOLD_QUALIFIER =
  /\b(?:active|current|existing|in-place|interim)\b[^.]{0,40}?\bclearance\b|\bmust\s+(?:have|hold|possess|currently)\b|\bcurrently\s+hold|\brequired to start\b|\bday one\b/i;

/** Reads the sentence's own qualifier. "Obtain" outranks "active"
 *  ("obtain and maintain an active Secret clearance" needs no clearance to
 *  apply), and "preferred"/"may" outranks "active" ("active TS preferred"). */
function clearanceStageOf(sentence: string): ClearanceStage | undefined {
  if (OBTAIN_QUALIFIER.test(sentence)) return "must_be_able_to_obtain";
  if (MAY_QUALIFIER.test(sentence)) return "may_be_required";
  if (HOLD_QUALIFIER.test(sentence)) return "must_already_hold";
  return undefined;
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
  // The common "TS clearance" abbreviation — found while writing the D-046
  // tests: "Must hold an active TS clearance" produced no clearance signal at
  // all. Case-sensitive on purpose (no `i` flag) so "ts" inside ordinary text
  // can't match; only a standalone "TS" within a few words of "clearance".
  { kind: "clearance_level", value: "ts", pattern: /\bTS\b(?!\s*\/\s*SCI)(?=[^.\n]{0,25}\b[Cc]learance\b)/ },
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
  // "clearance eligibility"/"clearable" added: found via the spec §6 judging
  // panel round 9 — "U.S. clearance eligibility may be required depending on
  // program" produced no clearance signal at all.
  {
    kind: "clearance_level",
    value: "clearance_required_unspecified",
    pattern: /\b(?:security clearance|active clearance|current clearance|clearance eligibility|clearable)\b/i,
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
      const signal: RequirementSignal = {
        kind,
        value,
        basis: "stated",
        evidence: excerptAround(descriptionText, match.index, match[0].length),
      };
      if (kind === "clearance_level") {
        const stage = clearanceStageOf(sentenceAround(descriptionText, match.index, match[0].length).sentence);
        if (stage) signal.clearanceStage = stage;
        // "Clearance may be required" is not "clearance required".
        if (value === "clearance_required_unspecified" && stage === "may_be_required") signal.value = "clearance_may_be_required";
      }
      signals.push(signal);
    }
  }
  // Drop the generic fallback once a specific level is already present —
  // a specific level IS a security clearance, so the unspecified signal
  // adds no information and reads as a second, redundant requirement.
  if (signals.some((s) => s.kind === "clearance_level" && SPECIFIC_CLEARANCE_LEVELS.has(s.value))) {
    return signals.filter((s) => s.value !== "clearance_required_unspecified" && s.value !== "clearance_may_be_required");
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
// "\bgb\b" added: found live via the spec §6 judging panel round 5
// (candidate_user) — a real UK posting's location field used the ISO
// country code form ("Newcastle, GB"), not a spelled-out country/city name,
// so the existing checks (which required "united kingdom" or bare "uk")
// missed it. Scoped to the location field specifically (this regex is never
// run against free-form description text, only `context.location`), where
// a bare 2-letter token colliding with something unrelated (e.g. "16GB" in
// a spec sheet) isn't a realistic risk.
const NON_US_LOCATION_SIGNAL =
  /\b(?:australia|sydney|melbourne|canberra|united kingdom|\buk\b|\bgb\b|london|canada|toronto|ottawa|germany|berlin|munich|japan|tokyo|singapore|new zealand)\b/i;
const FOREIGN_CLEARANCE_SYSTEM =
  /\b(?:nv1|nv2|baseline clearance|negative vetting|positive vetting|\bsc clearance\b|\bdv clearance\b|developed vetting)\b/i;

/** Exported so other modules (e.g. role-shared.ts's clearance-level filter
 *  matching) can share this one geography check rather than re-implement
 *  their own — see the regexes' own comments above for why this is
 *  deliberately a short, curated allowlist, not general geography parsing. */
export function looksNonUsLocation(location: string | null | undefined): boolean {
  return NON_US_LOCATION_SIGNAL.test(location ?? "");
}

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

  const looksNonUs = looksNonUsLocation(context.location) || FOREIGN_CLEARANCE_SYSTEM.test(descriptionText);

  // Found via the spec §6 judging panel round 9 (4 of 4 judges): a stated
  // clearance requirement was never connected to citizenship, so a green
  // card holder was told only that a role "likely" needed U.S.-person status
  // — which they have — on roles that require a clearance they can't hold.
  // A U.S. clearance requires U.S. citizenship (EO 12968 § 3.1(b); 32 CFR
  // 117.10(k)); a green card satisfies ITAR, not this. That's a rule of law
  // applied to what the posting states, so it's labeled inferred, with the
  // reason, rather than presented as a quote.
  const clearanceSignals = stated.filter((s) => s.kind === "clearance_level");
  const statesCitizenOnly = stated.some((s) => s.value === "us_citizen_required");
  const addsClearanceCitizenship = clearanceSignals.length > 0 && !statesCitizenOnly && !looksNonUs;
  if (addsClearanceCitizenship) {
    const onlyMaybe = clearanceSignals.every((s) => s.clearanceStage === "may_be_required");
    inferred.push({
      kind: "citizenship",
      value: "us_citizen_required_for_clearance",
      basis: "inferred",
      evidence:
        (onlyMaybe
          ? "This posting says a U.S. security clearance may be required. If it is, clearances are limited to U.S. citizens"
          : "This posting asks for a U.S. security clearance, and clearances are limited to U.S. citizens") +
        " (Executive Order 12968 § 3.1(b); 32 CFR 117.10(k)). A green card makes someone a U.S. person under ITAR, but not clearance-eligible — the only exception for a non-citizen, a Limited Access Authorization, is rare, contract-specific, and never valid for TOP SECRET. Inferred from the clearance requirement, not stated in the posting — confirm with the employer.",
    });
  }

  // Citizenship already covers U.S.-person status, so the weaker ITAR
  // inference would only repeat it.
  if (looksDefenseRelated && !hasStated("citizenship") && !looksNonUs && !addsClearanceCitizenship) {
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
        "This posting mentions government/DoD/classified work but doesn't state a specific clearance requirement. Some roles on a program like this require a clearance even when the individual posting doesn't say so (it may be added at the offer stage). If one is required, clearances are limited to U.S. citizens (32 CFR 117.10(k)) — a green card is not enough. Not stated here — ask the recruiter directly.",
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
