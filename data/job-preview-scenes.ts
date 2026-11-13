/**
 * The six "first week" job-preview scenes (spec §3.1, run_job_preview).
 * Authored, static content — not derived from any specific job posting, by
 * design: these are general realities of early defense-tech work, unlike
 * build_trial_assessment which MUST derive from the specific posting.
 * Setup text may reference the role/company for light personalization.
 *
 * Design grounded in research/R5-assessment-science.md §C:
 * - C2: downsides are played straight, not softened — RJP evidence shows
 *   honest previews don't meaningfully reduce acceptance (r = .02).
 * - C3: every scene offers genuine choices with differentiated, plausible
 *   consequences — never a disguised single "correct" path.
 * - C4: debrief asks what-happened, an honesty check, a role-clarity check,
 *   and a never-scored values reflection.
 * - C5: the ITAR scene requires an actual decision + stated rationale (the
 *   same behavioral-sample shape as the trial assessment) and must never
 *   generate or request real technical data; the clearance-wait and SCIF
 *   scenes are written as lived-in logistics, not abstract policy text.
 */

export interface SceneChoice {
  id: string;
  label: string;
  whatRealTeamsReport: string;
}

/** Round 9 (three judges): a Senior Manufacturing Engineer got a
 *  standup about a "telemetry ingest fix". The only role-specific detail in
 *  any scene is scene 1's pair of competing priorities, so that pair now
 *  comes from the role's family; every other scene fits any role (D-050). */
export type RoleFamily = "software" | "hardware" | "business";

const COMPETING_PRIORITIES: Record<RoleFamily, string> = {
  software: "the telemetry ingest fix AND the demo",
  hardware: "the fixture rework on the line AND the first-article inspection report",
  business: "the supplier quote comparison AND the customer briefing deck",
};

export interface JobPreviewScene {
  id: string;
  title: string;
  includedInShortVersion: boolean; // the 4 scenes shown at minutes=20
  setup: (roleTitle: string, company: string, family: RoleFamily) => string;
  choices: SceneChoice[];
  requiresStatedRationale: boolean;
  debriefPrompts: string[];
}

const STANDARD_DEBRIEF = (scene: string) => [
  `What did you choose, and what would you do differently now, for this ${scene}?`,
  "Honesty check: did this feel like an accurate picture, including the parts that weren't flattering?",
  "Role clarity check: what's still unclear to you about this part of the job?",
];

