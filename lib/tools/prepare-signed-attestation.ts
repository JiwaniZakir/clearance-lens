import { z } from "zod";
import { isValidEd25519Signature, publicKeyFingerprint } from "@/lib/attestation/ed25519";
import { DISCLAIMERS } from "@/lib/disclaimers";
import { SourceRefSchema, type ToolDef } from "@/lib/tools/wrap";

/**
 * Clearance Lens v2: the "signed self-attestation" alternative to
 * cryptographic clearance *verification* (not buildable — DISS/NBIS access
 * is FSO-only by federal design, not by this app's choice). A signature
 * proves WHO made a claim and WHEN, and that it hasn't been altered since —
 * never WHETHER the claim is true. The candidate's own agent generates and
 * holds the keypair entirely client-side; this server never receives,
 * stores, or even sees a private key, consistent with every other tool
 * here. Reusing the same keypair across calls gives a recruiter a stable,
 * pseudonymous "same source, different claim" signal without ever
 * revealing who the candidate actually is.
 */

const ClaimsSchema = z
  .object({
    clearance_level: z.enum(["none", "interim", "secret", "ts", "ts_sci"]).optional(),
    citizenship_status: z.enum(["us_citizen", "green_card", "other_protected_individual", "not_us_person"]).optional(),
    available_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "available_from must be YYYY-MM-DD")
      .optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, { message: "At least one claim is required" });

type Claims = z.infer<typeof ClaimsSchema>;

const CLAIM_LABELS: Record<keyof Claims, string> = {
  clearance_level: "Clearance level (self-attested)",
  citizenship_status: "Citizenship status (self-attested)",
  available_from: "Available from",
};

/** `claims`/`issued_at` are accepted as separate, structured fields (so the
 *  rest of this tool can read them without re-parsing a string), but the
 *  ACTUAL signature only proves something about `signed_payload`'s exact
 *  bytes. Without this check, the human-readable `claims` shown back to
 *  the user could silently drift from what was actually signed. Compares
 *  parsed values, not raw strings — deliberately order/whitespace-
 *  independent, since the calling agent's own JSON serialization doesn't
 *  need to byte-match this server's. */
function claimsMatchSignedPayload(claims: Claims, issuedAt: string, signedPayload: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(signedPayload);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  // Exactly these two keys. Found via the spec §6 judging panel round 9: a
  // validly signed payload with an extra "holder": "<name>, <street address>"
  // field passed, and that name and address were echoed back in
  // credential.proof.signedPayload — free text in a tool that promises none.
  const topKeys = Object.keys(parsed).sort();
  if (topKeys.length !== 2 || topKeys[0] !== "claims" || topKeys[1] !== "issued_at") return false;
  const p = parsed as { claims?: unknown; issued_at?: unknown };
  if (p.issued_at !== issuedAt) return false;
  if (!p.claims || typeof p.claims !== "object") return false;
  const parsedClaims = p.claims as Record<string, unknown>;
  const claimKeys = Object.keys(claims) as (keyof Claims)[];
  if (Object.keys(parsedClaims).length !== claimKeys.length) return false;
  return claimKeys.every((key) => parsedClaims[key] === claims[key]);
}

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Flags claim combinations the published rules make impossible or rare,
 *  so the signer hears it before a recipient does. Found via the spec §6
 *  judging panel round 9: /try signed "Secret + green_card" with no warning.
 *  A note, never a refusal — this tool never judges whether a claim is true. */
function claimNotesFor(claims: Claims): string[] {
  const nonCitizen = claims.citizenship_status !== undefined && claims.citizenship_status !== "us_citizen";
  const level = claims.clearance_level;
  if (!nonCitizen || level === undefined || level === "none") return [];
  if (level === "ts" || level === "ts_sci") {
    return [
      "These claims conflict with the published rules: clearances are limited to U.S. citizens, and the only non-citizen exception (a Limited Access Authorization) is never valid for TOP SECRET (32 CFR 117.10(k)). A recipient will likely read this as an error.",
    ];
  }
  if (level === "interim") {
    return [
      "These claims conflict with the published rules: non-U.S. citizens are never eligible for temporary (interim) access (32 CFR 117.10(l)). A recipient will likely read this as an error.",
    ];
  }
  return [
    "This combination is rare: clearances are limited to U.S. citizens, and a non-citizen can hold Secret-level access only through a Limited Access Authorization — granted in rare, contract-specific circumstances (32 CFR 117.10(k)). Expect a recipient to ask about it.",
  ];
}

const InputSchema = z
  .object({
    claims: ClaimsSchema,
    issued_at: z
      .string()
      .datetime({ message: "issued_at must be a UTC ISO-8601 timestamp, e.g. 2026-11-12T16:00:00Z" }),
    signed_payload: z
      .string()
      .max(2000)
      .describe(
        'The exact JSON string {"claims":{...},"issued_at":"..."} that was signed, byte-for-byte — not reconstructed by this tool.',
      ),
    signature_base64: z.string().max(500).describe("Ed25519 signature of signed_payload's UTF-8 bytes, base64."),
    public_key_base64: z.string().max(500).describe("Ed25519 public key, SPKI/DER, base64-encoded."),
  })
  .superRefine((data, ctx) => {
    if (!claimsMatchSignedPayload(data.claims, data.issued_at, data.signed_payload)) {
      ctx.addIssue({
        code: "custom",
        path: ["signed_payload"],
        message:
          'signed_payload does not match claims/issued_at — sign exactly {"claims":<claims>,"issued_at":"<issued_at>"} and resend both the string and its parsed fields.',
      });
      return;
    }
    // Also round 9: issued_at "2099-…" was accepted, though the credential
    // claims to prove WHEN it was signed. Allows a few minutes of clock skew.
    if (Date.parse(data.issued_at) > Date.now() + MAX_CLOCK_SKEW_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["issued_at"],
        message: "issued_at is in the future — use the current UTC time when signing.",
      });
      return;
    }
    if (!isValidEd25519Signature(data.public_key_base64, data.signed_payload, data.signature_base64)) {
      ctx.addIssue({
        code: "custom",
        path: ["signature_base64"],
        message: "The signature does not verify against signed_payload and public_key_base64 — check the keypair and signing step.",
      });
    }
  });

