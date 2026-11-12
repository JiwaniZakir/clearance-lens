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
  | "binary_data";

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

const BIRTH_CONTEXT = /\b(dob|d\.o\.b\.?|date of birth|born on|born in|birth\s*date|birthday)\b/i;
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

const PASSPORT_CONTEXT = /\bpassport(?:\s*(?:number|no\.?|#))?\b/i;
/** 6-9 char alphanumeric token containing at least one digit (excludes plain words). */
const ALPHANUM_ID_TOKEN = /\b(?=[A-Za-z0-9]{6,9}\b)(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6,9}\b/;

// No trailing `\b` — same reasoning as SSN_CONTEXT above: the `#` alternatives
// end in a non-word char, so a trailing boundary assertion can silently fail.
const CASE_NUMBER_CONTEXT =
  /\b(case\s*(?:number|no\.?|#|id)|investigation\s*(?:number|no\.?|#|id)|e-?qip\s*(?:case|id|submission)|opm\s*case)/i;
const DIGIT_RUN_5PLUS = /\b[A-Za-z]?\d{5,}\b/;

/** Specific adjudication/records-system jargon. Deliberately narrow — generic
 *  words like "clearance", "secret", or "active" must NOT appear here, since
 *  stating one's own clearance status/level is self-attestation, not a record
 *  leak, and is exactly what this product needs users to be able to say. */
const CLEARANCE_RECORD_CONTEXT =
  /\b(diss|jpas|nbis(?:\s+record)?|e-?adjudication|subject summary|investigation (?:opened|closed)|adjudication (?:result|history)|eqip (?:record|history))\b/i;

const IMAGE_DATA_URI = /data:image\/[a-z0-9+.-]+;base64,/i;
const BINARY_DATA_URI = /data:[a-z0-9/+.-]+;base64,/i;
/** A long, unbroken run of base64-alphabet characters with no PII keyword nearby —
 *  heuristic catch-all for a pasted file/image with no explicit MIME prefix. */
const LONG_BASE64_RUN = /[A-Za-z0-9+/]{200,}={0,2}/;

function scanTextForPiiCui(text: string): PiiFinding[] {
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
      BARE_YEAR.test(text))
  ) {
    add("dob");
  }

  if (PASSPORT_CONTEXT.test(text) && ALPHANUM_ID_TOKEN.test(text)) add("passport");

  if (CASE_NUMBER_CONTEXT.test(text) && DIGIT_RUN_5PLUS.test(text)) add("case_number");

  if (CLEARANCE_RECORD_CONTEXT.test(text)) add("clearance_record");

  if (IMAGE_DATA_URI.test(text)) add("image_upload");
  else if (BINARY_DATA_URI.test(text) || LONG_BASE64_RUN.test(text)) add("binary_data");

  return findings;
}

const MAX_SCAN_DEPTH = 8;

/** Recursively walks any JSON-ish value (tool inputs are plain objects/arrays/
 *  strings/numbers), scanning every string found. Depth-limited as a defensive
 *  bound, not an expected real-world case for our flat tool schemas. */
export function scanValueForPiiCui(value: unknown, depth = 0): PiiFinding[] {
  if (depth > MAX_SCAN_DEPTH) return [];
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