export const JOB_PREVIEW_SCENES: JobPreviewScene[] = [
  {
    id: "standup_priority",
    title: "The vague standup priority",
    includedInShortVersion: true,
    setup: (roleTitle, company, family) =>
      `It's your third day as a ${roleTitle} at ${company}. In standup, your lead says: "We need ${COMPETING_PRIORITIES[family]} for Thursday — whichever you get to first." Nobody says which one actually matters more, and your lead is already halfway out the door to another meeting.`,
    choices: [
      {
        id: "ask_now",
        label: "Stop your lead for 60 seconds and ask directly which one is actually blocking something.",
        whatRealTeamsReport:
          "Most engineers at fast-moving defense-tech startups report this is the right move early on — leads are juggling too much to proactively sequence your work for you, and a direct, short question is read as competence, not annoyance. A few report leads who were visibly rushed and gave a clipped, slightly impatient answer anyway — the information was still worth getting.",
      },
      {
        id: "pick_yourself",
        label: "Make a judgment call yourself based on what seems more urgent, and flag your reasoning in Slack afterward.",
        whatRealTeamsReport:
          "Commonly works out fine, especially once you have more context — but new hires who do this in week one sometimes guess wrong, because they don't yet know which systems are secretly on a customer's critical path. When it goes wrong, the cost is usually a half-day of rework, not a crisis.",
      },
      {
        id: "do_both_partially",
        label: "Try to make visible progress on both at once.",
        whatRealTeamsReport:
          "The choice engineers who've been burned by this warn against most: splitting focus on two real tasks under time pressure commonly means neither lands well by Thursday, and it's harder to explain than picking one and being wrong.",
      },
    ],
    requiresStatedRationale: false,
    debriefPrompts: STANDARD_DEBRIEF("ambiguous-priority situation"),
  },
  {
    id: "ambiguous_spec",
    title: "The ambiguous spec",
    includedInShortVersion: true,
    setup: (roleTitle) =>
      `You're handed a one-paragraph spec for a new ${roleTitle.toLowerCase().includes("engineer") ? "feature" : "deliverable"}. It describes the "what" in two sentences and says nothing about edge cases, failure modes, or who the actual internal customer is.`,
    choices: [
      {
        id: "write_doc",
        label: "Write a short doc naming your assumptions and send it for a 10-minute review before building anything.",
        whatRealTeamsReport:
          "Widely reported as the habit senior engineers wish new hires built faster — it costs an hour and routinely saves days, and surfaces the real internal customer. A minority report that at a few fast-moving teams, everyone's too busy to review docs promptly, so it can stall momentum for a day.",
      },
      {
        id: "build_and_show",
        label: "Build your best interpretation and show it, treating the demo itself as the question.",
        whatRealTeamsReport:
          "Works well on teams with a strong show-don't-tell culture, and is sometimes faster in practice. The risk people describe: if your interpretation is far off, you've spent real time on the wrong thing, and defense-tech specs in particular sometimes hide a compliance or safety constraint that isn't obvious from the prose alone.",
      },
    ],
    requiresStatedRationale: false,
    debriefPrompts: STANDARD_DEBRIEF("ambiguous spec"),
  },
  {
    id: "ethics_tradeoff",
    title: "The weapons-adjacent tradeoff",
    includedInShortVersion: false,
    setup: () =>
      `A design review surfaces a real tradeoff: a targeting-adjacent system can be made meaningfully more reliable, but that also makes it more effective at its lethal purpose. Someone in the room asks, half-joking, half-not: "are we actually okay with this?" The room looks at you, the newest person, along with everyone else.`,
    choices: [
      {
        id: "name_it_directly",
        label: "Say plainly that you think the question deserves a real answer, not a joke, and ask how the team actually thinks about it.",
        whatRealTeamsReport:
          "People who've worked in this space for years describe this as a genuinely healthy moment when it happens — most serious defense-tech teams report having had this exact conversation explicitly, often early and more than once, precisely because avoiding it is worse for everyone. A few describe teams where the question gets waved off, which they describe as a real yellow flag worth noticing.",
      },
      {
        id: "defer_quietly",
        label: "Let the moment pass and focus on the technical merits — it's not really your call this early.",
        whatRealTeamsReport:
          "Common in the first weeks, and nobody will fault you for it immediately — but people who've been in the industry longer consistently say that if the discomfort doesn't resolve for you after reflecting on it, that's a real signal worth taking seriously rather than suppressing, not a phase you're supposed to grow out of.",
      },
      {
        id: "raise_privately_later",
        label: "Say nothing in the room, but bring it up one-on-one with your manager afterward.",
        whatRealTeamsReport:
          "Also common, and often the more comfortable route for a new hire — several engineers describe getting a more candid answer in private than what the room-dynamic allows. The tradeoff people name: the broader team doesn't get the benefit of the conversation happening in the open.",
      },
    ],
    requiresStatedRationale: false,
    debriefPrompts: [
      "What did you choose, and why — what does that choice say about where your own line is?",
      "Honesty check: did this scene feel like a real depiction of the kind of moment this work actually involves, rather than a sanitized version of it?",
      "This is a values reflection, never scored: is this a tradeoff you're comfortable sitting with on an ongoing basis, not just once?",
    ],
  },
  {
    id: "itar_moment",
    title: "The ITAR moment",
    includedInShortVersion: true,
    setup: (roleTitle, company) =>
      `A contractor on a joint project with ${company} — someone sharp, friendly, and clearly good at their job — mentions in passing that they're not a U.S. person, then asks you to send over "the drawing" for a subsystem you're both working around, just to move faster. You're the one with the file.`,
    choices: [
      {
        id: "decline_and_explain",
        label:
          "Decline to send it, and explain that it's likely ITAR-controlled technical data you can't share with a foreign person without a specific license — then offer to loop in your FSO or export-control lead to see what IS shareable.",
        whatRealTeamsReport:
          "This is the answer every FSO and export-control-trained engineer describes as correct, without exception — and importantly, people report that experienced foreign-national contractors are themselves usually already expecting this answer and not offended by it; the awkwardness is almost always smaller in practice than people fear in advance.",
      },
      {
        id: "send_it_to_be_helpful",
        label: "Send it — it seems like a small, low-stakes drawing, and you don't want to slow the project down over paperwork.",
        whatRealTeamsReport:
          "This is the scenario export-control training exists specifically to prevent — an unauthorized export of controlled technical data to a foreign person is a real violation (ITAR, 22 CFR), regardless of how small or informal it felt in the moment, and 'trying to be helpful' is the single most common story behind real violations people in this field describe.",
      },
      {
        id: "ask_someone_else_first",
        label: "Tell the contractor you'll check and get back to them, then ask your lead or FSO before doing anything.",
        whatRealTeamsReport:
          "Also a safe answer, and the one people without clear export-control training yet default to — the only real downside reported is a short delay for the contractor, which is a trivially acceptable cost compared to the alternative.",
      },
    ],
    requiresStatedRationale: true,
    debriefPrompts: [
      "What did you decide, and what's your one-sentence rationale for why?",
      "Honesty check: did this feel like a realistic version of the kind of moment ITAR actually comes up in day-to-day, rather than an abstract compliance lecture?",
      "Role clarity check: do you know who your FSO or export-control contact would actually be in a role like this, and would you know to ask?",
    ],
  },
  {
    id: "clearance_wait_week",
    title: "The clearance-wait week",
    includedInShortVersion: true,
    setup: (roleTitle, company) =>
      `Your investigation is still open. For now, you're not read into the program ${company}'s team is actually building toward — so this week as a ${roleTitle} looks like: unclassified documentation cleanup, a training module, and sitting in on one meeting where half the room is talking around something you can tell they can't fully explain to you yet.`,
    choices: [
      {
        id: "use_it_well",
        label: "Treat it as genuinely useful ramp-up time — documentation and training are real, if unglamorous, ways to learn the codebase and the org.",
        whatRealTeamsReport:
          "People who've been through this describe it as the mindset that makes the wait tolerable — and several note the documentation work itself turned out to matter more than it felt like at the time, since most teams' docs are genuinely behind.",
      },
      {
        id: "push_for_more",
        label: "Ask your manager directly whether there's any unclassified work closer to the team's actual mission you could pick up instead.",
        whatRealTeamsReport:
          "Reported to work well on teams that have thought about onboarding — some do have an unclassified-but-relevant workstream ready. On teams that haven't planned for this, people report the honest answer is often just 'not really, not yet,' which is itself useful to know early.",
      },
      {
        id: "quietly_disengage",
        label: "Coast through the week and wait for the investigation to clear before really engaging.",
        whatRealTeamsReport:
          "The option people most consistently regret in hindsight — several describe the clearance wait stretching to months, not weeks, and wishing they'd used the early unclassified time better once they could see the full picture later.",
      },
    ],
    requiresStatedRationale: false,
    debriefPrompts: STANDARD_DEBRIEF("clearance-wait period"),
  },
  {
    id: "scif_life",
    title: "SCIF life: no phone, and the travel form",
    includedInShortVersion: false,
    setup: () =>
      `Today you're badging into a SCIF for the first time. Your phone stays in a locker at the door — no exceptions, all day. Separately, HR reminds you that your upcoming personal trip abroad needs a foreign-travel report filed beforehand, even though it's just a family vacation.`,
    choices: [
      {
        id: "plan_around_it",
        label: "Rework your day around being unreachable (tell family/partner in advance, batch personal messages before badging in) and file the travel report promptly, even though it feels like overkill for a vacation.",
        whatRealTeamsReport:
          "What most cleared people settle into within the first few weeks — several describe the adjustment being more about other people (family expecting a reply) than about themselves. Filing travel reports for routine trips becomes habitual fast once people see it's a form, not an interrogation.",
      },
      {
        id: "resent_it",
        label: "Find the no-phone rule and the travel-reporting requirement intrusive, and say so.",
        whatRealTeamsReport:
          "A genuinely common early reaction — people report it fades for most, but for some it doesn't, and those people often decide cleared, SCIF-heavy work isn't the right long-term fit for them. Both outcomes are reported as normal, not a personal failing either way.",
      },
      {
        id: "skip_quietly",
        label: "File the travel report late or incompletely since it's \"just a vacation.\"",
        whatRealTeamsReport:
          "Described consistently as a bad idea — foreign-travel reporting is a continuous-vetting requirement, not a courtesy, and an undisclosed trip discovered later (even an innocuous one) creates exactly the kind of avoidable problem continuous vetting is designed to flag.",
      },
    ],
    requiresStatedRationale: false,
    debriefPrompts: [
      "What did you choose, and how do you think you'd actually feel about this after a few months of it, not just today?",
      "Honesty check: did this feel like real day-to-day texture rather than abstract policy text?",
      "Role clarity check: is there anything about SCIF life or travel reporting you'd want to ask a current employee about directly?",
    ],
  },
];

export const SHORT_VERSION_SCENE_COUNT = JOB_PREVIEW_SCENES.filter((s) => s.includedInShortVersion).length;
