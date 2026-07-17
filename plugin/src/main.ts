import { Notice, Plugin } from "obsidian";
import {
  clearInterval as clearNodeInterval,
  setInterval as setNodeInterval,
  setTimeout as setNodeTimeout,
} from "node:timers";
import { PrivateSyncSettingTab } from "./settings-tab";
import { SyncService } from "./sync-service";
import type { PrivateSyncSettings, RelayStatus } from "./types";

const DEFAULT_SETTINGS: PrivateSyncSettings = {
  relayUrl: "",
  clientToken: "",
  syncEncryptionKey: "",
  inboxFolder: "00_INPUT/内容收集箱",
  syncIntervalSeconds: 3,
  autoSync: true,
  processedIds: [],
};

export default class QuickCapturePlugin extends Plugin {
  settings: PrivateSyncSettings = { ...DEFAULT_SETTINGS };
  currentStatus = "尚未配置";

  private syncService!: SyncService;
  private statusBarEl!: HTMLElement;
  private timerId: ReturnType<typeof setNodeInterval> | undefined;
  private initializationPromise: Promise<void> = Promise.resolve();

  onload(): void {
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadPluginSettings();
    this.statusBarEl = this.addStatusBarItem();
    this.syncService = new SyncService(
      this.app,
      () => this.settings,
      () => this.savePluginSettings(),
      (status) => this.setStatus(status),
    );
    this.addSettingTab(new PrivateSyncSettingTab(this.app, this));
    this.addRibbonIcon("refresh-cw", "立即同步手机收集内容", () => {
      void this.syncNow(true);
    });
    this.addCommand({
      id: "sync-now",
      name: "立即同步手机收集内容",
      callback: () => {
        void this.syncNow(true);
      },
    });
    this.restartTimer();
    if (this.syncService.isConfigured()) {
      this.setStatus(this.settings.autoSync ? "等待自动同步" : "手动同步模式");
      if (this.settings.autoSync) {
        setNodeTimeout(() => {
          void this.syncNow(false);
        }, 1500);
      }
    } else {
      this.setStatus("Quick Capture 尚未配置");
    }
  }

  onunload(): void {
    if (this.timerId !== undefined) {
      clearNodeInterval(this.timerId);
    }
  }

  async loadPluginSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<PrivateSyncSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(loaded ?? {}),
      processedIds: Array.isArray(loaded?.processedIds)
        ? loaded.processedIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  }

  async savePluginSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  restartTimer(): void {
    if (this.timerId !== undefined) {
      clearNodeInterval(this.timerId);
      this.timerId = undefined;
    }
    if (!this.settings.autoSync || !this.syncService?.isConfigured()) {
      return;
    }
    const interval = Math.max(3, this.settings.syncIntervalSeconds) * 1000;
    this.timerId = setNodeInterval(() => {
      void this.syncNow(false);
    }, interval);
  }

  async syncNow(showNotice: boolean): Promise<void> {
    await this.initializationPromise;
    try {
      const count = await this.syncService.sync();
      if (showNotice) {
        new Notice(count > 0 ? `已同步 ${count} 条手机收集内容` : "暂无新内容");
      }
    } catch (error) {
      this.setStatus("同步失败");
      if (showNotice) {
        new Notice(this.errorMessage(error));
      }
    }
  }

  async checkBindingStatus(): Promise<RelayStatus> {
    const status = await this.syncService.status();
    this.setStatus(status.hasPending ? "有内容等待同步" : "连接正常");
    return status;
  }

  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "发生未知错误";
  }

  private setStatus(status: string): void {
    this.currentStatus = status;
    this.statusBarEl?.setText(status);
    this.statusBarEl?.setAttr("aria-label", status);
  }
}
