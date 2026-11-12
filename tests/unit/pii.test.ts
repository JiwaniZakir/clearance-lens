import { describe, it, expect } from "vitest";
import {
  scanValueForPiiCui,
  assertNoPiiCui,
  PiiCuiError,
  buildFriendlyRejectionMessage,
} from "@/lib/guard/pii";

function categoriesOf(text: string): string[] {
  return scanValueForPiiCui(text).map((f) => f.category).sort();
}

describe("SSN detection", () => {
  it.each([
    "my ssn is 123-45-6789",
    "SSN: 078 05 1120",
    "123-45-6789", // dash shape alone is distinctive enough to reject unconditionally
    "000-12-3456", // invalid-area SSN shape — still rejected (safe-by-default)
    "please use 219 09 9999 for verification",
    "social security number 234-56-7890",
    "SS# 345-67-8901",
    "soc sec 456789123", // keyword + bare 9 digits
    "ss# 123456789", // "#"-ending keyword + bare 9 digits, no dash pattern to mask a regression
    "123.45.6789", // dotted separator (Presidio's SSN5 pattern; research/R1-leverage.md §3.2)
  ])("flags SSN-shaped input: %s", (text) => {
    expect(categoriesOf(text)).toContain("ssn");
  });

  it.each([
    "call me at (415) 555-0199",
    "415-555-0199",
    "+1 415 555 0199",
    "phone: 415.555.0199",
    "my number is 4155550199",
    "order number 123456789", // bare 9 digits, NO ssn keyword
    "tracking id 123456789012",
    "confirmation code: 987654321", // bare 9 digits, no keyword
  ])("does NOT flag ordinary phone/number input: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("ssn");
  });
});

describe("Date of birth detection", () => {
  it.each([
    "DOB: 03/15/1998",
    "date of birth 1998-03-15",
    "I was born on March 15, 1998",
    "born in 1998",
    "D.O.B. 15 March 1998",
    "my birthday is 07/04/1990",
  ])("flags DOB-shaped input: %s", (text) => {
    expect(categoriesOf(text)).toContain("dob");
  });

  it.each([
    "my interview is scheduled for 03/15/2026",
    "available starting 2026-01-15",
    "the role was posted on January 5, 2026",
    "I graduated in May 2020",
    "the investigation closed 2023-11-01", // date, no birth keyword
    "let's meet on 12/25/2026",
  ])("does NOT flag ordinary dates without birth context: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("dob");
  });
});

describe("Passport number detection", () => {
  it.each([
    "my passport number is X1234567",
    "passport: A12345678",
    "passport no. 987654321",
    "Passport# B7654321",
    "here is my passport 123456789",
  ])("flags passport-shaped input: %s", (text) => {
    expect(categoriesOf(text)).toContain("passport");
  });

  it.each([
    "I need a passport to travel for this role",
    "do I need a passport for this position?",
    "my passport is up to date", // no alphanumeric ID token with a digit
    "France", // 6 letters, no digit — must not be mistaken for an ID token
    "I'll renew my passport soon",
  ])("does NOT flag passport mentions without an ID number: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("passport");
  });
});

describe("Case / investigation number detection", () => {
  it.each([
    "my case number is 20231145678",
    "investigation number: 98765",
    "e-QIP case ID 445566",
    "OPM case 7788990",
    "case # A99887",
    "investigation # 554433",
  ])("flags case/investigation numbers: %s", (text) => {
    expect(categoriesOf(text)).toContain("case_number");
  });

  it.each([
    "what's the case for sponsoring an FCL?",
    "in my case, I have no clearance yet",
    "how long does the investigation usually take?",
    "my employer is investigating FCL sponsorship",
    "case closed without a number mentioned",
  ])("does NOT flag ordinary case/investigation talk: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("case_number");
  });
});

