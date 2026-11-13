<!-- JIT — Source-by-source verification of data/timelines.json (basis for DECISIONS.md D-049) -->
> **Provenance:** research subagent report, 2026-11-12, saved verbatim. Claims are labeled in the text by source quality (official docs vs. vendor forum vs. third-party). Nothing here was verified with a signed-in account on the platforms described; the live-server probes were read-only. Decisions taken from it are recorded in `DECISIONS.md`.

## Verification report: `data/timelines.json` and `estimate_timeline` against primary sources

All four judge claims are correct. Beyond them, the 24-month rule that defines both "lapsed" modifiers is not in SEAD 7 (their cited source), and the 90–270-day no-FCL wait does not appear to come from the DCSA handbook it cites. Nothing in the repo was edited.

**Working tree changed while I worked.** Uncommitted edits appeared in `lib/tools/estimate-timeline.ts` (a new `citizenship_status` input, and "not medians" wording), `data/rules.json` and `tests/unit/estimate-timeline.test.ts`. `data/timelines.json` is unchanged from HEAD 0cf6e27. Line numbers below refer to the working-tree tool file (sha1 1a91dd05).

### Sources and how they were read
| Source | Status |
|---|---|
| NISPPAC deck, Sept 2 2026: https://www.archives.gov/files/isoo/oversight-groups/nisppac/20260902-nisppac-public-meeting-slides.pdf | Downloaded (67 pp). PDF p.61 is "DCSA Inventory & Timeliness \| Industry" (p.60 is the section divider). The text layer is garbled, so I read it from 300-dpi renders. Every bar's three segments sum to its printed total. |
| TW 2.0 QPR FY26-Q3: https://assets.performance.gov/files/Personnel_Vetting_QPR_(FY26-Q3).pdf | Downloaded (8 pp). Table on p.4, checked against both the text layer and a render. |
| QPR Legacy Metrics FY26-Q3: https://assets.performance.gov/files/QPR_Legacy_Metrics_(FY26-Q3).pdf | Downloaded (14 pp). |
| SEAD 7 (FAS mirror): https://sgp.fas.org/othergov/intel/sead-7.pdf | Direct download returned 202 with an empty body. Full 6-page text retrieved through Firecrawl (the 2018 directive signed by Daniel R. Coats). |
| 32 CFR 117.10 (Cornell LII) | Downloaded. |
| ICPG 704.4 (archive.dni.gov) | Retrieved through Firecrawl. |
| 32 CFR 156.5 (eCFR, up to date as of 11/10/2026) | Retrieved through Firecrawl. |
| DCSA FCL Orientation Handbook: https://www.dcsa.mil/Portals/128/Documents/CTP/fc/DCSA%20FCL_Orientation_Handbook_20260828.pdf | **Could not fetch.** Direct download 403, Wayback 429. A proxy-based fetch was denied by the permission system and I did not work around it. Evidence below is from search-index snippets only. |
| DoDM 5200.02 | 403. Seen only as a search snippet. |
| FY26-Q4 QPR | Not yet published at the matching URL (S3 403, where the Q3 URL returns 200). |

### The four judge claims
1. **61 vs 57: confirmed (wrong quarter).** QPR p.4 table "Background Investigations", columns FY25 Q4 / FY26 Q1 / FY26 Q2 / FY26 Q3:
   - Initial Moderate Risk (90% Fastest): 68 / 59 / 51 / **49**
   - Initial Moderate Risk (100% Cases): – / – / **61** / **57**
   - Initial High Risk (90% Fastest): 157 / 108 / 90 / **67**
   - Initial High Risk (100% Cases): – / – / 108 / **82**
   
   61 is the Q2 value. 49, 82 and 67 in the file are correct.
2. **180–270 for every level: confirmed.** Running the handler gives min 180 / max 270 for secret, ts and ts_sci alike.
   - Slide 61 quarterly averages, FY25-Q3 to FY26-Q3: Top Secret 293, 333, 259, 221, 243 (range 221–333); Secret 187, 180, 209, 183, 197 (range 180–209).
   - So 180–270 matches neither level: 180 is below every TS quarter, and 270 is above every Secret quarter.
   - The modifier cites SEAD 7, which contains no day counts except "five business days" (§G.1, §H.2.a) and "10 business days" (§G.5).
   - 180/270 is in no cited source and nowhere in R4. It has been there since the first commit (69292b2) with no derivation.
