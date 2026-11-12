// Judging panel round executor (spec §6). FROZEN per panel/protocol.md once
// round 1 has run — any edit after that must be logged in DECISIONS.md as a
// factual-bug fix, not a scoring adjustment.
//
// Invoked via: Workflow({ scriptPath: 'panel/run-round.workflow.js', args: {
//   roundNumber: 1, productionUrl: '...', mcpUrl: '...', readmeContent: '...'
// }})
// readmeContent is passed in (not read from disk) because workflow scripts
// have no filesystem access — the caller reads README.md and forwards it.
//
// Workflow scripts can't use Math.random()/Date.now() (breaks resume), so
// Judge 3's persona is chosen by rotating through the 4 personas based on
// roundNumber rather than true randomness — round-to-round variation without
// a banned API. The rotation is recorded in the result for auditability.

export const meta = {
  name: 'clearance-lens-panel-round',
  description: 'One blind judging-panel round: 5 fresh judges + aggregation (spec §6)',
  phases: [{ title: 'Judging' }],
}

const PERSONAS = [
  'You are a new graduate, a US citizen, with a computer science degree and no prior clearance or clearance investigation history. You\'re trying to figure out whether you can realistically pursue a specific defense-tech engineering role you found, what a clearance timeline would look like for you starting from zero, and whether you\'d actually want this kind of work before committing to it.',
  'You are a green card holder (lawful permanent resident) of about two years, originally from another country, with a strong software/ML background. You keep seeing contradictory advice online about whether your immigration status disqualifies you from defense-tech roles that mention ITAR or security clearances, and you want a straight answer for a specific role you\'re considering -- before you invest time in an application.',
  'You are a cleared engineer with an active clearance and several years at a prime defense contractor, considering a move to an early-stage defense-tech startup. You want to understand what the day-to-day is actually like at a specific company, compare it honestly against staying where you are, and get a realistic preview of the first few weeks before you give notice.',
  'You are a founder or technical recruiter at a seed-stage defense-tech startup that does not yet have a Facility Clearance. You\'re trying to figure out what you can and can\'t verify about a candidate\'s self-reported clearance status, and whether you can give candidates something useful (like a trial project or a realistic job preview) before you\'re even able to sponsor cleared work.',
]

function sharedPreamble(productionUrl, mcpUrl, readmeContent) {
  return [
    'You are an independent product-quality judge. You have never seen this product before. You are evaluating a live, deployed product called Clearance Lens. Here is everything you have access to:',
    '- Production URL: ' + productionUrl,
    '- MCP endpoint: ' + mcpUrl + ' (connect a real MCP client to it -- Streamable HTTP transport)',
    '- The project\'s public README:',
    '',
    '```',
    readmeContent,
    '```',
    '',
    'You do not have access to any other documentation, source code, commit history, design notes, or prior evaluation of this product. Form your judgment only from what you can observe by actually using the live product and the live MCP server.',
    '',
    'Before giving any score, list the 3 most serious problems you found. A 9 or higher on any dimension requires a concrete reason it beats the best comparable product you know of. A 10 requires that you could not find a meaningful improvement. A score given without supporting evidence will be discarded.',
    '',
    'Score every one of these 5 dimensions 1-10, each with specific evidence (what you actually did, what you saw, a URL/screenshot-description/tool-call-result you can point to):',
    '1. Function -- does it work, correctly, end to end?',
    '2. True user value -- would a real person in this situation actually get value from this, beyond what they could easily find elsewhere?',
    '3. Aesthetics & UX -- visual quality, hierarchy, consistency, responsiveness, accessibility.',
    '4. Trust/privacy/compliance -- does it behave honestly and safely with sensitive topics (personal data, legal/regulatory claims, hiring fairness)?',
    '5. Engineering quality & performance -- reliability, latency, error handling, polish under the hood as far as you can observe it from outside.',
    '',
    'Then answer this explicitly, yes or no, with detail either way: Did you find any of the following? (a) the server stored, echoed, logged, or accepted PII/CUI without rejecting it; (b) the server queried or imitated DISS/NBIS/DCSA or asked for a clearance screenshot; (c) any tool generated or requested ITAR-controlled technical data/drawings/specs; (d) any output included a hire/no-hire score, a ranking of people, or a demographic inference; (e) any statistic or claim with no source; (f) a severe accessibility failure blocking a core task.',
    '',
    'Report your findings via the structured schema you have been given: topThreeProblems (exactly 3), dimensions (all 5, each with a numeric score 1-10 and evidence text), hardConstraintViolation (found: true/false, detail), and overallNarrative (your own-words summary).',
  ].join('\n')
}

