import { describe, it, expect, vi } from "vitest";
import { generateKeyPairSync, sign } from "crypto";

vi.mock("@/lib/speedrun/client", () => ({ getJob: vi.fn() }));

import { getJob } from "@/lib/speedrun/client";
import { extractRequirementSignals, extractStatedSignals } from "@/lib/speedrun/infer";
import { RULES, findRule } from "@/lib/rules-data";
import { getRoleRubricTool } from "@/lib/tools/get-role-rubric";
import { estimateTimelineTool } from "@/lib/tools/estimate-timeline";
import { prepareSignedAttestationTool } from "@/lib/tools/prepare-signed-attestation";
import { callTool } from "@/lib/tools/wrap";
import type { SpeedrunJobDetailResponse } from "@/lib/speedrun/types";

// DECISIONS.md D-046. Judging panel round 9, 4 of 4 judges, verified against
// eCFR and the Federal Register: a green card makes someone a "U.S. person"
// under ITAR (22 CFR 120.62), but security clearances are limited to U.S.
// citizens (EO 12968 § 3.1(b); 32 CFR 117.10(k)). The product told green card
// holders the opposite, on its flagship example.

const US_ROLE = { industry: "defense_space", location: "Costa Mesa, CA" };

describe("requirement extraction: a stated clearance implies U.S. citizenship", () => {
  it("adds an inferred citizenship-for-clearance signal, with the legal reason, instead of the weaker U.S.-person one", () => {
    const signals = extractRequirementSignals("Must be able to obtain a Secret clearance.", US_ROLE);
    const citizenship = signals.find((s) => s.value === "us_citizen_required_for_clearance");
    expect(citizenship?.basis).toBe("inferred");
    expect(citizenship?.evidence).toMatch(/limited to U\.S\. citizens/);
    expect(citizenship?.evidence).toMatch(/green card/i);
    expect(citizenship?.evidence).toMatch(/117\.10\(k\)/);
    expect(signals.some((s) => s.value === "us_person_likely")).toBe(false);
  });

  it("doesn't duplicate a posting that already states U.S. citizenship", () => {
    const signals = extractRequirementSignals("Active Secret clearance required. Must be a U.S. citizen.", US_ROLE);
    expect(signals.some((s) => s.value === "us_citizen_required")).toBe(true);
    expect(signals.some((s) => s.value === "us_citizen_required_for_clearance")).toBe(false);
  });

  it("still adds it alongside a stated ITAR U.S.-person requirement — citizenship is the stricter test", () => {
    const signals = extractRequirementSignals("Must be a U.S. person. Must hold an active TS clearance.", US_ROLE);
    expect(signals.some((s) => s.value === "us_person_required")).toBe(true);
    expect(signals.some((s) => s.value === "us_citizen_required_for_clearance")).toBe(true);
  });

  it("doesn't apply U.S. clearance law to a role based abroad", () => {
    const signals = extractRequirementSignals("Requires an active security clearance.", { industry: "defense_space", location: "Sydney, Australia" });
    expect(signals.some((s) => s.value === "us_citizen_required_for_clearance")).toBe(false);
  });

  it("an ITAR-only role (no clearance) still gets only the U.S.-person inference — a green card is enough there", () => {
    const signals = extractRequirementSignals("Build flight software for our autonomy stack.", US_ROLE);
    expect(signals.some((s) => s.value === "us_person_likely")).toBe(true);
    expect(signals.some((s) => s.value === "us_citizen_required_for_clearance")).toBe(false);
  });
});

