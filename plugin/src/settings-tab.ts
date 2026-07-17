import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type QuickCapturePlugin from "./main";

const REPOSITORY_URL = "https://github.com/zhengxn1/quick-capture";
const DEPLOY_URL = `https://deploy.workers.cloudflare.com/?url=${REPOSITORY_URL}`;

export class PrivateSyncSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: QuickCapturePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", {
      text: "把 iPhone 或 Android 分享的文字和链接安全地收集到当前知识库。电脑离线时内容会暂存在你自己的 Cloudflare 队列中。",
    });

    new Setting(containerEl).setName("1. 连接服务").setHeading();
    new Setting(containerEl)
      .setName("部署个人接收服务")
      .setDesc("首次使用请部署到自己的 Cloudflare 账号。Cloudflare 会提供免费地址，不需要域名。")
      .addButton((button) =>
        button.setCta().setButtonText("部署到 Cloudflare").onClick(() => {
          window.open(DEPLOY_URL);
        }),
      )
      .addButton((button) =>
        button.setButtonText("查看教程").onClick(() => {
          window.open(`${REPOSITORY_URL}#首次配置`);
        }),
      );

    new Setting(containerEl)
      .setName("服务地址")
      .setDesc("Cloudflare 部署完成后获得的 workers.dev 地址，不要填写末尾斜杠。")
      .addText((text) =>
        text
          .setPlaceholder("https://quick-capture-xxx.workers.dev")
          .setValue(this.plugin.settings.relayUrl)
          .onChange(async (value) => {
            this.plugin.settings.relayUrl = value.trim().replace(/\/+$/, "");
            await this.plugin.savePluginSettings();
            this.plugin.restartTimer();
          }),
      );

    new Setting(containerEl)
      .setName("客户端令牌")
      .setDesc("部署时生成的 CLIENT_TOKEN，只保存在当前知识库。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("CLIENT_TOKEN")
          .setValue(this.plugin.settings.clientToken)
          .onChange(async (value) => {
            this.plugin.settings.clientToken = value.trim();
            await this.plugin.savePluginSettings();
            this.plugin.restartTimer();
          });
      });

    new Setting(containerEl)
      .setName("同步加密密钥")
      .setDesc("部署时生成的 SYNC_ENCRYPTION_KEY，用于解密队列内容。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("SYNC_ENCRYPTION_KEY")
          .setValue(this.plugin.settings.syncEncryptionKey)
          .onChange(async (value) => {
            this.plugin.settings.syncEncryptionKey = value.trim();
            await this.plugin.savePluginSettings();
            this.plugin.restartTimer();
          });
      });

    new Setting(containerEl)
      .setName("检查连接")
      .setDesc(`当前状态：${this.plugin.currentStatus}`)
      .addButton((button) =>
        button.setButtonText("测试").onClick(async () => {
          try {
            const status = await this.plugin.checkBindingStatus();
            new Notice(status.hasPending ? "连接正常，有内容等待同步" : "连接正常");
            this.display();
          } catch (error) {
            new Notice(this.plugin.errorMessage(error));
          }
        }),
      );

    new Setting(containerEl).setName("2. 保存与同步").setHeading();
    new Setting(containerEl)
      .setName("收集目录")
      .setDesc("每天的内容会追加到该目录下的 YYYY-MM-DD.md 表格。")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.inboxFolder)
          .onChange(async (value) => {
            this.plugin.settings.inboxFolder = value.trim();
            await this.plugin.savePluginSettings();
          }),
      );

    new Setting(containerEl)
      .setName("自动同步")
      .setDesc("建议开启。Obsidian 运行时后台无感同步，离线内容恢复后自动补齐。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.savePluginSettings();
          this.plugin.restartTimer();
        }),
      );

    new Setting(containerEl)
      .setName("同步间隔")
      .setDesc("单位为秒，最短 3 秒。")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.syncIntervalSeconds))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed)) {
              this.plugin.settings.syncIntervalSeconds = Math.max(3, parsed);
              await this.plugin.savePluginSettings();
              this.plugin.restartTimer();
            }
          }),
      );

    new Setting(containerEl)
      .setName("立即同步")
      .setDesc("仅用于检查和保底，日常无需点击。")
      .addButton((button) =>
        button.setButtonText("同步").onClick(async () => {
          await this.plugin.syncNow(true);
        }),
      );

    new Setting(containerEl).setName("3. 配置手机").setHeading();
    containerEl.createEl("p", {
      text: "完成连接测试后，按照项目教程安装 iPhone 快捷指令或 Android 分享配置。手机只需要服务地址和 MOBILE_CAPTURE_TOKEN。",
    });
    new Setting(containerEl)
      .setName("手机配置教程")
      .setDesc("支持 iPhone 和 Android，手机不需要安装 Obsidian。")
      .addButton((button) =>
        button.setButtonText("打开教程").onClick(() => {
          window.open(`${REPOSITORY_URL}#手机配置`);
        }),
      );
  }
}