3. **270–540 vs 287–467: a data error plus a logic error, not legitimate.**
   - Logic: the modifier replaces the level-specific baseline with one constant, even though its own text says the case is "processed essentially as a new initial investigation — same order of magnitude as the 'secret'/'ts' end-to-end figures above".
   - Data: the 90–270 FCL add-on is common to both cases, so the whole anomaly comes from the unsourced 180–270 against the 197 baseline.
   - It is worse for TS: lapsed 180–270 vs a new initial of 243; with no FCL, 270–540 vs 333–513.
   - SEAD 7 allows reuse of prior investigative records (fn.2, §F.2.a), but no source puts a number on it.
4. **"medians": confirmed at HEAD.**
   - The uncertaintyNote says "medians/typical ranges", while the baseline driver says "No primary source gives a median, only quarterly averages", and slide 61 is titled "Average Timeliness".
   - The uncommitted edit changes it to "quarterly averages or published typical ranges, not medians". That fixes the word, but "published typical ranges" and "historical DCSA timeliness reporting" are still untrue for the 5, 180–270 and 90–270 figures.

### Figure-by-figure check of `data/timelines.json`
**Secret (`investigations.secret`)**

| Item | File | Source | Verdict |
|---|---|---|---|
| meanDays | 197 | Slide 61, "Average Timeliness - Initial Secret", FY26-Q3: 21 \| 59 \| 117 = 197 | correct |
| medianDays | null | Slide gives averages only | correct |
| Initiate / investigate / adjudicate | 21 / 59 / 117 | Same | correct |
| "follows 180, 209, and 183" | 180, 209, 183 | FY25-Q4 180, FY26-Q1 209, FY26-Q2 183 | correct |
| QPR 100%-of-cases figure | 61 | 57 (QPR p.4) | **wrong** |
| QPR fastest-90% figure | 49 | 49 | correct |
| "DCSA changed its measurement methodology … 100% of cases" | — | QPR p.3: "Starting this quarter, **the PAC** … is altering its reporting methodology to cover 100% of cases." Slide 61 never states its method. | ambiguous (attributed to the wrong body) |
| "Moderate-Risk/Secret-tier", "government-wide" | — | Legacy p.4: "the time **DCSA** … needed to process … Moderate Risk cases (including Secret clearances)"; legend "Moderate Risk Average (T3/T2)" | ambiguous (minor): the tier includes T2 public trust, and the data is DCSA-wide, not government-wide |

**Top Secret (`investigations.ts`)**

| Item | File | Source | Verdict |
|---|---|---|---|
| meanDays | 243 | Slide 61, FY26-Q3: 20 \| 97 \| 126 = 243 | correct |
| medianDays | null | Averages only | correct |
| Initiate / investigate / adjudicate | 20 / 97 / 126 | Same | correct |
| QPR 100% / fastest-90% | 82 / 67 | 82 / 67 | correct |
| Investigation phase 234 → 97 | 234 → 97 | FY25-Q3 234, FY26-Q3 97 | correct |
| Adjudication 40 → 126 | 40 → 126 | Same | correct; "just as sharply" is loose (−137 vs +86 days) |
| "333, 259, 221, 243 over the last four quarters" | — | Matches | correct |
| "have not improved net" | — | 293 → 243 (−50 days year over year); 333 → 243 (−90) | **wrong** |
| "ticked back up this quarter" | — | 221 → 243 | correct |

**Modifiers**

