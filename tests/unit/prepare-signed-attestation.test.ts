import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign } from "crypto";
import { prepareSignedAttestationTool } from "@/lib/tools/prepare-signed-attestation";

function signedAttestation(claims: Record<string, string>, issuedAt = "2026-11-12T16:00:00Z") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const signed_payload = JSON.stringify({ claims, issued_at: issuedAt });
  const signature_base64 = sign(null, Buffer.from(signed_payload, "utf8"), privateKey).toString("base64");
  const public_key_base64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  return { claims, issued_at: issuedAt, signed_payload, signature_base64, public_key_base64 };
}

describe("prepare_signed_attestation", () => {
  it("accepts a correctly signed single claim and returns a credential", async () => {
    const input = signedAttestation({ clearance_level: "secret" });
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const result = await prepareSignedAttestationTool.handler(parsed.data);
    expect(result.credential.credentialSubject).toEqual({ clearance_level: "secret" });
    expect(result.credential.proof.signatureValue).toBe(input.signature_base64);
    expect(result.shareableMarkdown).toContain("Clearance level");
  });

  it("accepts multiple claims at once", async () => {
    const input = signedAttestation({ clearance_level: "ts_sci", citizenship_status: "us_citizen", available_from: "2026-12-01" });
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("rejects a tampered claim (signature no longer matches)", () => {
    const input = signedAttestation({ clearance_level: "secret" });
    const tampered = { ...input, claims: { clearance_level: "ts" } }; // claims changed, signature wasn't redone
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(tampered);
    expect(parsed.success).toBe(false);
  });

  it("rejects a signature from the wrong keypair", () => {
    const input = signedAttestation({ clearance_level: "secret" });
    const { publicKey: wrongKey } = generateKeyPairSync("ed25519");
    const tampered = { ...input, public_key_base64: wrongKey.export({ type: "spki", format: "der" }).toString("base64") };
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(tampered);
    expect(parsed.success).toBe(false);
  });

  it("rejects signed_payload that doesn't match the declared issued_at", () => {
    const input = signedAttestation({ clearance_level: "secret" }, "2026-11-12T16:00:00Z");
    const tampered = { ...input, issued_at: "2026-11-13T00:00:00Z" }; // signed_payload still says the original time
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(tampered);
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty claims object", () => {
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(signedAttestation({}));
    expect(parsed.success).toBe(false);
  });

  it("rejects an unrecognized claim key (closed vocabulary, no free text)", () => {
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(
      signedAttestation({ favorite_color: "blue" } as unknown as Record<string, string>),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed signed_payload", () => {
    const input = signedAttestation({ clearance_level: "secret" });
    const tampered = { ...input, signed_payload: "not json" };
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(tampered);
    expect(parsed.success).toBe(false);
  });

  it("always includes the attestation-truth disclaimer, never claiming to verify the claim itself", async () => {
    const input = signedAttestation({ clearance_level: "secret" });
    const parsed = prepareSignedAttestationTool.inputSchema.safeParse(input);
    if (!parsed.success) throw new Error("setup failed");
    const result = await prepareSignedAttestationTool.handler(parsed.data);
    expect(result.disclaimer.toLowerCase()).toContain("does not confirm the claim itself is true");
  });
});