describe("Clearance record text detection", () => {
  it.each([
    "here is my DISS subject summary",
    "my JPAS record shows active",
    "NBIS record attached",
    "the e-adjudication result was favorable",
    "investigation closed per my adjudication history",
  ])("flags clearance record/adjudication-system text: %s", (text) => {
    expect(categoriesOf(text)).toContain("clearance_record");
  });

  it.each([
    "I have an active Secret clearance",
    "my clearance is current and active",
    "I hold a TS/SCI clearance",
    "can a startup sponsor my clearance?",
    "I'm interested in roles that require a clearance",
    // Found live via the spec §5 agent-in-the-loop persona eval: bare
    // mentions of DISS/JPAS/NBIS (asking ABOUT the system, not pasting a
    // record from it) were wrongly rejected — including explain_rule's own
    // "nbis-diss" topic id and its real rule title, making that rule
    // permanently unreachable. System names now require actual
    // record-indicating context immediately adjacent (see the regex's own
    // comment in lib/guard/pii.ts).
    "nbis-diss",
    "explain DISS to me",
    "NBIS vs. DISS: Current System of Record",
    "what is nbis",
    "tell me about JPAS",
  ])("does NOT flag self-attested clearance status or a bare system-name mention: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("clearance_record");
  });
});

describe("Image / binary upload detection", () => {
  it("flags an image data URI", () => {
    expect(categoriesOf("here: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA")).toContain(
      "image_upload",
    );
  });

  it("flags a generic binary data URI", () => {
    expect(categoriesOf("data:application/pdf;base64,JVBERi0xLjQKJc")).toContain("binary_data");
  });

  it("flags a long unbroken base64-looking run with no MIME prefix", () => {
    const blob = "A".repeat(50) + "b64".repeat(60) + "==";
    expect(categoriesOf(`payload ${blob}`)).toContain("binary_data");
  });

  it.each([
    "I attached my resume at example.com/resume.pdf",
    "see screenshot described: a green checkmark icon",
    "image/png is a common format",
    "base64 encoding is sometimes used for binary transport", // short mention, no actual blob
  ])("does NOT flag ordinary text mentioning files/images: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("image_upload");
  });
});

describe("recursive scanning of structured input", () => {
  it("finds PII nested inside objects and arrays", () => {
    const input = {
      role_id: "abc123",
      fields_user_approved: {
        bio: "Active Secret clearance",
        extra: ["my ssn is 123-45-6789"],
      },
    };
    expect(scanValueForPiiCui(input).map((f) => f.category)).toContain("ssn");
  });

  it("passes a realistic clean multi-field input", () => {
    const input = {
      role_id: "staff-engineer-defense-c53eba4f",
      current_status: "none",
      target_level: "secret",
      employer_has_fcl: "unknown",
      notes: "I'm a US citizen, no prior clearance, graduated May 2024.",
    };
    expect(scanValueForPiiCui(input)).toHaveLength(0);
  });

  it("does not throw on non-string/object primitives (numbers, booleans, null)", () => {
    expect(scanValueForPiiCui(42)).toHaveLength(0);
    expect(scanValueForPiiCui(true)).toHaveLength(0);
    expect(scanValueForPiiCui(null)).toHaveLength(0);
    expect(scanValueForPiiCui(undefined)).toHaveLength(0);
  });
});

describe("assertNoPiiCui / PiiCuiError", () => {
  it("throws PiiCuiError with a friendly, non-echoing message for a single finding", () => {
    expect(() => assertNoPiiCui("my ssn is 123-45-6789")).toThrow(PiiCuiError);
    try {
      assertNoPiiCui("my ssn is 123-45-6789");
    } catch (e) {
      expect(e).toBeInstanceOf(PiiCuiError);
      const err = e as PiiCuiError;
      expect(err.message).not.toContain("123-45-6789");
      expect(err.findings.map((f) => f.category)).toEqual(["ssn"]);
    }
  });

  it("combines multiple findings into one friendly message", () => {
    const msg = buildFriendlyRejectionMessage([
      { category: "ssn", message: "ssn message" },
      { category: "dob", message: "dob message" },
    ]);
    expect(msg).toContain("ssn message");
    expect(msg).toContain("dob message");
  });

  it("does not throw for clean input", () => {
    expect(() => assertNoPiiCui({ role_id: "abc", minutes: 90 })).not.toThrow();
  });

  it("deduplicates repeated findings of the same category", () => {
    const findings = scanValueForPiiCui("ssn 123-45-6789 and also 987-65-4321");
    expect(findings.filter((f) => f.category === "ssn")).toHaveLength(1);
  });
});

