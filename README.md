# Quick Capture

**中文用户：请直接跳到 [零基础完整配置教程](#零基础完整配置教程)。**

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

> **第一次使用请从“零基础完整配置教程”开始，严格按顺序完成。** 不需要购买域名，也不需要在手机上安装 Obsidian。

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

<a id="首次配置"></a>

## 零基础完整配置教程

整个配置只做一次。完成后，日常使用就是：手机点“分享”或运行快捷指令，内容自动进入电脑 Obsidian。

请按下面顺序操作：

1. 安装电脑插件；
2. 部署个人接收服务并保存四个配置值；
3. 在电脑插件中填写三个值并测试；
4. 在手机中填写服务地址和手机令牌；
5. 发送一条测试内容。

### 第 0 步：先认识四个配置值

部署完成后会出现一段类似下面的结果。每个人的内容都不同，**请使用你自己屏幕上显示的完整值，不要复制文档里的示例**。

```json
{
  "relayUrl": "https://quick-capture-relay.你的账号.workers.dev",
  "CLIENT_TOKEN": "一长串英文字母和数字",
  "MOBILE_CAPTURE_TOKEN": "另一长串英文字母和数字",
  "SYNC_ENCRYPTION_KEY": "一长串加密密钥"
}
```

| 部署结果中的名称 | 填写位置 | 注意事项 |
| --- | --- | --- |
| `relayUrl` | 电脑插件的“服务地址”；手机请求 URL 的开头 | 必须以 `https://` 开头。填写时不要带英文引号 |
| `CLIENT_TOKEN` | 只填在电脑插件的“客户端令牌” | 不要填到手机的 `token` 中 |
| `MOBILE_CAPTURE_TOKEN` | 只填在手机请求体的 `token` 中 | 不要填到电脑插件的“客户端令牌”中 |
| `SYNC_ENCRYPTION_KEY` | 只填在电脑插件的“同步加密密钥” | 大小写、`+`、`/`、`=` 都必须原样保留 |

不要把四个值发给别人，也不要把它们上传到 GitHub。建议先保存到密码管理器或一份临时的本地文本中，全部配置完成后再删除临时文本。

### 第 1 步：在电脑上安装 Quick Capture

1. 打开电脑上的 Obsidian。
2. 点击左下角齿轮按钮“设置”。
3. 点击左侧“第三方插件”或“社区插件”。不同版本的中文名称可能略有不同。
4. 如果看到“安全模式”，先点击“关闭安全模式”并确认。
5. 点击“浏览”。
6. 在搜索框输入 `Quick Capture`。
7. 点击搜索结果中的 **Quick Capture**。
8. 点击“安装”。
9. 安装完成后点击“启用”。
10. 回到“第三方插件”页面，确认 Quick Capture 右侧开关已经打开。

如果插件还没有出现在社区市场，可打开本项目的 [Releases](https://github.com/zhengxn1/quick-capture/releases)，下载最新版本的 `main.js`、`manifest.json` 和 `styles.css`，把三个文件放入：

```text
你的知识库/.obsidian/plugins/quick-capture/
```

然后完全退出并重新打开 Obsidian，再到“设置 → 第三方插件”中启用 Quick Capture。

### 第 2 步：部署只属于你的接收服务

这一步只需要一个免费的 Cloudflare 账号。**不需要域名，不需要购买服务器，也不需要设置 DNS。** Cloudflare 会免费生成一个以 `workers.dev` 结尾的 HTTPS 地址。

#### 2.1 注册 Cloudflare

1. 用电脑浏览器打开 [Cloudflare 注册页面](https://dash.cloudflare.com/sign-up)。
2. 输入邮箱和密码，点击“创建账户”或“Sign up”。
3. 按邮箱中的验证邮件完成验证。
4. 保持 Cloudflare 登录状态。

#### 2.2 安装 Node.js

1. 打开 [Node.js 下载页面](https://nodejs.org/zh-cn/download)。
2. 下载标有 **LTS** 的版本。
3. 双击安装包。
4. 安装过程中保持默认选项，一直点击“继续”或“Next”，最后点击“安装”或“Install”。
5. 安装完成后关闭安装窗口。

#### 2.3 下载 Quick Capture 源码

1. 打开 [Quick Capture GitHub 仓库](https://github.com/zhengxn1/quick-capture)。
2. 点击绿色的 **Code** 按钮。
3. 点击 **Download ZIP**。
4. 下载完成后双击 ZIP 文件解压。
5. 记住解压后的 `quick-capture` 文件夹位置。

#### 2.4 Windows 部署

1. 用文件资源管理器打开刚解压的 `quick-capture` 文件夹。
2. 点击窗口上方显示文件夹路径的地址栏。
3. 输入 `cmd`，按回车。此时会打开一个黑色命令窗口。
4. 在黑色窗口输入下面这一行，按回车：

   ```text
   npm install
   ```

5. 等待命令执行结束。第一次安装通常需要几分钟。
6. 再输入下面这一行，按回车：

   ```text
   npm run deploy
   ```

7. 如果浏览器自动打开 Cloudflare 授权页面，登录你的 Cloudflare 账号，然后点击“允许”或“Allow”。
8. 回到黑色命令窗口继续等待，直到出现“部署成功。请立即保存以下个人配置”。

#### 2.5 macOS 部署

1. 打开“应用程序 → 实用工具 → 终端”。
2. 在终端输入 `cd`，然后输入一个空格，先不要按回车。
3. 把刚解压的 `quick-capture` 文件夹直接拖进终端窗口。
4. 按回车。
5. 输入下面这一行，按回车：

   ```text
   npm install
   ```

6. 等待命令执行结束，再输入下面这一行并按回车：

   ```text
   npm run deploy
   ```

7. 如果浏览器自动打开 Cloudflare 授权页面，登录你的 Cloudflare 账号，然后点击“允许”或“Allow”。
8. 回到终端继续等待，直到出现“部署成功。请立即保存以下个人配置”。

#### 2.6 保存部署结果

部署成功后，命令窗口最后会显示 `relayUrl`、`CLIENT_TOKEN`、`MOBILE_CAPTURE_TOKEN` 和 `SYNC_ENCRYPTION_KEY`。完整复制并安全保存这四个值。

如果没有看到这四个值，不要继续配置手机。先向上查看命令窗口中是否有红色错误信息。

### 第 3 步：设置电脑插件

1. 打开电脑上的 Obsidian。
2. 点击左下角齿轮按钮“设置”。
3. 点击左侧“第三方插件”或“社区插件”。
4. 在“已安装插件”中找到 **Quick Capture**。
5. 点击 Quick Capture 右侧的齿轮按钮；也可以点击插件详情中的“选项”。
6. 找到“1. 连接服务”。
7. 在“服务地址”中粘贴你自己的 `relayUrl`，例如：

   ```text
   https://quick-capture-relay.你的账号.workers.dev
   ```

   不要输入 `relayUrl=`，不要带英文引号，末尾也不要重复添加 `/api/mobile-capture`。

8. 在“客户端令牌”中粘贴 `CLIENT_TOKEN` 后面的完整值。
9. 在“同步加密密钥”中粘贴 `SYNC_ENCRYPTION_KEY` 后面的完整值。
10. “收集目录”建议保留默认值：

    ```text
    00_INPUT/内容收集箱
    ```

11. 打开“自动同步”。
12. “同步间隔”建议填写 `3` 秒。
13. 在“检查连接”这一行点击“测试”按钮。
14. 看到“连接正常”或类似的成功提示，说明电脑端已经配置正确。

如果提示“未授权”或 `401`，通常是把 `CLIENT_TOKEN` 和 `MOBILE_CAPTURE_TOKEN` 填反了。电脑插件必须填写 `CLIENT_TOKEN`。

<a id="手机配置"></a>

### 第 4 步 A：连接 iPhone

下面制作的快捷指令既能从分享菜单发送，也能单独打开后手动输入。不同 iOS 版本可能显示“请求输入”或“询问输入”，它们是同一个操作。

#### 4A.1 新建快捷指令

1. 在 iPhone 打开系统自带的“快捷指令”App。
2. 进入底部“快捷指令”页面。
3. 点击右上角 `+`。
4. 点击顶部的“新建快捷指令”名称。
5. 点击“重新命名”，输入：

   ```text
   收集到 Quick Capture
   ```

6. 点击“添加操作”。

#### 4A.2 添加“请求输入”

1. 在底部搜索框输入“请求输入”。如果搜不到，再搜索“询问输入”。
2. 点击“请求输入”操作。
3. 点击操作中的蓝色“提示”，输入：

   ```text
   请输入或确认要收集的内容
   ```

4. 确认输入类型是“文本”。
5. 点击操作右侧的小箭头展开更多选项。
6. 打开“允许多行”。
7. 点击“默认回答”或“默认答案”。
8. 在键盘上方点击“选择变量”。
9. 选择“快捷指令输入”。这样从微信、浏览器或其他 App 分享过来的文字和链接会自动出现在输入框中。

如果你的系统中看不到“默认回答”，可以不设置。使用分享菜单时，长按输入框并粘贴内容也能正常发送。

#### 4A.3 添加请求地址

1. 点击底部搜索框，搜索 `URL`。
2. 点击名称只有“URL”的操作。
3. 在 URL 输入框中填写：你的 `relayUrl` 加上 `/api/mobile-capture`。

   例如你的 `relayUrl` 是：

   ```text
   https://quick-capture-relay.abc.workers.dev
   ```

   那么这里必须填写：

   ```text
   https://quick-capture-relay.abc.workers.dev/api/mobile-capture
   ```

4. 检查中间不能有空格，末尾不要多一个 `/`。

#### 4A.4 添加 POST 请求

1. 点击底部搜索框，搜索“获取 URL 内容”。
2. 点击“获取 URL 内容”。它会自动使用上一步的 URL。
3. 点击“方法”右侧的 `GET`。
4. 选择 `POST`。
5. 选择 POST 后会出现“请求体”，点击它并选择 `JSON`。
6. 在 JSON 区域点击“添加新字段”。
7. 第一个字段左侧“键”填写：

   ```text
   token
   ```

8. 第一个字段右侧保持“文本”，填写你自己的 `MOBILE_CAPTURE_TOKEN` 完整值。不要填写 `CLIENT_TOKEN`，不要带英文引号。
9. 再点击“添加新字段”。
10. 第二个字段左侧“键”填写：

    ```text
    content
    ```

11. 第二个字段右侧保持“文本”。点击右侧输入区域，再点击键盘上方“选择变量”。
12. 选择前面“请求输入”操作产生的蓝色变量。变量名称通常显示为“请求输入”或“提供的输入”。

最终请求体必须包含两行：

| 键 | 类型 | 值 |
| --- | --- | --- |
| `token` | 文本 | 你自己的 `MOBILE_CAPTURE_TOKEN` |
| `content` | 文本 | 蓝色的“请求输入”变量，不能是手工输入的四个中文字 |

使用 JSON 请求体时，快捷指令会自动设置 `Content-Type: application/json`，不需要再手动添加请求头。

#### 4A.5 添加成功通知

1. 点击底部搜索框，搜索“显示通知”。
2. 点击“显示通知”。
3. 把通知内容改为：

   ```text
   已发送到 Quick Capture
   ```

#### 4A.6 放进 iPhone 分享菜单

1. 点击快捷指令顶部名称右侧的向下箭头，或者点击底部圆形 `i` 信息按钮。
2. 点击“详细信息”。
3. 打开“在共享表单中显示”或“在共享菜单中显示”。
4. 点击“接收”后面的类型。
5. 只保留“文本”和“URL”，然后点击“完成”。
6. 返回编辑页面，再点击右上角“完成”。

#### 4A.7 添加到 iPhone 主屏幕（可选）

1. 打开刚创建的快捷指令。
2. 点击顶部名称右侧的向下箭头。
3. 点击“添加到主屏幕”。
4. 点击右上角“添加”。

以后可以直接点击桌面图标，输入内容后发送。

### 第 4 步 B：连接 Android

安卓推荐使用免费的开源 App [HTTP Shortcuts](https://http-shortcuts.rmy.ch/)。下面的“JSON 编码”开关一定要打开，否则正文里有换行或英文引号时可能发送失败。

#### 4B.1 安装 HTTP Shortcuts

1. 在 Google Play 或 F-Droid 搜索 `HTTP Shortcuts`。
2. 确认开发者或项目名称与 [HTTP Shortcuts 官方网站](https://http-shortcuts.rmy.ch/) 一致。
3. 点击“安装”，安装后打开 App。

#### 4B.2 建立接收分享内容的变量

1. 在 HTTP Shortcuts 主页面点击右上角三点菜单 `⋮`。
2. 点击“变量”或“Variables”。
3. 点击右下角 `+`。
4. 选择“常量”或“Static Variable”。
5. “名称”填写：

   ```text
   shared_text
   ```

6. “值”可以暂时填写：

   ```text
   测试内容
   ```

7. 找到并打开“JSON 编码”或“JSON encode”。
8. 找到并打开“允许‘共享’”或“Allow Receiving Value from Share Dialog”。
9. 在随后出现的“要从分享获得的数据”中选择“仅文本”。
10. 点击右上角对勾或“保存”。

#### 4B.3 新建发送快捷方式

1. 回到 HTTP Shortcuts 主页面。
2. 点击右下角 `+`。
3. 点击“新建快捷方式”，然后选择“从头创建”。
4. “快捷方式名称”填写：

   ```text
   收集到 Quick Capture
   ```

5. “方法”选择 `POST`。
6. “URL”填写你的 `relayUrl` 加上 `/api/mobile-capture`，例如：

   ```text
   https://quick-capture-relay.abc.workers.dev/api/mobile-capture
   ```

7. 打开“请求正文”或“Request Body”区域。
8. “请求正文类型”选择“自定义类型”或“Custom Text”。
9. “内容类型（Content-Type）”填写：

   ```text
   application/json
   ```

10. 在正文输入框先输入：

    ```json
    {
      "token": "把这里替换为你的 MOBILE_CAPTURE_TOKEN",
      "content": ""
    }
    ```

11. 把 `把这里替换为你的 MOBILE_CAPTURE_TOKEN` 替换成部署结果中的完整手机令牌。保留令牌两边的英文双引号。
12. 把光标放在 `"content": ""` 的两个英文双引号中间。
13. 点击输入框旁边的 `{ }` 变量按钮。
14. 选择紫色全局变量 `shared_text`。不要手工输入 `shared_text`，必须通过 `{ }` 按钮插入变量。
15. 最终正文应类似下面这样，其中 `shared_text` 会显示为紫色变量：

    ```json
    {
      "token": "你的 MOBILE_CAPTURE_TOKEN",
      "content": "紫色 shared_text 变量"
    }
    ```

16. 点击右上角“测试”。测试成功后点击“保存”或右上角对勾。

#### 4B.4 放进 Android 分享菜单

因为 `shared_text` 已打开“允许共享”，在浏览器、微信或其他 App 中分享文字或链接时，系统分享菜单会出现“发送到…”或 HTTP Shortcuts。

1. 打开刚创建的快捷方式进行编辑。
2. 打开“触发器与执行设置”或“Trigger & Execution Settings”。
3. 如果看到“在主应用长按快捷菜单中显示”或 Direct Share 相关选项，请打开它。
4. 保存快捷方式。
5. 在任意 App 中选中文字或打开网页。
6. 点击系统“分享”。
7. 选择 HTTP Shortcuts 或“收集到 Quick Capture”。
8. 如果系统要求选择快捷方式，再选择“收集到 Quick Capture”。

### 第 5 步：发送第一条测试内容

#### iPhone 测试

1. 在 Safari 或微信中选中一段普通文字。
2. 点击“分享”。
3. 在分享菜单中点击“收集到 Quick Capture”。如果没有显示，向下滑动并点击“编辑操作”，把它加入常用项目。
4. 确认输入框中是要收集的内容。
5. 点击“完成”。
6. 看到“已发送到 Quick Capture”通知，表示手机已经把请求发出。

#### Android 测试

1. 在浏览器或微信中选中一段普通文字。
2. 点击“分享”。
3. 选择 HTTP Shortcuts 或“收集到 Quick Capture”。
4. 选择刚建立的快捷方式。
5. 看到成功提示，表示手机已经把请求发出。

#### 在电脑确认

1. 打开电脑上的 Obsidian。
2. 等待几秒钟。插件开启自动同步时会自动获取内容。
3. 如果没有立即出现，点击 Obsidian 左侧边栏的 Quick Capture 刷新按钮，手动检查一次。
4. 打开下面的目录：

   ```text
   00_INPUT/内容收集箱
   ```

5. 打开当天日期的文件，例如 `2026-07-17.md`。
6. 测试内容应出现在 Markdown 表格的最后一行。

电脑关机或 Obsidian 未打开时也可以发送。内容会暂存在你自己的 Cloudflare 队列中；电脑下次打开 Obsidian 后自动补齐。默认保留 7 天。

### 常见问题排查

| 现象 | 最可能的原因 | 处理方法 |
| --- | --- | --- |
| 电脑插件测试提示 `401` 或“未授权” | 电脑填错令牌 | “客户端令牌”必须填写 `CLIENT_TOKEN`，不是 `MOBILE_CAPTURE_TOKEN` |
| 手机提示 `401` 或 `unauthorized` | 手机填错令牌 | 手机 JSON 的 `token` 必须填写 `MOBILE_CAPTURE_TOKEN` |
| 手机提示“网络连接中断” | URL 不完整或服务未部署成功 | 检查必须是 `relayUrl/api/mobile-capture`，中间没有空格 |
| iPhone 能运行但发送的是固定文字 | `content` 填成了普通文本 | 点击 `content` 的值并重新选择蓝色“请求输入”变量 |
| Android 普通文字可以发，换行或引号会失败 | 没打开 JSON 编码 | 编辑 `shared_text` 变量，打开“JSON 编码” |
| 手机显示成功，电脑暂时没有内容 | Obsidian 未运行或自动同步未打开 | 打开 Obsidian，等待几秒；再点击左侧刷新按钮保底检查 |
| iPhone 分享菜单没有快捷指令 | 没打开“在共享表单中显示” | 打开快捷指令详细信息，启用该选项并选择“文本、URL” |
| Android 分享菜单没有快捷方式 | 变量未允许共享 | 编辑 `shared_text`，打开“允许‘共享’”，并在快捷方式中使用该变量 |
| 找不到当天文件 | 收集目录被修改 | 到插件设置查看“收集目录”，再在该目录中找当天日期文件 |

### 最终检查清单

- [ ] Quick Capture 插件已经启用。
- [ ] 插件“测试连接”显示成功。
- [ ] 电脑“客户端令牌”填写的是 `CLIENT_TOKEN`。
- [ ] 手机 `token` 填写的是 `MOBILE_CAPTURE_TOKEN`。
- [ ] 手机 URL 是完整的 `relayUrl/api/mobile-capture`。
- [ ] iPhone 的 `content` 是蓝色变量，或 Android 的 `content` 是紫色 `shared_text` 变量。
- [ ] 测试内容已经出现在当天 Markdown 表格的最后一行。

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
