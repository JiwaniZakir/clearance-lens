import { createHash, createPublicKey, verify as verifyEd25519 } from "crypto";

/** True only if `signatureBase64` is a valid Ed25519 signature of
 *  `signedPayload`'s exact UTF-8 bytes, verified under `publicKeyBase64`
 *  (SPKI/DER, base64). Pure math on caller-supplied values — no network
 *  call, no state, no custody of any private key. Shared by
 *  prepare_signed_attestation (the signer's side) and
 *  verify_signed_attestation (the recipient's side). */
export function isValidEd25519Signature(publicKeyBase64: string, signedPayload: string, signatureBase64: string): boolean {
  try {
    const publicKey = createPublicKey({ key: Buffer.from(publicKeyBase64, "base64"), format: "der", type: "spki" });
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    return verifyEd25519(null, Buffer.from(signedPayload, "utf8"), publicKey, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}

/** A short, stable fingerprint of a public key (first 16 hex chars of its
 *  SHA-256), so a recipient can recognize "the same pseudonymous signer as
 *  before" across separate attestations without comparing 44-character
 *  keys by eye — the repeat-signal benefit prepare_signed_attestation's own
 *  description promises, made actually usable. Identifies a key, never a
 *  person. */
export function publicKeyFingerprint(publicKeyBase64: string): string {
  return createHash("sha256").update(Buffer.from(publicKeyBase64, "base64")).digest("hex").slice(0, 16);
}