// Red-team pass (spec §5): every case below was confirmed LIVE as a real
// bypass of the pre-fix guard before the corresponding fix landed in
// lib/guard/pii.ts (normalizeForScan, rot13 pass, percent-decode pass,
// embedded-base64-token pass, and fail-closed depth limit). See DECISIONS.md
// for the write-up of each.
describe("red-team: Unicode obfuscation of an SSN", () => {
  it.each([
    ["zero-width space spliced into the dash position", "my ssn is 123​-45-6789"],
    ["zero-width non-joiner spliced into both dash positions", "123‌-45‌-6789"],
    ["full-width digits (Unicode compatibility digits), with keyword", "my ssn is １２３-４５-６７８９"],
    ["full-width digits, dash shape alone (no keyword needed)", "１２３-４５-６７８９"],
    ["Unicode HYPHEN (U+2010) in place of \"-\"", "123‐45‐6789"],
    ["Unicode NON-BREAKING HYPHEN (U+2011) in place of \"-\"", "123‑45‑6789"],
    ["Unicode EN DASH (U+2013) in place of \"-\"", "123–45–6789"],
    ["Unicode MINUS SIGN (U+2212) in place of \"-\"", "123−45−6789"],
    ["FULLWIDTH HYPHEN-MINUS (U+FF0D) in place of \"-\"", "123－45－6789"],
  ])("still flags as ssn despite %s: %s", (_label, text) => {
    expect(categoriesOf(text)).toContain("ssn");
  });
});

describe("red-team: encoded/obfuscated PII hidden in an otherwise-plain field", () => {
  it("catches a base64-encoded SSN sentence with no cleartext keyword and under the long-blob threshold", () => {
    const encoded = Buffer.from("my ssn is 123-45-6789").toString("base64");
    expect(encoded.length).toBeLessThan(200); // short enough to dodge LONG_BASE64_RUN
    expect(categoriesOf(encoded)).toContain("ssn");
  });

  it("catches a base64-encoded date-of-birth sentence", () => {
    const encoded = Buffer.from("date of birth 1998-03-15").toString("base64");
    expect(categoriesOf(encoded)).toContain("dob");
  });

  it("catches a base64-encoded passport sentence", () => {
    const encoded = Buffer.from("passport number is X1234567").toString("base64");
    expect(categoriesOf(encoded)).toContain("passport");
  });

  it("catches a base64 PII blob embedded inside ordinary surrounding text", () => {
    const encoded = Buffer.from("my ssn is 123-45-6789").toString("base64");
    expect(categoriesOf(`Here's some context: ${encoded} — thanks!`)).toContain("ssn");
  });

  it("catches ROT13'd trigger keyword + a bare 9-digit run (digits/dashes pass through ROT13 unchanged)", () => {
    expect(categoriesOf("my ffa vf 123456789")).toContain("ssn"); // rot13("ssn is") = "ffa vf"
  });

  it("catches a fully ROT13'd PII sentence too (digits/punctuation are unchanged by ROT13 either way)", () => {
    const rot13 = (s: string) =>
      s.replace(/[a-zA-Z]/g, (c) => {
        const base = c <= "Z" ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      });
    expect(categoriesOf(rot13("my ssn is 123-45-6789"))).toContain("ssn");
  });

  it("catches a percent-encoded SSN where the DIGITS themselves are encoded, not just surrounding spaces", () => {
    expect(categoriesOf("my ssn is %31%32%33-%34%35-%36%37%38%39")).toContain("ssn");
  });

  it("catches a double-percent-encoded SSN (bounded iterative decode)", () => {
    expect(categoriesOf("my ssn is %2531%2532%2533-%2534%2535-%2536%2537%2538%2539")).toContain("ssn");
  });

  it("still catches the plain space-only percent-encoding case too (regression)", () => {
    expect(categoriesOf("my%20ssn%20is%20123-45-6789")).toContain("ssn");
  });
});

