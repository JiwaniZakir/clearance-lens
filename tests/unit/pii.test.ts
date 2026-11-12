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
