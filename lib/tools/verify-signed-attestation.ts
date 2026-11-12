import { z } from "zod";
import { isValidEd25519Signature, publicKeyFingerprint } from "@/lib/attestation/ed25519";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * The recipient's half of prepare_signed_attestation. Found via the spec §6
 * judging panel round 8 (candidate_user): a recruiter handed a credential
 * had no tool to check it and had to re-derive Ed25519 verification by
 * hand — the signer's side of a two-party flow existed, the recipient's
 * didn't. Pure signature math on caller-supplied values: no network call,
 * no state, and it evaluates a signature, never a person.
 */

const InputSchema = z.object({
  signed_payload: z
    .string()
    .min(1)
    .max(2000)
    .describe("The exact signed_payload string from the credential you were given — byte for byte, not re-serialized."),
  signature_base64: z.string().min(1).max(500).describe("signature_base64 from the credential."),
  public_key_base64: z.string().min(1).max(500).describe("public_key_base64 from the credential (Ed25519, SPKI/DER, base64)."),
});

const ClaimsSchema = z
  .object({
    clearance_level: z.string().optional(),
    citizenship_status: z.string().optional(),
    available_from: z.string().optional(),
  })
  .strict();

const PayloadSchema = z.object({ claims: ClaimsSchema, issued_at: z.string() }).strict();

const OutputSchema = z.object({
  signatureValid: z.boolean(),
  claims: ClaimsSchema.nullable(),
  issuedAt: z.string().nullable(),
  keyFingerprint: z.string(),
  whatThisProves: z.string(),
  whatThisDoesNotProve: z.string(),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const verifySignedAttestationTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "verify_signed_attestation",
  title: "Verify a signed self-attestation you received",
  description:
    "The recipient's side of prepare_signed_attestation: checks whether a credential someone handed you was really signed by the key it names, and hasn't been altered since. Pass signed_payload, signature_base64, and public_key_base64 exactly as they appear in the credential. Returns the decoded claims and a short key fingerprint, so you can recognize the same pseudonymous signer across separate credentials. A valid signature proves who signed and when — never that the claim itself is true; only an employer's FSO can verify actual clearance status.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ signed_payload, signature_base64, public_key_base64 }) => {
    const signatureValid = isValidEd25519Signature(public_key_base64, signed_payload, signature_base64);

    // Only report claims out of a payload whose signature actually verified —
    // surfacing claims from an unverified payload would hand a reader exactly
    // the forged content the check exists to stop.
    let claims: z.infer<typeof ClaimsSchema> | null = null;
    let issuedAt: string | null = null;
    if (signatureValid) {
      try {
        const parsed = PayloadSchema.safeParse(JSON.parse(signed_payload));
        if (parsed.success) {
          claims = parsed.data.claims;
          issuedAt = parsed.data.issued_at;
        }
      } catch {
        // Valid signature over a payload that isn't the expected JSON shape:
        // the signature still verifies, there are just no claims to report.
      }
    }

    return {
      signatureValid,
      claims,
      issuedAt,
      keyFingerprint: publicKeyFingerprint(public_key_base64),
      whatThisProves: signatureValid
        ? "This payload was signed by whoever holds the private key matching this public key, and it hasn't been altered since it was signed."
        : "Nothing — the signature does not verify against this payload and public key. Either the payload was altered after signing, the signature or key was mistyped, or it was signed by a different key than the one named. Treat every claim in it as unsupported.",
      whatThisDoesNotProve:
        "Whether any claim is true, or who the signer is in the real world. The key is self-generated and tied to no verified identity — a matching fingerprint across credentials means the same keyholder, nothing more. Clearance status in particular can only be verified by the employer's Facility Security Officer at the offer stage.",
      sources: [{ title: "W3C Verifiable Credentials Data Model v2.0", url: "https://www.w3.org/TR/vc-data-model-2.0/" }],
      disclaimer: DISCLAIMERS.neverVerifiesAttestationTruth,
    };
  },
};