| Item | File | Source | Verdict |
|---|---|---|---|
| interim days | null / null | QPR p.4 "Preliminary Determination Timeliness", FY26-Q3: High 24, Moderate 11 (government-wide, partial agency reporting) | Null is defensible. "No current primary source publishes an average…" is ambiguous. |
| interim "capped at one year" | — | 117.10(l): "shall not exceed one year unless approved by the applicable CSA" | correct, omits the CSA-approval exception |
| interim "never covers RD/COMSEC/NATO" | — | 117.10(l)(1): "Access to RD, COMSEC information, and NATO information requires a final SECRET eligibility determination". 117.10(l)(2) makes an exception for a temporary TS plus a final Secret. | mostly correct, overstated |
| interim SCI/SAP discretionary | — | 117.10(l)(3): "a determination made by the granting authority" | correct |
| lapsed_lt_2y: 7-year rule | — | SEAD 7 §E.2.b: "more than seven years old … agencies may accept … on a case-by-case basis" | correct |
| lapsed_lt_2y and lapsed_gt_2y: 24-month threshold | — | Not in SEAD 7, ICPG 704.4 or 117.10. It is in 32 CFR 156.5(h)(3): "…or there has been a break in service of more than 24 months." | **wrong source** |
| lapsed_lt_2y typicalDaysMin | 5 | SEAD 7 §G.1: "within five business days of receipt by the agency's personnel security program". That is a deadline for one step, counted in business days. §G.1–G.4 exclude record retrieval, extra checks, polygraph and suitability processing. | **wrong as encoded** (wrong units; a deadline treated as a minimum) |
| lapsed_gt_2y days | 180 / 270 | Absent from every cited source | **wrong (unsourced)** |
| lapsed_gt_2y "SEAD 7 reciprocity no longer applies" after 24 months | — | SEAD 7 has no break-in-service exception; fn.3 says departing a position is not a revocation | **wrong attribution** |
| no_fcl days, "6–18 months", "majority rejected" | 90 / 270 | Handbook could not be fetched. Snippets show a Day-20 / Day-45 process. An Aug-2026 DCSA FCL briefing (Navy Gold Coast Expo) says "DCSA is unable to provide a timeline due to many variables". R4 §8 calls 3–9 months "secondary/trade-press, not DCSA-published-statistic". | **unverifiable; attributed to the wrong source** |

### Other ways the tool misstates its sources
- **T1 – "only one quarterly average" (line 235).** The point-estimate note says the source "publishes only one quarterly average". Slide 61 publishes five per level.
- **T2 – range example (lines 235 and 59).** The note says a real range is returned "where the source publishes one (e.g. lapsed_gt_2y)", and the description promises a real range "where the underlying DCSA data supports one … Never an invented number". Both are contradicted by 180–270.
- **T3 – lapsed branch (line 159).** `drivers.length = 0` also wipes the ts_sci SCI caveat. The NISPPAC URL stays in `sources` after its figure is dropped (also true for "active").
- **T4 – lapsed_lt_2y with no FCL (line 193).** It returns minDays 5 next to an FCL wait of 90–270. The FCL wait is only folded in when both ends are non-null.
- **T5 – labels conflate phases (lines 82, 89).** "Baseline initial investigation" labels an end-to-end figure; DCSA's own "Investigate" segment is only 59/97 days. The ts_sci driver calls a single figure a "range" that "reflects the TS investigation only".
- **T6 – "active" (around line 116).** It assumes the active eligibility is at or above the target level. SEAD 7 §E.1.c reciprocity covers only "the same or higher level", so Secret to TS is an upgrade, not reciprocity.
- **Optional source you could add:** Legacy p.8, "Average Days to Accept a Previously Vetted Individual (Security Clearance Reciprocity)", FY26-Q3 = 2 days (DoW only), is a measured figure for the "active" case.

### Minimal corrections
**`data/timelines.json`**

1. **`secret.notes`:**
   - Change "averaging 61 days for Moderate-Risk/Secret-tier cases" to "averaging 57 days for Moderate-Risk-tier cases (Tiers 3 and 2, which include Secret)".
   - Replace the "DCSA changed its measurement methodology…" sentence with: "Starting in FY2026 Q3, the Performance Accountability Council's TW 2.0 reporting switched from averaging the fastest 90% of cases to averaging 100% of cases; the DCSA industry slide is labeled 'Average Timeliness' and does not say which method it uses."
2. **`ts.notes`:**
   - Change "High-Risk/Top-Secret-tier" to "High-Risk-tier (Tiers 5 and 4, which include Top Secret)".
   - Replace "…risen just as sharply (40 … to 126 now), which is why end-to-end totals (333, 259, 221, 243 …) have not improved net and ticked back up this quarter." with "…more than tripled (40 days to 126), so the end-to-end total improved far less than the investigation phase alone: 293 days four quarters ago, then 333, 259, 221, and 243 now (down 50 year over year, up 22 from last quarter)."