describe("red-team: recursive-scan depth limit fails closed, not open", () => {
  function nestArray(value: unknown, levels: number): unknown {
    let v = value;
    for (let i = 0; i < levels; i++) v = [v];
    return v;
  }

  it("flags (rather than silently passing) an SSN nested past the 8-level scan depth", () => {
    const deeplyNested = { role_id: "x", wrapper: nestArray("my ssn is 123-45-6789", 9) };
    const categories = scanValueForPiiCui(deeplyNested).map((f) => f.category);
    expect(categories).toContain("unscannable_structure");
  });

  it("still scans normally within the depth limit (regression — e.g. 7 levels)", () => {
    const withinLimit = { wrapper: nestArray("my ssn is 123-45-6789", 7) };
    expect(scanValueForPiiCui(withinLimit).map((f) => f.category)).toContain("ssn");
  });

  it("an ordinary flat tool input never comes close to the depth limit (no false positive)", () => {
    const ordinary = {
      role_id: "staff-engineer-defense-c53eba4f",
      fields_user_approved: { headline: "Backend engineer", highlights: ["Shipped X", "Led Y"] },
    };
    expect(scanValueForPiiCui(ordinary)).toHaveLength(0);
  });
});

describe("red-team: obfuscation-defeat passes do not introduce new false positives", () => {
  it.each([
    "I'm a US citizen, no prior clearance, graduated May 2024.",
    "I attached my resume at example.com/resume.pdf",
    "my GitHub username is torvalds and I've been coding for 10 years",
    "ThisIsJustARegularRunOnSentenceWithNoSpacesOrPunctuationAtAll",
    "role_id staff-engineer-defense-c53eba4f, limit 10, remote true",
    "available starting 2026-01-15, open to onsite or remote",
    "a16z speedrun Talent Network lists this role at $150000-$200000",
  ])("does not flag ordinary text once ROT13/base64/percent-decode passes are added: %s", (text) => {
    expect(categoriesOf(text)).toHaveLength(0);
  });
});

// Regression for DECISIONS.md (judging panel round 2, hard-constraint
// finding): prepare_consented_card's filter was bypassed by trivial
// rephrasing of 4 of 5 protected categories, found live by two independent
// judges using the MCP endpoint and the REST API.
describe("judging panel round 2: PII bypasses found via rephrasing, now fixed", () => {
  it.each([
    ["Born 03/14/1992, happy to relocate", "dob"],
    ["My e-QIP request number is 2024-SEC-0098765", "case_number"],
    ["JPAS Owning SMO: 123456, PSQ submitted", "clearance_record"],
    ["My file 2024-ABC-56789 is in review", "case_number"],
    ["Reference number 2024-ABC-56789", "case_number"],
    ["card 4111 1111 1111 1111 exp 12/27", "credit_card"],
  ])("now catches: %s -> %s", (text, expectedCategory) => {
    expect(categoriesOf(text)).toContain(expectedCategory);
  });

  it("does not reintroduce the nbis-diss bare-mention false positive while adding JPAS field-jargon detection", () => {
    expect(categoriesOf("nbis-diss")).toHaveLength(0);
    expect(categoriesOf("explain DISS to me")).toHaveLength(0);
  });
});

describe("judging panel round 3: PII bypasses found via rephrasing, now fixed", () => {
  it.each([
    ["my case number is DCSA-2026-0417", "case_number"],
    ["my clearance was adjudicated under e-QIP", "clearance_record"],
    ["my SOR was adjudicated favorably in 2021 with T5 scope and CI poly", "clearance_record"],
    ["my investigation was submitted with tier 5 investigation scope", "clearance_record"],
  ])("now catches: %s -> %s", (text, expectedCategory) => {
    expect(categoriesOf(text)).toContain(expectedCategory);
  });

  it("does not flag a bare, educational mention of e-QIP or SOR with no adjudication-status language nearby", () => {
    expect(categoriesOf("what is e-QIP?")).toHaveLength(0);
    expect(categoriesOf("explain what an SOR is")).toHaveLength(0);
  });
});