const ROLE_PARAGRAPHS = {
  function: 'Your specific lens: you are a senior engineer doing technical due diligence. Connect a real MCP client to the endpoint above and call every tool it offers, with both valid and deliberately invalid/edge-case input. Separately, use the /try page in a browser and exercise the same functionality there. Check: does every tool actually work, what happens on bad input, how fast are responses, are the rules/timelines/numbers you\'re shown internally consistent and plausible, does anything crash or hang.',
  design: 'Your specific lens: you are a product designer who has worked on or deeply studied Linear, Vercel, and Stripe\'s own products. Evaluate the live site\'s visual design, typography, spacing, color use, motion, responsiveness (try it at a few window widths including a narrow/mobile one), and accessibility (keyboard navigation, focus states, contrast) against that bar. Be specific about what would and wouldn\'t fit in a Linear/Vercel/Stripe-caliber product.',
  candidate: 'Your specific lens: you are the following real person, genuinely trying to solve your own problem using this product (via its web playground and/or by connecting it to an AI agent you have access to, your choice):\n\n{{PERSONA}}\n\nActually try to accomplish what this persona needs. Did you learn something you couldn\'t have easily found elsewhere? Would you install this / come back to it? Be honest about genuine friction or confusion you hit.',
  recruiter: 'Your specific lens: you are a founder or technical recruiter at an early-stage, pre-Facility-Clearance defense-tech startup. You\'re evaluating whether this product would save you interview loops, reduce mismatches with candidates, and whether the "consented card" concept (a candidate-approved intro card) is something you\'d actually act on. Try the relevant flows yourself.',
  skeptic: 'Your specific lens: you are actively trying to break this product\'s stated privacy and compliance promises. Try submitting things that look like a Social Security number, a date of birth, a passport number, a case/investigation number, or clearance-record-sounding text, through every input you can find (the web UI and direct MCP tool calls) and see what actually happens -- does it get rejected, and how? Try to get any tool to produce a score, a ranking, or a demographic inference about a person. Spot-check a few of the site\'s factual/legal claims against their cited sources, if sources are shown -- do the links work, do they say what the product claims they say?',
}

// minimum/maximum on every score: without these, an out-of-range value
// (0, 11, a stray 100-point-scale number) would be silently accepted and
// distort the weighted average instead of being rejected and retried by
// the StructuredOutput validation layer.
const DIMENSION_SCHEMA = {
  type: 'object',
  properties: { score: { type: 'number', minimum: 1, maximum: 10 }, evidence: { type: 'string' } },
  required: ['score', 'evidence'],
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    topThreeProblems: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    dimensions: {
      type: 'object',
      properties: {
        function: DIMENSION_SCHEMA,
        trueUserValue: DIMENSION_SCHEMA,
        aestheticsUx: DIMENSION_SCHEMA,
        trustPrivacyCompliance: DIMENSION_SCHEMA,
        engineeringQuality: DIMENSION_SCHEMA,
      },
      required: ['function', 'trueUserValue', 'aestheticsUx', 'trustPrivacyCompliance', 'engineeringQuality'],
    },
    hardConstraintViolation: { type: 'object', properties: { found: { type: 'boolean' }, detail: { type: 'string' } }, required: ['found'] },
    overallNarrative: { type: 'string' },
  },
  required: ['topThreeProblems', 'dimensions', 'hardConstraintViolation', 'overallNarrative'],
}

// panel/protocol.md's anti-inflation rule: "A score given without
// supporting evidence is discarded ... excludes that judge's overall from
// aggregation, logging why." The schema's own `required: ['score',
// 'evidence']` only guarantees the FIELD exists, not that it's substantive
// -- a judge could still satisfy the schema with evidence: "" or "N/A".
// 15 chars is a deliberately low bar (not a quality bar) that only catches
// genuinely empty/placeholder evidence, not short-but-real evidence.
const MIN_EVIDENCE_LENGTH = 15

function hasSubstantiveEvidence(dimensions) {
  return Object.values(dimensions).every((d) => typeof d.evidence === 'string' && d.evidence.trim().length >= MIN_EVIDENCE_LENGTH)
}

const WEIGHTS = {
  function: 0.25,
  trueUserValue: 0.30,
  aestheticsUx: 0.20,
  trustPrivacyCompliance: 0.15,
  engineeringQuality: 0.10,
}

function weightedOverall(dimensions) {
  let total = 0
  for (const key of Object.keys(WEIGHTS)) {
    total += dimensions[key].score * WEIGHTS[key]
  }
  return total
}

const { roundNumber, productionUrl, mcpUrl, readmeContent } = args
const personaIndex = (roundNumber - 1) % PERSONAS.length
const persona = PERSONAS[personaIndex]
const preamble = sharedPreamble(productionUrl, mcpUrl, readmeContent)

phase('Judging')

const judgeDefs = [
  { key: 'function_engineer', role: ROLE_PARAGRAPHS.function },
  { key: 'product_designer', role: ROLE_PARAGRAPHS.design },
  { key: 'candidate_user', role: ROLE_PARAGRAPHS.candidate.replace('{{PERSONA}}', persona) },
  { key: 'recruiter_user', role: ROLE_PARAGRAPHS.recruiter },
  { key: 'trust_skeptic', role: ROLE_PARAGRAPHS.skeptic },
]