3. **`lapsed_gt_2y`:**
   - Set `"typicalDaysMin": null, "typicalDaysMax": null`.
   - Change the source to `{"title":"32 CFR § 156.5(h)(3) — DoD Personnel Security Program: reciprocal acceptance (eCFR)","url":"https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-F/part-156/section-156.5","lastVerified":"2026-11-12"}`.
   - Rewrite the text to attribute the 24-month rule to 156.5(h)(3) (SEAD 7's cutoff is a seven-year-old investigation), and say the target level's baseline applies.
   - With no code change, the existing null-day fallback (lines ~162–172) keeps the per-level baseline: 197 for Secret, 243 for TS/TS-SCI, and 287–467 / 333–513 with no FCL. That fixes claims 2 and 3.
4. **`lapsed_lt_2y`:**
   - Set `"typicalDaysMin": null`.
   - Rewrite the text: §G.1 "within five business days" is a deadline for the determination step only, excluding §G.2–G.4 and suitability processing; cite 156.5(h)(3) for the 24 months; no published end-to-end figure. This needs code change C3.
5. **`no_fcl`:**
   - Recommended: set `"typicalDaysMin": null, "typicalDaysMax": null`, and replace the "3-9 months … 6-18 months" sentence with "DCSA says it cannot give an FCL timeline because it depends on many variables, including the company's responsiveness; trade-press estimates of several months are not DCSA figures."
   - Alternative: keep 90/270 only if you cite a source that actually says 3–9 months. R4 names none.
6. **`interim` (text only):**
   - "never covers RD, COMSEC, NATO" → "requires a final SECRET eligibility determination (117.10(l)(1)–(2))".
   - "capped at one year" → "one year unless the CSA approves longer; the CSA may withdraw it (117.10(l), (l)(4))".
   - Soften "No current primary source publishes…" to "no industry-specific figure", and note the QPR's 11/24-day government-wide proxy.

**`lib/tools/estimate-timeline.ts`**

- **C1 – line 59, description:** "Returns DCSA's most recent published quarterly average for the target level (a mean, not a median), adds a separately sourced employer-FCL wait only when one exists, and returns no number where no primary source publishes one — plus key drivers and an explicit uncertainty note."
- **C2 – lines 235–236, both uncertaintyNote branches:**
  - Opening sentence → "The baseline is DCSA's published quarterly average for initial industry clearances (a mean, not a median); it is not a guarantee."
  - Point-estimate tail → "…returns a single figure because it is DCSA's most recent quarterly average; the baseline driver lists prior quarters' averages, which move from quarter to quarter." Drop the lapsed_gt_2y example.
- **C3 – lines 144–172:** add a `current_status === "lapsed_lt_2y"` branch that sets `estimate = {minDays:null,maxDays:null,medianDays:null}`, clears `drivers` and `sources`, then pushes the modifier's driver and source. For lapsed_gt_2y, append the driver on top of the baseline without clearing. This also resolves T3 and T4.
- **C4 – labels:**
  - Line 82 → "Baseline: initial clearance, end to end (DCSA industry quarterly average)".
  - Line 89 → "the figure above is the Top Secret end-to-end average only."
  - "active" driver: add "assumes active eligibility at or above the target level; an upgrade (e.g. Secret→TS) needs a new investigation."

### Same errors elsewhere
- `data/rules.json`:
  - `dcsa-timeliness.summary` still says "61 days for Secret-tier" in the working tree.
  - `sead7` summary and keyPoints attribute the 24-month rule to SEAD 7; none of that rule's three sources contain it.
- `research/R4-domain.md`: line 21 has "61 days", line 127 attributes the 24 months to SEAD 7.
- `DECISIONS.md` line 248 and `CHANGELOG.md` line 113 call 180/270 "sourced". `DECISIONS.md` line 372 attributes 90–270 to the "DCSA FCL handbook".
- `tests/unit/estimate-timeline.test.ts`: the lapsed_lt_2y range test, both point-estimate note tests (which expect /lapsed_gt_2y/ and a range), and the FCL numeric tests if no_fcl is nulled will need updating.
- `SOURCES.md` must be regenerated with `scripts/generate-sources.ts` if a source URL changes; the data-integrity test enforces this.

Evidence (downloads, slide crops, scripts) is in `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/tlverify/`. The two slide crops are `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/tlverify/out/nis_ts_chart.png` and `/private/tmp/claude-501/-Users-zakirjiwani-speedrunapps/6ce2a1f9-c60a-40f0-bb56-638567e41bbd/scratchpad/tlverify/out/nis_secret_chart.png`.