describe("judging panel round 4: PII bypasses found via rephrasing, now fixed", () => {
  it.each([
    ["DCSA case 2024-0045678, autonomy engineer", "case_number"],
    ["born march second nineteen ninety two, autonomy engineer", "dob"],
  ])("now catches: %s -> %s", (text, expectedCategory) => {
    expect(categoriesOf(text)).toContain(expectedCategory);
  });

  it("does not flag an ordinary mention of a month and day with no birth context", () => {
    expect(categoriesOf("the posting closes march second, autonomy engineer")).not.toContain("dob");
  });

  it("does not flag ordinary case/investigation talk with a nearby unrelated number", () => {
    expect(categoriesOf("in case the company has over 50000 employees")).not.toContain("case_number");
  });
});

describe("judging panel round 5: hard-constraint findings, now fixed", () => {
  it.each([
    "SECRET//NOFORN -- the propulsion subsystem spec sheet shows a 12 percent thrust margin",
    "(S//NF) the test results were favorable",
    "TOP SECRET//SI/TK briefing notes from the meeting",
  ])("flags a classification/control marking: %s", (text) => {
    expect(categoriesOf(text)).toContain("classification_marking");
  });

  it("does not flag ordinary self-attested clearance status (no // marking present)", () => {
    expect(categoriesOf("I have an active Secret clearance and a Top Secret clearance background")).not.toContain(
      "classification_marking",
    );
  });
});

describe("judging panel round 3: credit-card false positive on UUID-shaped identifiers, now fixed", () => {
  it.each([
    "00000000-0000-4000-8000-000000000000",
    "11111111-1111-1111-1111-111111111111",
    "99999999-9999-9999-9999-999999999999",
    "fa3560d4-2dc5-d39b-c75a-013bb4aaef71",
  ])("does NOT flag a UUID-shaped identifier (role_id, etc.) as a credit card: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("credit_card");
  });

  it("still flags a real credit-card number that is not UUID-shaped", () => {
    expect(categoriesOf("4111111111111111")).toContain("credit_card");
    expect(categoriesOf("card 4111 1111 1111 1111 exp 12/27")).toContain("credit_card");
  });
});

describe("judging panel round 2: prepare_consented_card's stricter bare-identifier check (scanForBareIdentifierShapes)", () => {
  it("rejects a bare, unlabeled 9-digit SSN-shaped number with no keyword context at all", async () => {
    const { scanForBareIdentifierShapes } = await import("@/lib/guard/pii");
    expect(scanForBareIdentifierShapes({ notes: "123456789" })).toHaveLength(1);
  });

  it("rejects a bare, unlabeled 9-digit ID-shaped number with no keyword context at all", async () => {
    const { scanForBareIdentifierShapes } = await import("@/lib/guard/pii");
    expect(scanForBareIdentifierShapes({ headline: "My ID number is 912345678" })).toHaveLength(1);
  });

  it("does not flag an ordinary field with no 9-digit run", async () => {
    const { scanForBareIdentifierShapes } = await import("@/lib/guard/pii");
    expect(scanForBareIdentifierShapes({ headline: "Backend engineer, 6 yrs", availability: "Now" })).toHaveLength(0);
  });
});

