# Blockers

Things that need a human (credentials, paid accounts, access this agent cannot obtain). Format: `B-NNN` · date · what's blocked · fallback shipped · what unblocks it.

### B-001 — 2026-11-11 — **RESOLVED** (see DECISIONS.md D-014) — PII deliberately split across sibling fields of `prepare_consented_card` isn't caught, and that one tool really does echo raw approved input (red-team finding — not a quick/safe mechanical fix)

**Resolution:** scoped the exact fix option 2 names below — `prepare_consented_card` only, via a new opt-in `extraGuard` hook on `ToolDef`, fixed-schema-key-order join, not global. Verified against the exact reported bypass and against a legitimate card. Full reasoning in DECISIONS.md D-014. Left the original report below unedited, per this file's own record-keeping intent.

**What's blocked:** Whether to add cross-field PII correlation (scanning sibling string fields' concatenation, not just each field alone), and if so, scoped how.

**What I found, confirmed live, not assumed:** `lib/guard/pii.ts`'s `scanValueForPiiCui` scans each string independently and never concatenates sibling fields. A user who splits PII across two fields of one call gets past the guard entirely. Confirmed live:
```
curl -X POST localhost:3200/api/tools/prepare_consented_card -d \
  '{"role_id":"4dcfb105-41d7-97a8-fc52-863c3bcbb2dd","fields_user_approved":{"headline":"call me at 123-45","notes":"6789 thanks"}}'
→ 200 OK. card.markdown contains, verbatim:
  "**Headline:** call me at 123-45" / "**Notes:** 6789 thanks"
```
This also means the task brief's working assumption ("nothing stores or echoes raw input anyway") needs one correction: `prepare_consented_card`'s `card.json`/`card.markdown` are a deliberate, documented, verbatim echo of `fields_user_approved` — that IS its job (a consent-first "preview exactly what you're about to share" card). Verified this is the only one of the 11 tools with that property, and that the echo is bounded to exactly that tool's own `.strict()`-validated schema, never arbitrary passthrough — an extra undeclared key (`"totally_made_up_field"`) is rejected with `invalid_input`, confirmed live, not silently dropped. So the gap is narrowly "PII fragmented across this one tool's own declared fields," not a broader leak.

**Why this isn't a quick/safe mechanical fix:** The obvious fix — concatenate sibling string values and scan that too — has a real, demonstrated false-positive cost, not a hypothetical one. Constructed and ran this through the current scanner: `search_defense_roles` called with `query: "software engineer 123-45"` and `location: "6789 Main St"` — two completely ordinary, independently benign values (a search term with a suite number; a street address) that concatenate into something SSN-shaped. Scoping the fix to just `prepare_consented_card` avoids that exact collision, but: (1) it's a product call about how much false-positive risk is acceptable on a *sharing* tool specifically, versus the tolerance the rest of the product has adopted; (2) field order/joiner choice changes what does/doesn't match, with no principled way for me to pick one unilaterally; (3) the realistic harm here is a user successfully including their own split-up SSN in a card that is explicitly a review-before-you-send draft they were always going to see before it goes anywhere (never auto-shared) — a materially different risk than a third-party leak, which changes how much false-positive cost is worth paying.

**Fallback shipped:** None needed as a stopgap — each field is still scanned individually, so an SSN typed into a single field (the overwhelmingly common accidental-paste case this guard exists for) is still caught on every tool, including this one. This blocker is about a narrow, deliberate-evasion-only gap on one tool, not a general leak.

**What unblocks it:** A product decision: (1) is this worth closing at all, given the harm is self-directed and the output is a reviewed-before-sharing draft; (2) if yes, scope the fix to `prepare_consented_card` only (scan the concatenation of `fields_user_approved`'s string values, declared-field order, space-joined) rather than globally; (3) decide what false-positive rate is acceptable for that one tool given realistic inputs like street addresses.
