/**
 * Heuristic section/bullet extraction from a public job posting's plain-text
 * description. Feeds build_trial_assessment, get_role_rubric, readiness_brief,
 * and run_job_preview — all of which need "what does this role actually
 * involve, in the posting's own words" (spec's B1 principle, research/R5:
 * "every brief must be visibly derived from the specific job posting's stated
 * responsibilities, tools, and deliverables — not a role-agnostic template").
 * Real postings (verified against a live Anduril posting during build) use
 * ALL-CAPS section headers followed by "- " bulleted lines, which this parses
 * defensively — if a posting doesn't follow that convention, sections come
 * back empty and callers fall back to the raw description text.
 */

export interface ExtractedSections {
  responsibilities: string[];
  qualifications: string[];
  /** Every bullet found, regardless of which section (or no section) it was under. */
  rawBullets: string[];
}

const RESPONSIBILITY_HEADER = /what you.?ll do|responsibilities|the role\b|about the (job|role)|day.to.day/i;
const QUALIFICATION_HEADER = /required qualifications|^qualifications$|requirements|what you.?ll need|who you are|minimum qualifications/i;
const MIN_BULLET_LENGTH = 10;
const MAX_HEADER_LENGTH = 60;

// Found live via the spec §5 judging panel (DECISIONS.md): a real Saronic
// posting used plain Title Case headers ("Responsibilities",
// "Qualifications," "Benefits," "Physical Demands") with no colon and no
// ALL-CAPS — this module's original header gate (isShoutCase or trailing
// colon) missed every one of them, silently emptying BOTH responsibilities
// and qualifications and forcing every caller's "if structured sections are
// empty, fall back to rawBullets" path to dump benefits/ADA boilerplate as
// if it were a skill or responsibility. A short, non-bulleted line that IS
// itself a recognized header phrase (not just mentions one in passing) is a
// real header regardless of capitalization style.
const BOILERPLATE_BULLET =
  /\b(?:health insurance|medical insurance|dental (?:and|&) vision|vision insurance|401\(?k\)?|retirement plan|stock options?|equity options?|paid time off|\bpto\b|parental leave|maternity leave|paternity leave|life insurance|disability insurance|competitive salary|free lunch|unlimited (?:free )?(?:drinks|snacks)|equal opportunity employer|reasonable accommodations?|lifting (?:and|&) carrying|manual dexterity|visual acuity|prolonged periods of (?:sitting|standing)|physical demands)\b/i;

// A header BOUNDARY (any section label, even one this module doesn't
// bucket by name, like "Benefits" or "Physical Demands") must be
// recognized as distinctly from WHICH bucket a recognized boundary maps
// to — found live (same panel finding as above): an earlier, narrower fix
// only recognized "Responsibilities"/"Qualifications" themselves as
// headers, so a later "Benefits"/"Physical Demands" label (real header
// text, just not one of the two categories this module tracks) was never
// treated as a boundary at all, never reset currentSection away from
// "qualifications," and let every bullet for the REST OF THE DOCUMENT get
// wrongly attributed to qualifications. A standalone short line with no
// bullet marker, no sentence-ending punctuation, and every word
// capitalized (Title Case) or ALL-CAPS is reliably a label, not a
// sentence, regardless of which specific section it names.
function looksLikeHeaderBoundary(line: string): boolean {
  if (line.length === 0 || line.length > MAX_HEADER_LENGTH) return false;
  if (/^[-•*]/.test(line)) return false;
  if (/:$/.test(line)) return true;
  if (/[.,;!?]$/.test(line)) return false; // a real sentence ends with punctuation; a label doesn't
  const words = line.split(/\s+/);
  if (words.length > 6) return false; // labels are short; a 7+ word line is prose
  const isShoutCase = line === line.toUpperCase() && /[A-Z]/.test(line);
  const minorWord = /^(?:and|or|of|the|in|for|to|&)$/i;
  const isTitleCase = words.every((w) => /^[A-Z]/.test(w) || minorWord.test(w));
  return isShoutCase || isTitleCase;
}

export function extractSections(descriptionText: string): ExtractedSections {
  const lines = descriptionText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentSection: "responsibilities" | "qualifications" | null = null;
  const responsibilities: string[] = [];
  const qualifications: string[] = [];
  const rawBullets: string[] = [];

  for (const line of lines) {
    if (looksLikeHeaderBoundary(line)) {
      if (RESPONSIBILITY_HEADER.test(line)) currentSection = "responsibilities";
      else if (QUALIFICATION_HEADER.test(line)) currentSection = "qualifications";
      else currentSection = null;
      continue;
    }
    const bulletMatch = /^[-•*]\s*(.+)/.exec(line);
    if (!bulletMatch) continue;
    const text = bulletMatch[1].trim().replace(/\s+/g, " ");
    if (text.length < MIN_BULLET_LENGTH) continue;
    // Defense in depth beyond the header-detection fix above: a bullet that
    // is unambiguously benefits/compensation/ADA-physical-demands content
    // is never a real skill or responsibility no matter which section (or
    // no section, under a header this module still fails to recognize) it
    // was found under — exclude it everywhere, not just from the
    // structured buckets, so a caller's rawBullets fallback stays safe too.
    if (BOILERPLATE_BULLET.test(text)) continue;
    rawBullets.push(text);
    if (currentSection === "responsibilities") responsibilities.push(text);
    else if (currentSection === "qualifications") qualifications.push(text);
  }

  return { responsibilities, qualifications, rawBullets };
}
