# Quick Capture

Quick Capture sends text, links, and short notes from an iPhone or Android device to the Obsidian desktop app on macOS or Windows. Messages are stored temporarily in a private Cloudflare Worker and D1 database owned by the user, then written into a daily Markdown table when the desktop app is available.

## Features

- Capture text and links from the iOS Shortcuts share sheet.
- Accept shared text and URLs from Android automation tools.
- Automatically sync when the desktop app starts and while it remains open.
- Keep messages queued while the computer is offline.
- Append every capture to one Markdown table per day.
- Encrypt queued content with AES-256-GCM.
- Delete messages after the desktop plugin confirms successful storage.
- Deploy the relay to the user's own Cloudflare account.
- No custom domain, server, public relay, or WeChat account is required.

## How it works

```text
iPhone or Android
        | HTTPS
        v
Your Cloudflare Worker and D1 database
        | encrypted queue
        v
Quick Capture desktop plugin
        |
        v
00_INPUT/内容收集箱/YYYY-MM-DD.md
```

The desktop plugin is required on macOS or Windows. The phone acts only as a sender and does not need the mobile Obsidian app.

## Installation

After Quick Capture is accepted into the community directory, install it from:

```text
Settings -> Community plugins -> Browse -> Quick Capture -> Install -> Enable
```

For testing, download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release and place them in:

```text
<vault>/.obsidian/plugins/quick-capture/
```

Reload Obsidian and enable Quick Capture under Community plugins.

## Deploy the private relay

A free Cloudflare account is required. A custom domain is optional because Cloudflare supplies a `workers.dev` HTTPS address.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/zhengxn1/quick-capture)

Command-line deployment is also supported on Windows, macOS, and Linux:

```bash
git clone https://github.com/zhengxn1/quick-capture.git
cd quick-capture
npm install
npm run deploy
```

Save the four values printed by the deployment process:

- `relayUrl`
- `CLIENT_TOKEN`
- `MOBILE_CAPTURE_TOKEN`
- `SYNC_ENCRYPTION_KEY`

Open `Settings -> Community plugins -> Quick Capture`, enter the relay URL, client token, and encryption key, then select **Test connection**.

## Phone request format

Both iOS and Android send the same JSON request:

```http
POST https://your-worker.workers.dev/api/mobile-capture
Content-Type: application/json

{
  "token": "MOBILE_CAPTURE_TOKEN",
  "content": "Text or URL to capture"
}
```

On iPhone, create a Shortcut that accepts shared text and URLs, sends the JSON request, and appears in the share sheet. On Android, use an automation tool that can receive shared text and perform an HTTP POST request.

## Privacy and security

- Captures pass only through infrastructure deployed in the user's Cloudflare account.
- Queue content is encrypted with AES-256-GCM.
- The author does not operate a shared relay and cannot access user captures.
- Tokens and encryption keys must never be committed to Git.
- Plugin credentials are stored locally in `.obsidian/plugins/quick-capture/data.json`.
- Queued messages are deleted after successful synchronization and expire automatically after the configured retention period.

## Development

```bash
npm install
npm run verify
npm run release
```

Release assets are generated in `release/`. The project is licensed under the [MIT License](LICENSE).

---

## 中文说明

把 iPhone 或 Android 上看到的文字、链接和随手记录，安全地发送到 Mac 或 Windows 上的 Obsidian。手机不需要安装 Obsidian，电脑离线时内容会暂存在用户自己的 Cloudflare 加密队列中。

## 特点

- iPhone 快捷指令与 Android 分享菜单均可发送。
- Mac、Windows 的 Obsidian 桌面版自动同步。
- 每天写入一个 Markdown 文件，并追加到同一张表格。
- 队列使用 AES-256-GCM 加密，同步确认后立即删除。
- 每个用户部署到自己的 Cloudflare 账号，不经过作者服务器。
- 不需要微信公众号、iCloud、服务器或自定义域名。
- Cloudflare 自动提供免费的 `workers.dev` HTTPS 地址。

## 工作方式

