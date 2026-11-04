/**
 * STOS Male-Female Socket Cryptography for ECD (Erase Cash Data & Vault Retrieval).
 *
 * Implements AES-256-GCM authenticated envelope encryption with PBKDF2 key derivation.
 * Guarantees that exported folders and files are 100% unreadable by any external viewer,
 * editor, text viewer, or cloud drive.
 *
 * Only STOS ("the female socket") contains the matching key derivation pepper and
 * structural schema ("the male socket") to decrypt, verify cryptographic integrity,
 * and restore the cash ledger, quotations, receipts, and customer entries.
 */

const SOCKET_HEADER = "STOS-ECD-SOCKET-V1";
const SOCKET_PEPPER = "stos-male-female-socket-2026-raman-pupneja-vedora-vision-secure-vault";

export interface EncryptedSocketEnvelope {
  header: string;
  version: "1.0";
  timestamp: string;
  vaultToken: string;
  saltHex: string;
  ivHex: string;
  cipherHex: string;
  sha256Hex: string;
}

// Convert ArrayBuffer to Hex string
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert Hex string to Uint8Array
function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Derive AES-GCM CryptoKey using PBKDF2 from pepper + salt
async function deriveSocketKey(salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(SOCKET_PEPPER),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Compute SHA-256 of plain string
export async function computeSha256(plainText: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(plainText));
  return bufToHex(hashBuf);
}

/**
 * Encrypts cash ledger data into a sealed "male-female socket" cryptographic envelope.
 * Returns both the structured envelope and the obfuscated folder/filename.
 */
export async function encryptSocketPayload<T>(
  payload: T,
  timestamp: string = new Date().toISOString(),
): Promise<{
  envelope: EncryptedSocketEnvelope;
  rawString: string;
  folderName: string;
  fileName: string;
  checksum: string;
}> {
  const jsonString = JSON.stringify(payload);
  const checksum = await computeSha256(jsonString);

  // Generate 16 bytes salt & 12 bytes IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveSocketKey(salt);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(jsonString),
  );

  const saltHex = bufToHex(salt.buffer);
  const ivHex = bufToHex(iv.buffer);
  const cipherHex = bufToHex(cipherBuf);

  // Obfuscated socket token for folder and file naming
  const vaultToken = checksum.slice(0, 12).toUpperCase();
  const folderName = `STOS-VAULT-${vaultToken}`;
  const fileName = `STOS-ECD-${vaultToken}.stos`;

  const envelope: EncryptedSocketEnvelope = {
    header: SOCKET_HEADER,
    version: "1.0",
    timestamp,
    vaultToken,
    saltHex,
    ivHex,
    cipherHex,
    sha256Hex: checksum,
  };

  const rawString = JSON.stringify(envelope, null, 2);

  return {
    envelope,
    rawString,
    folderName,
    fileName,
    checksum,
  };
}

/**
 * Decrypts a sealed "male-female socket" cryptographic envelope.
 * Verifies authenticity, decrypts AES-GCM ciphertext, and validates SHA-256 integrity.
 * Throws an explicit error if tampered with or if opened with an invalid key.
 */
export async function decryptSocketPayload<T>(
  envelopeOrRaw: EncryptedSocketEnvelope | string,
): Promise<T> {
  let envelope: EncryptedSocketEnvelope;
  if (typeof envelopeOrRaw === "string") {
    try {
      envelope = JSON.parse(envelopeOrRaw) as EncryptedSocketEnvelope;
    } catch {
      throw new Error("Invalid socket file: not a recognized JSON format");
    }
  } else {
    envelope = envelopeOrRaw;
  }

  if (envelope.header !== SOCKET_HEADER) {
    throw new Error("Invalid socket header: this file does not match the STOS ECD socket format");
  }

  if (!envelope.saltHex || !envelope.ivHex || !envelope.cipherHex || !envelope.sha256Hex) {
    throw new Error("Corrupted socket envelope: missing cryptographic parameters");
  }

  const salt = hexToBuf(envelope.saltHex);
  const iv = hexToBuf(envelope.ivHex);
  const cipherBuf = hexToBuf(envelope.cipherHex);

  const key = await deriveSocketKey(salt);

  let decryptedBuf: ArrayBuffer;
  try {
    decryptedBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      cipherBuf as BufferSource,
    );
  } catch (err) {
    console.warn("[ecd-socket-crypto] Decryption failed:", err);
    throw new Error("Socket key mismatch or file corrupted: unable to decrypt envelope");
  }

  const dec = new TextDecoder();
  const plainText = dec.decode(decryptedBuf);

  const recomputedHash = await computeSha256(plainText);
  if (recomputedHash !== envelope.sha256Hex) {
    throw new Error("Data integrity error: SHA-256 checksum mismatch");
  }

  return JSON.parse(plainText) as T;
}
