export interface PrivateSyncSettings {
  relayUrl: string;
  clientToken: string;
  syncEncryptionKey: string;
  inboxFolder: string;
  syncIntervalSeconds: number;
  autoSync: boolean;
  processedIds: string[];
}

export interface QueueEnvelope {
  id: string;
  iv: string;
  ciphertext: string;
}

export interface RelayMessage {
  id: string;
  createTime: number;
  msgType: string;
  content?: string;
  title?: string;
  description?: string;
  url?: string;
  source?: string;
}

export interface RelayStatus {
  ownerBound: boolean;
  hasPending: boolean;
}