describe("requirement extraction: clearance stage and full-sentence quotes", () => {
  it.each([
    ["Eligible to obtain and maintain an active U.S. Top Secret security clearance.", "ts", "must_be_able_to_obtain"],
    ["Must be able to obtain and maintain an active Secret clearance (U.S. Citizenship Required) - Interim Clearance required to start", "secret", "must_be_able_to_obtain"],
    ["You must have an active TS/SCI clearance with polygraph.", "ts_sci", "must_already_hold"],
    ["Must hold an active TS clearance.", "ts", "must_already_hold"],
    ["Active Secret clearance preferred.", "secret", "may_be_required"],
    ["U.S. clearance eligibility may be required depending on program.", "clearance_may_be_required", "may_be_required"],
    ["Willingness and eligibility to obtain a U.S. security clearance.", "clearance_required_unspecified", "must_be_able_to_obtain"],
  ])("%j → %s / %s", (text, value, stage) => {
    const signal = extractStatedSignals(text).find((s) => s.kind === "clearance_level");
    expect(signal?.value).toBe(value);
    expect(signal?.clearanceStage).toBe(stage);
  });

  it.each([
    "Must be a U.S. Person due to required access to U.S. export-controlled information.",
    "Eligible to obtain and maintain an active U.S. Top Secret security clearance.",
    "Must be a U.S. citizen, national, or lawful permanent resident as defined by 8 U.S.C. 1324b(a)(3).",
  ])("quotes the whole sentence, not up to the first abbreviation: %j", (sentence) => {
    const signals = extractStatedSignals(`Intro paragraph here. ${sentence} We build hardware.`);
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) expect(s.evidence).toBe(sentence);
  });

  it("windows a very long sentence around the match instead of cutting the match off", () => {
    const long = `${"We value collaboration and ownership across teams ".repeat(8)}and you must hold an active Secret clearance on day one.`;
    const secret = extractStatedSignals(long).find((s) => s.value === "secret");
    expect(secret?.evidence).toMatch(/active Secret clearance/);
    expect(secret?.evidence.startsWith("…")).toBe(true);
  });
});

