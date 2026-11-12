/**
 * PII / CUI input guard.
 *
 * Hard constraint (spec §1.1): this server is stateless and must never receive,
 * store, or log PII, clearance case details, or image uploads. This module is the
 * enforcement point — every MCP tool call and every /api/tools/* playground call
 * runs its raw input through `assertNoPiiCui` before anything else happens.
 *
 * Design principle: when a detector is ambiguous, prefer a false positive (reject
 * a benign request with a friendly explanation) over a false negative (let real
 * PII through). A rejected request costs the user one rephrase; a leaked SSN does
 * not get un-leaked. See tests/unit/pii.test.ts for the ~50+ case suite this is
 * calibrated against, including the tricky phone-number-vs-SSN cases.
 */

export type PiiCategory =
  | "ssn"
  | "dob"
  | "passport"
  | "case_number"
  | "clearance_record"
  | "image_upload"
  | "binary_data"
  | "unscannable_structure"
  | "credit_card"
  | "classification_marking";

export interface PiiFinding {
  category: PiiCategory;
  /** Friendly, user-facing explanation. Never echoes the matched text. */
  message: string;
}

const FRIENDLY_BY_CATEGORY: Record<PiiCategory, string> = {
  ssn: "This looks like it includes a Social Security Number. Clearance Lens never accepts SSNs — please remove it. Your own agent already knows your details privately; just describe your situation in general terms (e.g. \"I'm a US citizen\").",
  dob: "This looks like it includes a date of birth. Clearance Lens never accepts dates of birth — please remove it and continue without it.",
  passport: "This looks like it includes a passport number. Clearance Lens never accepts passport or ID document numbers — please remove it. If citizenship status matters, just state it in general terms (e.g. \"green card holder\").",
  case_number: "This looks like it includes an investigation or case number (e.g. an OPM/e-QIP/DCSA case ID). Clearance Lens never accepts these — please remove it.",
  clearance_record: "This looks like it includes clearance record or adjudication-system text (e.g. a DISS/JPAS/NBIS record). Clearance Lens never accepts clearance record text or screenshots — recruiters must verify clearance through an FSO, not self-reported record text. Please remove it.",
  image_upload: "Clearance Lens does not accept image uploads or screenshots of any kind, including clearance record screenshots. Please describe your situation in text instead.",
  binary_data: "This looks like it includes an embedded file or binary data. Clearance Lens only accepts plain text fields — please remove any attached file data.",
  unscannable_structure: "This request is structured too deeply (nested objects/arrays many levels deep) for Clearance Lens to safely check for sensitive information. Please simplify the request and try again.",
  credit_card: "This looks like it includes a credit card number. Clearance Lens never accepts payment card numbers — please remove it; nothing here needs billing information.",
  classification_marking: "This looks like it includes a classification marking (e.g. SECRET//NOFORN). Clearance Lens never accepts classified or export-controlled content, real or described — please remove it and describe your situation without quoting or paraphrasing any marked material.",
};

/** SSN-context keywords that gate the riskier bare-9-digit check. No trailing
 *  `\b`: a couple of alternatives end in `#`, and `\b` right after a non-word
 *  char that's followed by whitespace is never a boundary, which would silently
 *  fail the match (caught by tests/unit/pii.test.ts — "ss# 123456789"). */
