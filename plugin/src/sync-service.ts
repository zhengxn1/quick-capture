import {
  App,
  normalizePath,
  requestUrl,
  TFile,
} from "obsidian";
import { decryptEnvelope } from "./crypto";
import {
  appendTableRow,
  formatTableSection,
  initialDailyContent,
  localDateParts,
} from "./formatter";
import type { PrivateSyncSettings, QueueEnvelope, RelayMessage, RelayStatus } from "./types";

interface MessageResponse {
  messages: QueueEnvelope[];
}

function responseError(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return undefined;
  }
  const error = value.error;
  return typeof error === "string" ? error : undefined;
}

export class SyncService {
  private syncing = false;

  constructor(
    private readonly app: App,
    private readonly getSettings: () => PrivateSyncSettings,
    private readonly saveSettings: () => Promise<void>,
    private readonly updateStatus: (status: string) => void,
  ) {}

  isConfigured(): boolean {
    const settings = this.getSettings();
    return Boolean(
      settings.relayUrl.trim() &&
        settings.clientToken.trim() &&
        settings.syncEncryptionKey.trim(),
    );
  }

  async status(): Promise<RelayStatus> {
    return this.api<RelayStatus>("/api/status", "GET");
  }

  async sync(): Promise<number> {
    if (this.syncing || !this.isConfigured()) {
      return 0;
    }
    this.syncing = true;
    this.updateStatus("正在同步…");
    try {
      const response = await this.api<MessageResponse>("/api/messages", "GET");
      const acknowledged: string[] = [];
      let written = 0;
      for (const envelope of response.messages) {
        if (this.getSettings().processedIds.includes(envelope.id)) {
          acknowledged.push(envelope.id);
          continue;
        }
        const message = await decryptEnvelope(
          envelope,
          this.getSettings().syncEncryptionKey,
        );
        await this.writeMessage(message);
        this.remember(envelope.id);
        await this.saveSettings();
        acknowledged.push(envelope.id);
        written += 1;
      }
      if (acknowledged.length > 0) {
        await this.api<{ deleted: number }>("/api/ack", "POST", {
          ids: acknowledged,
        });
      }
      this.updateStatus(
        written > 0 ? `已同步 ${written} 条手机收集内容` : "当前已是最新",
      );
      return written;
    } finally {
      this.syncing = false;
    }
  }

  private remember(id: string): void {
    const settings = this.getSettings();
    settings.processedIds = [...settings.processedIds, id].slice(-1000);
  }

  private relayBaseUrl(): string {
    const value = this.getSettings().relayUrl.trim().replace(/\/+$/, "");
    const parsed = new URL(value);
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !isLocal) {
      throw new Error("私有中转地址必须使用HTTPS");
    }
    return value;
  }

  private async api<T>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    const response = await requestUrl({
      url: `${this.relayBaseUrl()}${path}`,
      method,
      headers: {
        authorization: `Bearer ${this.getSettings().clientToken.trim()}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      throw: false,
    });
    if (response.status < 200 || response.status >= 300) {
      const error = responseError(response.json as unknown) ?? `HTTP ${response.status}`;
      throw new Error(`中转服务请求失败：${error}`);
    }
    return response.json as T;
  }

  private async writeMessage(message: RelayMessage): Promise<void> {
    const settings = this.getSettings();
    const { date } = localDateParts(message.createTime);
    const inbox = normalizePath(settings.inboxFolder.trim() || "00_INPUT/内容收集箱");
    await this.ensureFolder(inbox);
    const dailyPath = normalizePath(`${inbox}/${date}.md`);
    const block = formatTableSection(message);
    const existing = this.app.vault.getAbstractFileByPath(dailyPath);
    if (existing instanceof TFile) {
      const marker = `<!-- quick-capture:${message.id} -->`;
      const current = await this.app.vault.cachedRead(existing);
      if (!current.includes(marker)) {
        await this.app.vault.process(existing, (content) => appendTableRow(content, message));
      }
      return;
    }
    await this.app.vault.create(
      dailyPath,
      `${initialDailyContent(date)}${block}`,
    );
  }

  private async ensureFolder(path: string): Promise<void> {
    const parts = normalizePath(path).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }
}
