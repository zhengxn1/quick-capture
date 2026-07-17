import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { QueueEnvelope } from "./types";

function decodeSyncKey(syncKey: string): Buffer {
  const key = Buffer.from(syncKey, "base64");
  if (key.length !== 32) throw new Error("invalid_sync_encryption_key");
  return key;
}

export function encryptQueuePayload(value: unknown, syncKey: string): QueueEnvelope {
  const key = decodeSyncKey(syncKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    ciphertext: Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64"),
  };
}

export function decryptQueuePayloadForTest<T>(
  envelope: QueueEnvelope,
  syncKey: string,
): T {
  const key = decodeSyncKey(syncKey);
  const iv = Buffer.from(envelope.iv, "base64");
  const combined = Buffer.from(envelope.ciphertext, "base64");
  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return JSON.parse(
    Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"),
  ) as T;
}

export function secureTokenEquals(expected: string, supplied: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}