describe("judging panel round 7: hard-constraint finding, now fixed (email/phone had no detector at all)", () => {
  it.each(["jane.doe@example.com", "contact me at jane.doe@example.com or 555-123-4567", "reach out: j.doe+jobs@sub.example.co.uk"])(
    "flags an email address: %s",
    (text) => {
      expect(categoriesOf(text)).toContain("email");
    },
  );

  it.each([
    "555-123-4567",
    "(555) 123-4567",
    "555.123.4567",
    "+1 555-123-4567",
    "contact me at jane.doe@example.com or 555-123-4567",
  ])("flags a formatted phone number: %s", (text) => {
    expect(categoriesOf(text)).toContain("phone");
  });

  it("flags both categories when a string contains an email AND a phone number, exactly the reported bypass", () => {
    const cats = categoriesOf("contact me at jane.doe@example.com or 555-123-4567");
    expect(cats).toContain("email");
    expect(cats).toContain("phone");
  });

  it("does not flag an unformatted, unrelated 10-digit run (a bare phone number needs separators, same conservative stance as the SSN detector)", () => {
    expect(categoriesOf("my employee id is 5551234567")).not.toContain("phone");
  });

  it("does not flag ordinary text with no @ sign or phone-shaped digit grouping", () => {
    const cats = categoriesOf("I'm a US citizen with 5 years of Python experience, available in 2 weeks");
    expect(cats).not.toContain("email");
    expect(cats).not.toContain("phone");
  });

  it("does not flag a role id, dollar comp range, or date as a phone number", () => {
    const cats = categoriesOf("Role abc-123, $120,000-$180,000, posted 2026-01-15");
    expect(cats).not.toContain("phone");
  });
});

describe("judging panel round 8: hard-constraint findings, now fixed", () => {
  // A bare birthdate typed the way people normally type one — no "DOB" or
  // "born" keyword — previously passed every tool.
  it.each(["01/15/1990", "1990-01-15", "15/01/1990", "Available starting 01/15/1990 full time"])(
    "flags a day-precise date with a birth-plausible year, with no keyword: %s",
    (text) => {
      expect(categoriesOf(text)).toContain("dob");
    },
  );

  it.each([
    "Available 2026-12-01",
    "Available starting 01/15/2027",
    "Shipped v2 on 2019-06-01",
    "Graduated 05/2015",
    "Active TS since 2008",
    "issued_at 2026-11-12T20:25:55.634Z",
    "Role ee11f2da-5d5e-464b-adc3-6e15b7c9942b",
  ])("does NOT flag a recent/future date, a month-year, a bare year, a timestamp, or a UUID: %s", (text) => {
    expect(categoriesOf(text)).not.toContain("dob");
  });

  it("a question about the NBIS/DISS record SYSTEMS is not mistaken for pasted record content", () => {
    expect(categoriesOf("what is the difference between NBIS and DISS record systems")).not.toContain(
      "clearance_record",
    );
    expect(categoriesOf("DISS recordkeeping rules")).not.toContain("clearance_record");
  });

  it("actual record content is still rejected", () => {
    expect(categoriesOf("My DISS record shows eligibility granted")).toContain("clearance_record");
  });
});

describe("judging panel round 8: fragmented SSN across prepare_consented_card fields", () => {
  const ORDER = [
    "headline",
    "clearance_status_self_reported",
    "citizenship_status_self_reported",
    "highlights",
    "github_username",
    "availability",
    "notes",
  ];

  it("rejects an SSN split across two fields with filler text between the digit groups (the reported bypass)", async () => {
    const { scanConcatenatedFields } = await import("@/lib/guard/pii");
    const cats = scanConcatenatedFields({ headline: "SSN part A 123-45", notes: "SSN part B 6789 thanks" }, ORDER).map(
      (f) => f.category,
    );
    expect(cats).toContain("ssn");
  });

  it("is not defeated by inserting decoy digits between the fragments", async () => {
    const { scanConcatenatedFields } = await import("@/lib/guard/pii");
    const cats = scanConcatenatedFields({ headline: "SSN part 1: 123-45", notes: "part 2 (of 2): 6789" }, ORDER).map(
      (f) => f.category,
    );
    expect(cats).toContain("ssn");
  });

  it("does not flag an ordinary card with no SSN reference, regardless of how many digits it has", async () => {
    const { scanConcatenatedFields } = await import("@/lib/guard/pii");
    expect(
      scanConcatenatedFields(
        { headline: "Backend engineer, 6 yrs", availability: "Available 2026-12-01", notes: "Led a 12-person team" },
        ORDER,
      ),
    ).toHaveLength(0);
  });
});