describe("rules data: the green card / clearance distinction", () => {
  it("no rule tells a green card holder the non-citizen clearance rule doesn't apply to them", () => {
    for (const r of RULES) {
      const text = [r.summary, ...r.keyPoints].join(" ");
      expect(text, r.id).not.toMatch(/does NOT qualify as a U\.S\. person at all/i);
      expect(text, r.id).not.toMatch(/green card holders don't need that stricter rule/i);
    }
  });

  it("clearance-citizenship exists, answers both prongs, and cites the primary sources", () => {
    const rule = findRule("green card");
    expect(rule?.id).toBe("clearance-citizenship");
    expect(rule?.summary).toMatch(/U\.S\. person/);
    expect(rule?.summary).toMatch(/limited to U\.S\. citizens|open to U\.S\. citizens/);
    const urls = rule!.sources.map((s) => s.url);
    expect(urls).toContain("https://www.federalregister.gov/documents/1995/08/07/95-19654/access-to-classified-information");
    expect(urls.some((u) => u.includes("section-117.10"))).toBe(true);
  });
});

function detail(descriptionText: string): SpeedrunJobDetailResponse {
  return {
    job: {
      id: "job-1", title: "Mission Software Engineer", company: "Acme Defense", company_slug: "acme-defense",
      company_url: "https://speedrun-talent-network.com/companies/acme-defense", url: "https://speedrun-talent-network.com/jobs/job-1",
      location: "Costa Mesa, CA", workplace_type: "Onsite", employment_type: "FullTime", function: "engineering", seniority: "senior",
      remote: false, comp_min: null, comp_max: null, comp_currency: null, comp_period: null, published_at: "2026-01-01T00:00:00Z",
      stealth: false, tier: "a16z", status: "open", apply: null, description_text: descriptionText, labels: {},
    },
  } as SpeedrunJobDetailResponse;
}

describe("get_role_rubric: citizenship and clearance are no longer unrelated questions", () => {
  it("asks about U.S. citizenship first, and says a green card isn't enough", async () => {
    vi.mocked(getJob).mockResolvedValueOnce(detail("Eligible to obtain and maintain an active U.S. Top Secret security clearance."));
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    expect(result.eligibilityChecklist[0].question).toMatch(/Are you a U\.S\. citizen\?/);
    expect(result.eligibilityChecklist[0].question).toMatch(/green card satisfies ITAR, but not this/);
    expect(result.sources.some((s) => s.url.includes("federalregister.gov"))).toBe(true);
  });

  it("an 'eligible to obtain' clearance question says no clearance is needed to apply", async () => {
    vi.mocked(getJob).mockResolvedValueOnce(detail("Eligible to obtain and maintain an active U.S. Top Secret security clearance."));
    const result = await getRoleRubricTool.handler({ role_id: "job-1" });
    const q = result.eligibilityChecklist.find((i) => /Top Secret/.test(i.question));
    expect(q?.question).toMatch(/you don't need one to apply/);
  });
});

describe("estimate_timeline: no clearance timeline for someone who can't hold one", () => {
  const base = { current_status: "none", employer_has_fcl: "unknown" } as const;

  it("green card + Secret → no estimate, the rule, the LAA exception, and what the green card does open", async () => {
    const r = await estimateTimelineTool.handler({ ...base, target_level: "secret", citizenship_status: "green_card" });
    expect(r.estimate).toEqual({ minDays: null, maxDays: null, medianDays: null });
    const labels = r.keyDrivers.map((d) => d.label);
    expect(labels).toContain("Clearances are limited to U.S. citizens");
    expect(labels).toContain("The one exception: a Limited Access Authorization (LAA)");
    expect(labels).toContain("What your status does open");
  });

  it("green card + Top Secret → states there is no non-citizen pathway at all", async () => {
    const r = await estimateTimelineTool.handler({ ...base, target_level: "ts", citizenship_status: "green_card" });
    expect(r.keyDrivers.map((d) => d.label)).toContain("No non-citizen pathway at this level");
  });

  it("a visa holder isn't told ITAR roles are open to them", async () => {
    const r = await estimateTimelineTool.handler({ ...base, target_level: "secret", citizenship_status: "not_us_person" });
    expect(r.keyDrivers.map((d) => d.label)).not.toContain("What your status does open");
  });

  it("unknown citizenship → still estimates, but says it assumes U.S. citizenship", async () => {
    const r = await estimateTimelineTool.handler({ ...base, target_level: "secret", citizenship_status: "unknown" });
    expect(r.estimate.minDays).not.toBeNull();
    expect(r.keyDrivers.map((d) => d.label)).toContain("Assumes U.S. citizenship");
  });

  it("a U.S. citizen gets no assumption caveat", async () => {
    const r = await estimateTimelineTool.handler({ ...base, target_level: "secret", citizenship_status: "us_citizen" });
    expect(r.keyDrivers.map((d) => d.label)).not.toContain("Assumes U.S. citizenship");
  });

  it("the citizenship input is optional — omitting it through the real pipeline defaults to unknown", async () => {
    const r = await callTool(estimateTimelineTool, { target_level: "secret", current_status: "none" });
    expect(r.ok).toBe(true);
  });
});

function signed(payload: unknown, issuedAt: string) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const signed_payload = JSON.stringify(payload);
  return {
    issued_at: issuedAt,
    signed_payload,
    signature_base64: sign(null, Buffer.from(signed_payload, "utf8"), privateKey).toString("base64"),
    public_key_base64: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  };
}

describe("prepare_signed_attestation: claim consistency and payload strictness", () => {
  const now = new Date().toISOString();

  it.each([
    [{ clearance_level: "ts", citizenship_status: "green_card" }, /never valid for TOP SECRET/],
    [{ clearance_level: "interim", citizenship_status: "green_card" }, /never eligible for temporary/],
    [{ clearance_level: "secret", citizenship_status: "green_card" }, /rare/],
  ])("notes %j before the signer shares it", async (claims, pattern) => {
    const r = await prepareSignedAttestationTool.handler({ claims: claims as never, ...signed({ claims, issued_at: now }, now) });
    expect(r.claimNotes.join(" ")).toMatch(pattern);
  });

  it("no note for a U.S. citizen's clearance claim", async () => {
    const claims = { clearance_level: "ts", citizenship_status: "us_citizen" };
    const r = await prepareSignedAttestationTool.handler({ claims: claims as never, ...signed({ claims, issued_at: now }, now) });
    expect(r.claimNotes).toEqual([]);
  });

  it("rejects a signed payload that smuggles in an extra field (round 9: a hidden name and street address)", async () => {
    const claims = { clearance_level: "secret" };
    const r = await callTool(prepareSignedAttestationTool, { claims, ...signed({ claims, issued_at: now, holder: "Jane Q. Public, 1600 Pennsylvania Ave NW" }, now) });
    expect(r.ok).toBe(false);
  });

  it("rejects an issued_at in the future (round 9: 2099 was accepted)", async () => {
    const claims = { clearance_level: "secret" };
    const future = "2099-01-01T00:00:00Z";
    const r = await callTool(prepareSignedAttestationTool, { claims, ...signed({ claims, issued_at: future }, future) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/future/);
  });
});