```text
iPhone / Android
        ↓ HTTPS
用户自己的 Cloudflare Worker + D1
        ↓ 加密队列
Quick Capture 桌面插件
        ↓
00_INPUT/内容收集箱/YYYY-MM-DD.md
```

## 首次配置

### 1. 安装插件

正式进入 Obsidian 社区插件市场后：

```text
设置 → 第三方插件 → 浏览 → 搜索 Quick Capture → 安装 → 启用
```

测试阶段可从 GitHub Release 下载 `main.js`、`manifest.json`、`styles.css`，放入：

```text
<你的知识库>/.obsidian/plugins/quick-capture/
```

### 2. 部署个人接收服务

用户不需要域名，只需要一个 Cloudflare 账号。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/zhengxn1/quick-capture)

也可以使用 Windows、macOS 或 Linux 终端部署：

```bash
git clone https://github.com/zhengxn1/quick-capture.git
cd quick-capture
npm install
npm run deploy
```

部署脚本会：

1. 登录 Cloudflare；
2. 自动创建 D1 队列数据库；
3. 自动生成三个随机密钥；
4. 部署到免费的 `workers.dev` 地址；
5. 显示一次性配置，请立即安全保存。

需要保存：

- `relayUrl`
- `CLIENT_TOKEN`
- `MOBILE_CAPTURE_TOKEN`
- `SYNC_ENCRYPTION_KEY`

### 3. 设置 Quick Capture

进入：

```text
设置 → 第三方插件 → Quick Capture → 选项
```

填写：

- 服务地址：`relayUrl`
- 客户端令牌：`CLIENT_TOKEN`
- 同步加密密钥：`SYNC_ENCRYPTION_KEY`
- 收集目录：默认 `00_INPUT/内容收集箱`

点击“测试”，显示“连接正常”后即可配置手机。

## 手机配置

手机请求格式：

```http
POST https://你的地址.workers.dev/api/mobile-capture
Content-Type: application/json

{
  "token": "MOBILE_CAPTURE_TOKEN",
  "content": "要收集的文字或链接"
}
```

### iPhone

在“快捷指令”中创建“收集到 Obsidian”：

1. 获取剪贴板；
2. 请求输入，默认值选择剪贴板变量；
3. 添加 URL：`relayUrl/api/mobile-capture`；
4. “获取 URL 内容”选择 POST；
5. 请求体选择 JSON；
6. `token` 填写 `MOBILE_CAPTURE_TOKEN`；
7. `content` 选择请求输入变量；
8. 显示“已发送”通知；
9. 打开“在共享表单中显示”，接收文本和 URL。

### Android

使用支持 Android 分享菜单和 HTTP POST 的自动化工具：

1. 新建一个接收“文本/URL 分享”的任务；
2. 方法选择 POST；
3. URL 填写 `relayUrl/api/mobile-capture`；
4. Content-Type 选择 `application/json`；
5. JSON 中填写 `token` 和分享文本变量 `content`；
6. 将任务添加到系统分享菜单或桌面快捷方式。

后续版本将提供可直接导入的 Android 配置和轻量发送端。

## 自动同步

- Obsidian运行时按设置间隔后台拉取。
- 电脑关机时消息保留在 Cloudflare D1。
- 电脑恢复并启动 Obsidian 后自动补齐。
- 左侧刷新按钮仅用于检查和保底。
- 默认队列保留 7 天，可修改 `QUEUE_TTL_SECONDS`。

## 开发

```bash
npm install
npm run verify
npm run release
```

发布文件生成到 `release/`：

- `main.js`
- `manifest.json`
- `styles.css`

## 隐私与安全

- 数据只经过用户自己的 Cloudflare 账号。
- 队列正文使用 AES-256-GCM 加密。
- 手机令牌、客户端令牌和同步密钥不得提交到 Git。
- Obsidian 插件配置位于知识库 `.obsidian/plugins/quick-capture/data.json`，其中含有私密令牌。
- 作者不提供公共中转服务，也无法访问用户内容。

## License

[MIT](LICENSE)
