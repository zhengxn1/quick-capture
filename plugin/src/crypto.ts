import type { QueueEnvelope, RelayMessage } from "./types";

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function decryptEnvelope(
  envelope: QueueEnvelope,
  encryptionKey: string,
): Promise<RelayMessage> {
  const keyBytes = decodeBase64(encryptionKey);
  if (keyBytes.length !== 32) {
    throw new Error("同步加密密钥必须是32字节Base64字符串");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decodeBase64(envelope.iv),
      tagLength: 128,
    },
    key,
    decodeBase64(envelope.ciphertext),
  );
  const value = JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
  if (!isRelayMessage(value)) {
    throw new Error("中转消息格式无效");
  }
  return value;
}

function isRelayMessage(value: unknown): value is RelayMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    typeof message.createTime === "number" &&
    typeof message.msgType === "string"
  );
}
