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
  ])("does NOT flag self-attested clearance status: %s", (text) => {
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
