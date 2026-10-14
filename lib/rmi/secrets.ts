import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encryption for secrets an admin saves from the dashboard.
 *
 * AES-256-GCM with a key taken from RMI_SETTINGS_KEY in the environment. That
 * key is the one thing that cannot live in the dashboard: if it did, anyone who
 * could read the data file could read the secrets too. Without it, secrets
 * cannot be saved from the dashboard at all, and the environment keeps working.
 *
 * Stored form: v1.<iv>.<tag>.<ciphertext>, each part base64url.
 */

export class SecretsUnavailableError extends Error {
  constructor() {
    super(
      "RMI_SETTINGS_KEY is not set on the server, so secrets cannot be encrypted. Set it in the environment and try again.",
    );
  }
}

function masterKey(): Buffer | null {
  const raw = process.env.RMI_SETTINGS_KEY?.trim();
  if (!raw) return null;
  // Any passphrase works; hashing gives AES the 32 bytes it needs.
  return createHash("sha256").update(raw).digest();
}

export function encryptionAvailable(): boolean {
  return masterKey() !== null;
}

export function encryptSecret(plain: string): string {
  const key = masterKey();
  if (!key) throw new SecretsUnavailableError();

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(
    ".",
  );
}

/** Null when the key is missing or changed, or the stored value was tampered with. */
export function decryptSecret(stored: string): string | null {
  const key = masterKey();
  if (!key) return null;

  const [version, iv, tag, body] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !body) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
