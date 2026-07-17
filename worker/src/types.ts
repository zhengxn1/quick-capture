export interface Env {
  CAPTURE_DB: D1Database;
  CLIENT_TOKEN: string;
  MOBILE_CAPTURE_TOKEN: string;
  SYNC_ENCRYPTION_KEY: string;
  QUEUE_TTL_SECONDS?: string;
}

export interface QueueEnvelope {
  iv: string;
  ciphertext: string;
}

export interface QueuedEnvelope extends QueueEnvelope {
  id: string;
}

export interface RelayMessage {
  id: string;
  createTime: number;
  msgType: "text" | "link";
  content?: string;
  title?: string;
  description?: string;
  url?: string;
  source?: string;
}
