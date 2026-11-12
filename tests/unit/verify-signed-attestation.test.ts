import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign } from "crypto";
import { prepareSignedAttestationTool } from "@/lib/tools/prepare-signed-attestation";
import { verifySignedAttestationTool } from "@/lib/tools/verify-signed-attestation";

function makeKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { privateKey, public_key_base64: publicKey.export({ type: "spki", format: "der" }).toString("base64") };
}

function signWith(privateKey: ReturnType<typeof makeKeypair>["privateKey"], payload: string) {
  return sign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64");
}

describe("verify_signed_attestation", () => {
  // The two-party flow judging panel round 8 found was only half-built:
  // sign with prepare_signed_attestation, share exactly what it outputs,
  // and verify THAT as a recipient would — no hand-reconstruction.
  it("round trip: a credential produced by prepare_signed_attestation verifies from its own shared fields", async () => {
    const { privateKey, public_key_base64 } = makeKeypair();
    const claims = { clearance_level: "secret", citizenship_status: "us_citizen" };
    const signed_payload = JSON.stringify({ claims, issued_at: "2026-11-12T16:00:00Z" });
    const prepared = await prepareSignedAttestationTool.handler({
      claims: claims as never,
      issued_at: "2026-11-12T16:00:00Z",
      signed_payload,
      signature_base64: signWith(privateKey, signed_payload),
      public_key_base64,
    });

    // Recover the shared JSON block from the markdown exactly as a recipient would receive it.
    const json = JSON.parse(prepared.shareableMarkdown.split("```json\n")[1].split("\n```")[0]);
    const result = await verifySignedAttestationTool.handler({
      signed_payload: json.signed_payload,
      signature_base64: json.signature_base64,
      public_key_base64: json.public_key_base64,
    });
    expect(result.signatureValid).toBe(true);
    expect(result.claims).toEqual(claims);
    expect(result.issuedAt).toBe("2026-11-12T16:00:00Z");
    expect(result.keyFingerprint).toBe(prepared.credential.proof.keyFingerprint);
  });

  it("the signer's serialization doesn't matter — whitespace/key order in signed_payload still verifies byte-for-byte", async () => {
    const { privateKey, public_key_base64 } = makeKeypair();
    const signed_payload = '{ "issued_at": "2026-11-12T16:00:00Z", "claims": { "clearance_level": "ts" } }';
    const result = await verifySignedAttestationTool.handler({
      signed_payload,
      signature_base64: signWith(privateKey, signed_payload),
      public_key_base64,
    });
    expect(result.signatureValid).toBe(true);
    expect(result.claims).toEqual({ clearance_level: "ts" });
  });

  it("reports a tampered payload as invalid — as a normal answer, not an error — and surfaces no claims from it", async () => {
    const { privateKey, public_key_base64 } = makeKeypair();
    const original = JSON.stringify({ claims: { clearance_level: "secret" }, issued_at: "2026-11-12T16:00:00Z" });
    const tampered = JSON.stringify({ claims: { clearance_level: "ts_sci" }, issued_at: "2026-11-12T16:00:00Z" });
    const result = await verifySignedAttestationTool.handler({
      signed_payload: tampered,
      signature_base64: signWith(privateKey, original),
      public_key_base64,
    });
    expect(result.signatureValid).toBe(false);
    expect(result.claims).toBeNull(); // never hand a reader the forged content
    expect(result.whatThisProves).toMatch(/^Nothing/);
  });

  it("reports a signature from a different keypair as invalid", async () => {
    const signer = makeKeypair();
    const impostor = makeKeypair();
    const payload = JSON.stringify({ claims: { clearance_level: "secret" }, issued_at: "2026-11-12T16:00:00Z" });
    const result = await verifySignedAttestationTool.handler({
      signed_payload: payload,
      signature_base64: signWith(signer.privateKey, payload),
      public_key_base64: impostor.public_key_base64,
    });
    expect(result.signatureValid).toBe(false);
  });

  it("gives the same fingerprint for the same key across separate credentials, and different ones for different keys", async () => {
    const a = makeKeypair();
    const b = makeKeypair();
    const p1 = JSON.stringify({ claims: { clearance_level: "secret" }, issued_at: "2026-11-01T00:00:00Z" });
    const p2 = JSON.stringify({ claims: { available_from: "2026-12-01" }, issued_at: "2026-11-12T00:00:00Z" });
    const r1 = await verifySignedAttestationTool.handler({ signed_payload: p1, signature_base64: signWith(a.privateKey, p1), public_key_base64: a.public_key_base64 });
    const r2 = await verifySignedAttestationTool.handler({ signed_payload: p2, signature_base64: signWith(a.privateKey, p2), public_key_base64: a.public_key_base64 });
    const r3 = await verifySignedAttestationTool.handler({ signed_payload: p1, signature_base64: signWith(b.privateKey, p1), public_key_base64: b.public_key_base64 });
    expect(r1.keyFingerprint).toBe(r2.keyFingerprint);
    expect(r1.keyFingerprint).not.toBe(r3.keyFingerprint);
  });

  it("garbage key/signature input returns invalid rather than throwing", async () => {
    const result = await verifySignedAttestationTool.handler({
      signed_payload: '{"claims":{},"issued_at":"x"}',
      signature_base64: "not-a-signature",
      public_key_base64: "not-a-key",
    });
    expect(result.signatureValid).toBe(false);
  });

  it("always states what a valid signature does NOT prove — truth of the claim, or real-world identity", async () => {
    const result = await verifySignedAttestationTool.handler({ signed_payload: "x", signature_base64: "x", public_key_base64: "x" });
    expect(result.whatThisDoesNotProve).toMatch(/whether any claim is true/i);
    expect(result.whatThisDoesNotProve).toMatch(/Facility Security Officer/);
  });
});