const OutputSchema = z.object({
  credential: z.object({
    context: z.array(z.string()),
    type: z.array(z.string()),
    issuer: z.string(),
    issuanceDate: z.string(),
    credentialSubject: z.record(z.string(), z.unknown()),
    proof: z.object({
      type: z.string(),
      verificationMethod: z.string(),
      signatureValue: z.string(),
      // The exact bytes that were signed. Found via the spec §6 judging panel
      // round 8 (candidate_user): without this, a recipient could not verify
      // the credential — a signature covers exact bytes, and this tool
      // deliberately accepts any caller serialization of {claims, issued_at},
      // so those bytes can't be reliably rebuilt from the parsed fields.
      signedPayload: z.string(),
      keyFingerprint: z.string(),
    }),
  }),
  shareableMarkdown: z.string(),
  whatThisProves: z.string(),
  /** For the signer, not part of the shared credential (D-046). */
  claimNotes: z.array(z.string()),
  sources: z.array(SourceRefSchema),
  disclaimer: z.string(),
});

export const prepareSignedAttestationTool: ToolDef<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  name: "prepare_signed_attestation",
  title: "Prepare a signed self-attestation",
  description:
    "Wraps a self-asserted status claim (clearance level, citizenship status, and/or availability date — no free text) in a signed, shareable credential your OWN agent produces and signs locally; this server never sees or holds any private key. " +
    "To use: (1) if you don't already have one, generate an Ed25519 keypair once and reuse it across attestations (e.g. in Node.js: const {publicKey, privateKey} = crypto.generateKeyPairSync('ed25519')) — never send the private key anywhere, including to this tool. " +
    '(2) Build signed_payload as the exact JSON string {"claims":{...},"issued_at":"<current UTC ISO-8601 timestamp>"}. ' +
    "(3) Sign its UTF-8 bytes (crypto.sign(null, Buffer.from(signed_payload), privateKey)), base64-encode as signature_base64. " +
    "(4) Export the public key (publicKey.export({type:'spki',format:'der'}).toString('base64')) as public_key_base64. " +
    "(5) Call this tool with claims, issued_at, signed_payload, signature_base64, public_key_base64 — claims/issued_at are cross-checked against signed_payload's own content, and the signature is verified before anything is returned. " +
    "Proves WHO signed the claim and WHEN, and that it hasn't been altered since — never that the claim itself is true. Reusing the same keypair lets a recruiter recognize repeat signals from the same pseudonymous source without ever learning who you are. Loosely modeled on the W3C Verifiable Credentials data shape, not a certified implementation of it.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ claims, issued_at, signed_payload, signature_base64, public_key_base64 }) => {
    const claimEntries = Object.entries(claims).filter(([, v]) => v !== undefined) as [keyof Claims, string][];
    const claimLines = claimEntries.map(([key, value]) => `- **${CLAIM_LABELS[key]}:** ${value}`).join("\n");
    const keyFingerprint = publicKeyFingerprint(public_key_base64);

    const shareableMarkdown =
      `# Signed self-attestation\n\n${claimLines}\n\n` +
      `Signed ${issued_at} by key fingerprint \`${keyFingerprint}\`.\n\n` +
      "To verify: pass signed_payload, signature_base64, and public_key_base64 below to Clearance Lens's verify_signed_attestation tool — or check the Ed25519 signature yourself. A valid signature proves who signed this and when, never that the claim is true.\n\n" +
      `\`\`\`json\n${JSON.stringify({ claims, issued_at, signed_payload, signature_base64, public_key_base64 }, null, 2)}\n\`\`\``;

    return {
      credential: {
        context: ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiableCredential", "SelfAttestedCandidateClaim"],
        issuer: `self-attested-key:${public_key_base64}`,
        issuanceDate: issued_at,
        credentialSubject: claims,
        proof: {
          type: "Ed25519Signature2020",
          verificationMethod: public_key_base64,
          signatureValue: signature_base64,
          signedPayload: signed_payload,
          keyFingerprint,
        },
      },
      shareableMarkdown,
      whatThisProves:
        "The claim was signed by whoever holds the private key matching the embedded public key, at the stated time, and the content hasn't been altered since.",
      claimNotes: claimNotesFor(claims),
      sources: [
        { title: "W3C Verifiable Credentials Data Model v2.0", url: "https://www.w3.org/TR/vc-data-model-2.0/" },
        ...(claimNotesFor(claims).length > 0
          ? [{ title: "32 CFR § 117.10(k)–(l) — Non-U.S. citizens; temporary eligibility (eCFR)", url: "https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-117/section-117.10" }]
          : []),
      ],
      disclaimer: DISCLAIMERS.neverVerifiesAttestationTruth,
    };
  },
};