const judgeResults = await parallel(
  judgeDefs.map((j) => () =>
    agent(preamble + '\n\n' + j.role, {
      phase: 'Judging',
      label: 'round' + roundNumber + '-' + j.key,
      schema: JUDGE_SCHEMA,
      agentType: 'general-purpose',
    }).then((r) => (r ? { judge: j.key, ...r } : null)),
  ),
)

const respondedJudges = judgeResults.filter(Boolean)
const nonRespondingJudges = judgeDefs.filter((j) => !respondedJudges.some((r) => r.judge === j.key)).map((j) => j.key)

// Anti-inflation rule (panel/protocol.md): a dimension score with no
// substantive evidence makes the WHOLE judge's overall unscored, not just
// that one dimension -- discarded before computing anything downstream, so
// a thin, unsupported response can't pull the trimmed mean up OR down, and
// can't suppress a real hard-constraint signal from the other 4 judges.
const validJudges = respondedJudges.filter((j) => hasSubstantiveEvidence(j.dimensions))
const discardedForNoEvidence = respondedJudges.filter((j) => !hasSubstantiveEvidence(j.dimensions)).map((j) => j.judge)

// Safety check: the protocol's aggregation (drop-highest-of-5, trimmed
// mean of the remaining 4) assumes 5 real judges. Fewer than 4 valid
// judges (an agent failure, or 2+ discarded for thin evidence) makes
// "drop 1, average the rest" either meaningless (divide-by-zero/NaN at 0
// left) or statistically unstable (averaging just 1-2 data points reads
// as confident when it isn't) -- surface that explicitly as a failed,
// non-conclusive round rather than silently reporting a number computed
// from too little signal.
const MIN_VALID_JUDGES = 4
if (validJudges.length < MIN_VALID_JUDGES) {
  log(
    'Round ' + roundNumber + ': INCONCLUSIVE -- only ' + validJudges.length + ' of 5 judges produced a usable ' +
    'response (non-responding: ' + JSON.stringify(nonRespondingJudges) + '; discarded for thin evidence: ' +
    JSON.stringify(discardedForNoEvidence) + '). Re-run this round rather than trusting this aggregation.',
  )
  return {
    roundNumber,
    personaIndexUsed: personaIndex,
    judges: validJudges,
    nonRespondingJudges,
    discardedForNoEvidence,
    inconclusive: true,
    passed: false,
  }
}

const overalls = validJudges.map((j) => ({ judge: j.judge, overall: weightedOverall(j.dimensions) }))
const sorted = [...overalls].sort((a, b) => a.overall - b.overall)
const dropped = sorted[sorted.length - 1] // highest, dropped from the trimmed mean
const kept = sorted.slice(0, -1)
const trimmedMean = kept.reduce((sum, o) => sum + o.overall, 0) / kept.length
const allSortedValues = overalls.map((o) => o.overall).sort((a, b) => a - b)
const mid = Math.floor(allSortedValues.length / 2)
const median =
  allSortedValues.length % 2 === 0 ? (allSortedValues[mid - 1] + allSortedValues[mid]) / 2 : allSortedValues[mid]
const anyHardConstraintViolation = validJudges.some((j) => j.hardConstraintViolation?.found)
const anyJudgeBelow9 = overalls.some((o) => o.overall < 9.0)
const effectiveScore = anyHardConstraintViolation ? Math.min(trimmedMean, 6.0) : trimmedMean
// A round with fewer than 5 valid judges (but still >= MIN_VALID_JUDGES)
// can still be aggregated, but must never silently PASS on partial
// evidence -- the protocol's "no judge < 9.0" and hard-constraint gates
// still apply to whichever judges we have, but a pass additionally
// requires all 5 original judges to have produced valid, countable input.
const allFiveValid = validJudges.length === 5
const passed = allFiveValid && effectiveScore >= 9.5 && !anyJudgeBelow9 && !anyHardConstraintViolation

log(
  'Round ' + roundNumber + ': trimmed mean ' + trimmedMean.toFixed(2) +
  ', median ' + median.toFixed(2) +
  ', valid judges ' + validJudges.length + '/5' +
  ', hard-constraint violation: ' + anyHardConstraintViolation +
  ', passed: ' + passed,
)

return {
  roundNumber,
  personaIndexUsed: personaIndex,
  judges: validJudges,
  nonRespondingJudges,
  discardedForNoEvidence,
  overalls,
  droppedJudge: dropped,
  trimmedMean,
  median,
  anyHardConstraintViolation,
  anyJudgeBelow9,
  effectiveScore,
  allFiveValid,
  inconclusive: false,
  passed,
}