const SSN_CONTEXT = /\b(ssn|soc(?:ial)?[\s.-]*sec(?:urity)?|ss\s*#)/i;
/** Strictly 3-2-4 digit groups joined by `-` or a space — the SSN print format.
 *  This grouping is not used by any other common identifier (US phone numbers are
 *  3-3-4), so it is rejected unconditionally, regardless of SSA area/group/serial
 *  validity — including well-known placeholder SSNs like 123-45-6789, which is the
 *  correct, safer behavior for a detector being red-teamed with "obviously fake" PII.
 */
// Includes "." as a separator alongside "-"/space: confirmed against
// Presidio's SSN5 pattern (research/R1-leverage.md §3.2) that a dotted SSN
// (123.45.6789) is a real format in the wild this was missing.
const SSN_DASHED = /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/;
/** An isolated 9-digit run, only treated as an SSN when an SSN keyword is present
 *  somewhere in the same field. */
const BARE_9_DIGITS = /\b\d{9}\b/;

// Found live via the spec §6 judging panel round 2 (DECISIONS.md): "Born
// 03/14/1992, happy to relocate" — bare "Born" directly followed by a date,
// no "on"/"in" preposition — bypassed this guard entirely. Still gated by
// requiring an adjacent date pattern below, so bare "born" alone (no date
// nearby) still can't fire on its own.
const BIRTH_CONTEXT = /\b(dob|d\.o\.b\.?|date of birth|born|birth\s*date|birthday)\b/i;
const DATE_NUMERIC = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/;
const DATE_ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_MONTH_DAY_YEAR = new RegExp(
  `\\b(?:${MONTH_NAMES})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`,
  "i",
);
const DATE_DAY_MONTH_YEAR = new RegExp(
  `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})\\.?,?\\s+\\d{4}\\b`,
  "i",
);
const BARE_YEAR = /\b(19|20)\d{2}\b/;
// A fully spelled-out date ("born march second nineteen ninety two") has no
// digits at all, so none of the numeric date-shape checks above can ever
// match it — found live via the spec §6 judging panel round 4 (2 of 5
// judges, independently). Requires a month name, an ordinal (the day), and
// two more number-words (the year, spelled as two "teens/tens" words) all
// clustered within a bounded window — specific enough that ordinary prose
// is very unlikely to coincidentally match, while still catching this exact
// evasion. Still gated by BIRTH_CONTEXT below, same as every other DOB
// check here — a month name alone (e.g. "the posting closes March 2nd")
// must never flag on its own.
const ORDINAL_WORDS =
  "first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth|thirty-first";
const CARDINAL_NUMBER_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred";
const SPELLED_OUT_DATE = new RegExp(
  `\\b(?:${MONTH_NAMES})\\b.{0,30}?\\b(?:${ORDINAL_WORDS})\\b.{0,40}?\\b(?:${CARDINAL_NUMBER_WORDS})\\b.{0,20}?\\b(?:${CARDINAL_NUMBER_WORDS})\\b`,
  "i",
);

const PASSPORT_CONTEXT = /\bpassport(?:\s*(?:number|no\.?|#))?\b/i;
/** 6-9 char alphanumeric token containing at least one digit (excludes plain words). */
const ALPHANUM_ID_TOKEN = /\b(?=[A-Za-z0-9]{6,9}\b)(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6,9}\b/;

// No trailing `\b` — same reasoning as SSN_CONTEXT above: the `#` alternatives
// end in a non-word char, so a trailing boundary assertion can silently fail.
// "request" added to the e-QIP branch: found live via the spec §6 judging
// panel round 2 — "my e-QIP request number is 2024-SEC-0098765" bypassed
// this because the context list only had case/id/submission, not "request".
// A bare digit directly after "case"/"investigation" (no "number"/"no"/"#"/
// "id" word in between) added as a further alternative: found live via
// round 4 — "DCSA case 2024-0045678" bypassed this because "case" went
// straight into the number with no qualifying word at all.
const CASE_NUMBER_CONTEXT =
  /\b(case\s*(?:number|no\.?|#|id|\d)|investigation\s*(?:number|no\.?|#|id|\d)|e-?qip\s*(?:case|id|submission|request)|opm\s*case)/i;
const DIGIT_RUN_5PLUS = /\b[A-Za-z]?\d{5,}\b/;
// A standalone pattern (no keyword context needed): a 4-digit year, a dash,
// 2-4 letters, a dash, 4+ digits — the shape of a real government case ID
// ("2024-ABC-56789", "2024-SEC-0098765") distinctive enough to flag on
// structure alone, found live via the same round: "my file 2024-ABC-56789
// is in review" and "reference number 2024-ABC-56789" both used generic
// framing words (file/reference) the keyword list was never going to cover
// exhaustively, but the ID's own shape is a reliable independent signal.
// Second alternative (letters-year-number, e.g. "DCSA-2026-0417") added:
// found live via the spec §6 judging panel round 3 — the original pattern
// only covered year-first case IDs ("2024-ABC-56789"); a real DCSA case
// number in agency-prefix order bypassed it entirely.
const CASE_ID_SHAPE =
  /\b(?:(19|20)\d{2}-[A-Za-z]{2,4}-\d{4,}|[A-Za-z]{2,6}-(19|20)\d{2}-\d{4,})\b/;

/** Specific adjudication/records-system jargon. Deliberately narrow — generic
 *  words like "clearance", "secret", or "active" must NOT appear here, since
 *  stating one's own clearance status/level is self-attestation, not a record
 *  leak, and is exactly what this product needs users to be able to say.
 *  System NAMES (diss/jpas/nbis) require actual record-indicating context
 *  immediately adjacent — bare mentions do NOT match. Without this, asking
 *  explain_rule to explain what DISS/NBIS even ARE (the rule that explains
 *  *why* self-attestation isn't verification — exactly the content this
 *  product most wants to surface) was itself rejected as if it were pasted
 *  record text, including the rule's own id ("nbis-diss") and title ("NBIS
 *  vs. DISS: Current System of Record") — found live via the spec §5
 *  agent-in-the-loop persona eval, not a hypothetical. The other phrases
 *  below (subject summary, investigation opened/closed, etc.) still catch an
 *  actual record dump independently, so this narrowing doesn't meaningfully
 *  reduce real protection.
 *
 *  "owning smo"/"\bpsq\b" added: found live via the spec §6 judging panel
 *  round 2 — "JPAS Owning SMO: 123456, PSQ submitted, SON 1234567890"
 *  bypassed the record-context requirement above because it uses real
 *  JPAS field terminology (Security Management Office; Personnel Security
 *  Questionnaire) instead of a word like "record"/"shows". Both terms are
 *  distinctive enough internal-system jargon to add directly, without
 *  reintroducing the bare "jpas"/"diss"/"nbis" false positive this file's
 *  own history (DECISIONS.md D-016) already fixed once — "SON" itself was
 *  deliberately left out despite appearing in the same bypass string,
 *  since it collides with the ordinary English word. */
const CLEARANCE_RECORD_CONTEXT =
  /\b(?:diss|jpas|nbis)\s+(?:record|printout|screenshot|summary|history|shows|says|entry)|e-?adjudication|subject summary|investigation (?:opened|closed)|adjudication (?:result|history)|eqip (?:record|history)|owning\s+smo|\bpsq\b/i;

/** Clearance-adjudication jargon, each too short/generic to flag bare (e.g.
 *  "CI" collides with "Continuous Integration" in a tech-hiring context,
 *  "T5"/"SOR" are too short to be safe alone) but, co-occurring with an
 *  adjudication-status verb anywhere in the same text, reliably indicates
 *  real clearance-record content rather than an innocent acronym mention.
 *  Found live via the spec §6 judging panel round 3: "my SOR was adjudicated
 *  favorably in 2021 with T5 scope and CI poly" and "my clearance was
 *  adjudicated under e-QIP" both bypassed every existing detector — neither
 *  names DISS/JPAS/NBIS, the only system names this file previously
 *  recognized, and the e-QIP case only required a trailing
 *  case/id/submission/request noun (CASE_NUMBER_CONTEXT), not an adjacent
 *  adjudication verb. */
const ADJUDICATION_JARGON_TOKEN =
  /\b(?:sor|t-?5\s+(?:scope|investigation|clearance)|tier\s*5\s+(?:scope|investigation)|ci\s*poly(?:graph)?|counterintelligence\s+poly(?:graph)?|e-?qip)\b/i;
const ADJUDICATION_VERB = /\b(?:adjudicat\w*|submitted|processed|completed|pending|favorably|unfavorably)\b/i;

const IMAGE_DATA_URI = /data:image\/[a-z0-9+.-]+;base64,/i;
const BINARY_DATA_URI = /data:[a-z0-9/+.-]+;base64,/i;
/** A long, unbroken run of base64-alphabet characters with no PII keyword nearby —
 *  heuristic catch-all for a pasted file/image with no explicit MIME prefix. */
const LONG_BASE64_RUN = /[A-Za-z0-9+/]{200,}={0,2}/;
/** Credit-card-shaped: 4 groups of 4 digits (with optional separators),
 *  Luhn-plausible length, found via the spec §6 judging panel round 2 — not
 *  one of the originally documented refused categories, but squarely
 *  within the hard constraint's "never receive PII" spirit, and this exact
 *  shape essentially never appears in legitimate defense-job-search
 *  content, so it's safe to flag on structure alone. */
const CREDIT_CARD_SHAPE = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/;
/** Standard UUID shape (8-4-4-4-12 hex, dash-separated). Every internal
 *  identifier in this product (role_id, etc.) is a UUID, and an all-numeral
 *  one (e.g. "00000000-0000-4000-8000-000000000000" — a plausible probe
 *  value, or any UUID whose hex digits happen to all land on 0-9) can
 *  satisfy CREDIT_CARD_SHAPE's 4-4-4-4 digit-group pattern by coincidence.
 *  Found live via the spec §6 judging panel round 3 (4 of 5 judges
 *  independently reproduced this): a legitimate role_id lookup was rejected
 *  as "a credit card number." Stripped out before the credit-card check
 *  runs, and ONLY before that check — a UUID has no legitimate way to also
 *  look like an SSN/DOB/passport shape, so narrowing this to credit-card
 *  detection alone doesn't reopen any other category. */
const UUID_SHAPE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** A real classification/control marking, in either its spelled-out banner
 *  form ("SECRET//NOFORN") or its abbreviated portion-marking form
 *  ("(S//NF)", "(TS//SI/TK)") — found live via the spec §6 judging panel
 *  round 5 (product_designer): a synthetic "SECRET//NOFORN ... propulsion
 *  subsystem spec sheet ..." string was accepted and echoed verbatim into
 *  `prepare_consented_card`'s shareable output. Anchored specifically on
 *  the "//" + a recognized control-marking abbreviation (NOFORN/ORCON/
 *  FOUO/REL TO/NATO/SI/TK/HCS/SAP/FISA) — deliberately not on a bare
 *  classification-level word alone (that's exactly the self-attestation
 *  language, "I have a Secret clearance," this file's own design
 *  elsewhere protects as legitimate). Distinctive enough that ordinary
 *  text has no plausible reason to contain this exact shape. */
const CLASSIFICATION_MARKING =
  /\b(?:top secret|secret|confidential|unclassified)\s*\/\/\s*(?:noforn|orcon|fouo|rel\s+to|nato|si|tk|hcs|sap|fisa)\b|\(\s*(?:u|c|s|ts)\s*\/\/\s*(?:nf|noforn|orcon|fouo|rel\s+to|nato|si|tk|hcs|sap|fisa)/i;

/** The actual, un-obfuscated detectors. Operates on already-normalized,
 *  already-decoded plain text — see `scanTextForPiiCui` below, which is the
 *  only caller and the thing that actually runs against raw user input. */
function scanPlainText(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  const add = (category: PiiCategory) => {
    if (!findings.some((f) => f.category === category)) {
      findings.push({ category, message: FRIENDLY_BY_CATEGORY[category] });
    }
  };

  if (SSN_DASHED.test(text)) add("ssn");
  else if (SSN_CONTEXT.test(text) && BARE_9_DIGITS.test(text)) add("ssn");

  if (
    BIRTH_CONTEXT.test(text) &&
    (DATE_NUMERIC.test(text) ||
      DATE_ISO.test(text) ||
      DATE_MONTH_DAY_YEAR.test(text) ||
      DATE_DAY_MONTH_YEAR.test(text) ||
      BARE_YEAR.test(text) ||
      SPELLED_OUT_DATE.test(text))
  ) {
    add("dob");
  }

  if (PASSPORT_CONTEXT.test(text) && ALPHANUM_ID_TOKEN.test(text)) add("passport");

  if ((CASE_NUMBER_CONTEXT.test(text) && DIGIT_RUN_5PLUS.test(text)) || CASE_ID_SHAPE.test(text)) {
    add("case_number");
  }

  if (CLEARANCE_RECORD_CONTEXT.test(text)) add("clearance_record");
  if (ADJUDICATION_JARGON_TOKEN.test(text) && ADJUDICATION_VERB.test(text)) add("clearance_record");

  if (IMAGE_DATA_URI.test(text)) add("image_upload");
  else if (BINARY_DATA_URI.test(text) || LONG_BASE64_RUN.test(text)) add("binary_data");

  if (CREDIT_CARD_SHAPE.test(text.replace(UUID_SHAPE, ""))) add("credit_card");

  if (CLASSIFICATION_MARKING.test(text)) add("classification_marking");

  return findings;
}

/** Invisible/zero-width characters sometimes spliced into a digit run to break
 *  a pattern match without changing how the text visually reads (e.g.
 *  "123​-45-6789"). Stripped before scanning — red-team-found gap, see
 *  tests/unit/pii.test.ts and DECISIONS.md. */
const INVISIBLE_CHARS = /[​‌‍⁠﻿­]/g;

/** Unicode dash/hyphen lookalikes that read identically to "-" but aren't in
 *  SSN_DASHED's `[-.\s]` character class, and — verified directly, not
 *  assumed — aren't folded to ASCII "-" by NFKC normalization either (NFKC
 *  DOES fold FULLWIDTH HYPHEN-MINUS U+FF0D, since that block exists purely
 *  for compatibility with ASCII/JIS; it does NOT fold general-punctuation
 *  dashes like U+2010/2011/2013/2014 or the math minus sign U+2212, which
 *  Unicode treats as semantically distinct from "-"). */
const DASH_LOOKALIKES = /[‐‑‒–—−]/g;

/** Normalizes text before any detector runs: NFKC folds full-width digits and
 *  FULLWIDTH HYPHEN-MINUS to standard ASCII; the two replace()s close the
 *  remaining gaps NFKC doesn't cover (verified empirically — see above). */
function normalizeForScan(text: string): string {
  return text.normalize("NFKC").replace(INVISIBLE_CHARS, "").replace(DASH_LOOKALIKES, "-");
}

/** Self-inverse: rot13(rot13(x)) === x. Digits/punctuation pass through
 *  unchanged, which is exactly why this is worth trying as its own pass — it
 *  specifically defeats "obfuscate just the trigger keyword" (e.g. "ssn" ->
 *  "ffa") while a bare digit run sails through untouched, which would
 *  otherwise slip past this guard's keyword-gated checks (SSN_CONTEXT +
 *  BARE_9_DIGITS, CASE_NUMBER_CONTEXT, etc). */
function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** One layer of percent-decoding. Returns null (rather than throwing or
 *  looping forever) when the escape sequences are malformed, or when decoding
 *  made no difference — both mean "nothing more to decode here." */
function tryUriDecode(text: string): string | null {
  try {
    const decoded = decodeURIComponent(text);
    return decoded === text ? null : decoded;
  } catch {
    return null;
  }
}

/** Bounds the percent-decode loop below — defeats double-encoding (verified:
 *  2 passes fully resolves a double-percent-encoded SSN) without looping
 *  unboundedly on adversarial input. */
const MAX_URI_DECODE_PASSES = 3;

/** A base64-alphabet run long enough to plausibly be an encoded short PII
 *  phrase, as distinct from LONG_BASE64_RUN's 200+-char "there's clearly some
 *  large blob in here" catch-all — this is specifically for a short phrase
 *  (e.g. "my ssn is 123-45-6789" is 28 chars of base64) hidden with no
 *  visible keyword and too short to trip that heuristic. */
const EMBEDDED_BASE64_TOKEN = /[A-Za-z0-9+/]{12,}={0,2}/g;

/** Decodes a candidate base64 token and returns its text ONLY when decoding
 *  is clearly correct and clearly plain text. Two checks, both load-bearing:
 *  (1) re-encoding the decoded bytes must reproduce the exact original token
 *  — Node's `Buffer.from(str, "base64")` silently tolerates non-base64 input,
 *  so without this round-trip check almost any alphanumeric run would
 *  "decode" to something; (2) the decoded bytes must be printable ASCII —
 *  real PII hidden this way is always a plain-text phrase, never binary.
 *  Verified empirically against realistic non-PII tokens (a role-id-shaped
 *  string, a GitHub-username-shaped string, a long run-on sentence with no
 *  spaces, a repeated-letter run, a plain digit run) — zero false decodes. */
function tryBase64Decode(token: string): string | null {
  try {
    const buf = Buffer.from(token, "base64");
    const reencoded = buf.toString("base64").replace(/=+$/, "");
    if (reencoded !== token.replace(/=+$/, "")) return null;
    const text = buf.toString("utf8");
    if (text.length < 4 || !/^[\t\r\n\x20-\x7E]*$/.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * The real entry point for scanning one string (scanValueForPiiCui below
 * calls this on every string it finds). Runs scanPlainText against the plain
 * text AND a small, fixed set of cheap, reversible transforms a motivated
 * user could type into an ordinary string field to hide PII from a naive
 * scan — there is no file upload or binary channel here, everything arrives
 * as JSON strings, so this is the actual threat surface. Each transform is
 * tried independently (not composed/chained with the others — that's an
 * unbounded rabbit hole, not a real product need) and every finding merges,
 * deduplicated by category:
 *  - Unicode normalization + invisible-character stripping + dash-lookalike
 *    folding (normalizeForScan), applied first, unconditionally.
 *  - ROT13 of the whole normalized text.
 *  - Percent-decoding, repeated to a fixed point (bounded).
 *  - Any embedded base64-looking token, decoded and re-scanned.
 * Found via red-teaming (spec §5) — all four were confirmed live bypasses
 * before this fix; see tests/unit/pii.test.ts for the regression cases and
 * DECISIONS.md for the write-up. Verified this doesn't introduce new false
 * positives against this file's existing "does NOT flag" corpus.
 */
function scanTextForPiiCui(text: string): PiiFinding[] {
  const normalized = normalizeForScan(text);
  const findings = scanPlainText(normalized);
  const merge = (more: PiiFinding[]) => {
    for (const f of more) {
      if (!findings.some((existing) => existing.category === f.category)) findings.push(f);
    }
  };

  merge(scanPlainText(rot13(normalized)));

  let current = normalized;
  for (let i = 0; i < MAX_URI_DECODE_PASSES; i++) {
    const decoded = tryUriDecode(current);
    if (decoded === null) break;
    merge(scanPlainText(decoded));
    current = decoded;
  }

  for (const token of normalized.match(EMBEDDED_BASE64_TOKEN) ?? []) {
    const decodedToken = tryBase64Decode(token);
    if (decodedToken) merge(scanPlainText(decodedToken));
  }

  return findings;
}

/**
 * Scans a flat record's string/string[] values JOINED TOGETHER in a fixed,
 * caller-specified key order, in addition to (never instead of) the normal
 * per-field scan every tool already gets via `scanValueForPiiCui`. This
 * exists for one documented, narrow case: a tool whose output deliberately
 * echoes the raw input verbatim (`prepare_consented_card`) is worth the
 * false-positive cost of catching PII a user split across two sibling
 * fields (e.g. "123-45" in one field, "6789" in another) specifically
 * because that output is about to be shared externally — see
 * BLOCKERS.md B-001 / DECISIONS.md for why this is NOT applied globally
 * (demonstrated false positive: an ordinary search query plus an ordinary
 * street address can concatenate into an SSN shape; most tools' fields
 * don't describe one person's identity the way a share-card's do).
 * `keyOrder` should be the field order from a real published schema, fixed,
 * not derived from object insertion order (which a client controls).
 */
export function scanConcatenatedFields(
  fields: Record<string, unknown>,
  keyOrder: string[],
): PiiFinding[] {
  const parts: string[] = [];
  for (const key of keyOrder) {
    const value = fields[key];
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") parts.push(item);
    }
  }
  return scanTextForPiiCui(parts.join(" "));
}

/** A bare, isolated 9-digit run with NO keyword context at all — the normal
 * scanner's `BARE_9_DIGITS` deliberately requires `SSN_CONTEXT` nearby
 * (see that const's own comment) because applied globally, a context-free
 * 9-digit check would false-positive on ordinary numeric content elsewhere
 * in this product (a role_id fragment, a comp figure, a zip+4). Found live
 * via the spec §6 judging panel round 2: `prepare_consented_card` — the one
 * tool that echoes raw input into a shareable, externally-facing card — was
 * bypassed by a bare SSN-shaped number ("123456789") and a bare passport-
 * shaped "ID number" ("912345678"), each entirely unlabeled. For this one
 * tool specifically, the false-positive cost of flagging ANY bare 9-digit
 * run is worth paying (same reasoning BLOCKERS.md B-001/DECISIONS.md D-014
 * already used to justify this tool's own stricter `extraGuard`): a
 * legitimate card field (headline, highlights, notes, availability) has no
 * ordinary reason to contain 9 consecutive digits with nothing else
 * explaining them. Reported under the "ssn" category — not perfectly
 * precise (it could be a passport/other ID), but directionally correct and
 * the recommended fix (restate in general terms) applies either way. */
export function scanForBareIdentifierShapes(fields: Record<string, unknown>): PiiFinding[] {
  const findings: PiiFinding[] = [];
  const checkString = (s: string) => {
    if (BARE_9_DIGITS.test(s) && findings.length === 0) {
      findings.push({ category: "ssn", message: FRIENDLY_BY_CATEGORY.ssn });
    }
  };
  for (const value of Object.values(fields)) {
    if (typeof value === "string") checkString(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") checkString(item);
    }
  }
  return findings;
}

const MAX_SCAN_DEPTH = 8;

/** Recursively walks any JSON-ish value (tool inputs are plain objects/arrays/
 *  strings/numbers), scanning every string found. Depth-limited as a defensive
 *  bound, not an expected real-world case for our flat tool schemas. */
export function scanValueForPiiCui(value: unknown, depth = 0): PiiFinding[] {
  if (depth > MAX_SCAN_DEPTH) {
    // Fail CLOSED, not open — matches this module's own stated design
    // principle ("prefer a false positive... over a false negative"). A
    // structure nested deeper than we scan is exactly the ambiguous case
    // that principle is about; silently returning [] here (as this used to)
    // let a 9+-level-deep payload bypass the guard entirely (confirmed live
    // during red-teaming, spec §5 — see tests/unit/pii.test.ts). No
    // legitimate tool input (every schema here is flat objects/short arrays)
    // comes anywhere near this depth, so this never fires on real traffic.
    return [{ category: "unscannable_structure", message: FRIENDLY_BY_CATEGORY.unscannable_structure }];
  }
  if (typeof value === "string") return scanTextForPiiCui(value);
  if (Array.isArray(value)) {
    return value.flatMap((item) => scanValueForPiiCui(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((v) =>
      scanValueForPiiCui(v, depth + 1),
    );
  }
  return [];
}

export class PiiCuiError extends Error {
  readonly findings: PiiFinding[];
  constructor(findings: PiiFinding[]) {
    super(buildFriendlyRejectionMessage(findings));
    this.name = "PiiCuiError";
    this.findings = findings;
  }
}

export function buildFriendlyRejectionMessage(findings: PiiFinding[]): string {
  if (findings.length === 0) return "";
  if (findings.length === 1) return findings[0].message;
  const bullets = findings.map((f) => `- ${f.message}`).join("\n");
  return `This request looks like it includes more than one kind of information Clearance Lens never accepts:\n${bullets}`;
}

/** Throws a PiiCuiError (deduplicated by category) if `value` contains anything
 *  that looks like PII/CUI. Call this on every tool's raw input before zod
 *  validation and before any other processing. */
export function assertNoPiiCui(value: unknown): void {
  const findings = scanValueForPiiCui(value);
  if (findings.length > 0) {
    throw new PiiCuiError(findings);
  }
}
