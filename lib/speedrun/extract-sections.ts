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

function looksLikeHeader(line: string): boolean {
  if (line.length === 0 || line.length > MAX_HEADER_LENGTH) return false;
  if (/^[-•*]/.test(line)) return false;
  const isShoutCase = line === line.toUpperCase() && /[A-Z]/.test(line);
  return isShoutCase || /:$/.test(line);
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
    if (looksLikeHeader(line)) {
      if (RESPONSIBILITY_HEADER.test(line)) currentSection = "responsibilities";
      else if (QUALIFICATION_HEADER.test(line)) currentSection = "qualifications";
      else currentSection = null;
      continue;
    }
    const bulletMatch = /^[-•*]\s*(.+)/.exec(line);
    if (!bulletMatch) continue;
    const text = bulletMatch[1].trim().replace(/\s+/g, " ");
    if (text.length < MIN_BULLET_LENGTH) continue;
    rawBullets.push(text);
    if (currentSection === "responsibilities") responsibilities.push(text);
    else if (currentSection === "qualifications") qualifications.push(text);
  }

  return { responsibilities, qualifications, rawBullets };
}
