import type { RelayMessage } from "./types";

const TABLE_END = "<!-- quick-capture-table-end -->";

export function localDateParts(unixSeconds: number): { date: string; time: string } {
  const value = new Date(unixSeconds * 1000);
  const date = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    String(value.getHours()).padStart(2, "0"),
    String(value.getMinutes()).padStart(2, "0"),
  ].join(":");
  return { date, time };
}

function typeLabel(type: string): string {
  return type === "link" ? "链接" : "文字";
}

function messageBody(message: RelayMessage): string {
  if (message.msgType === "link") {
    return [message.title, message.description, message.url].filter(Boolean).join(" — ");
  }
  return message.content?.trim() || "（空内容）";
}

function tableCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll(/\r?\n/g, "<br>")
    .trim();
}

function marker(message: RelayMessage): string {
  return `<!-- quick-capture:${message.id} -->`;
}

export function formatTableRow(message: RelayMessage): string {
  const { time } = localDateParts(message.createTime);
  return `| ${time} | ${typeLabel(message.msgType)} | ${tableCell(messageBody(message))} ${marker(message)} | 待处理 |`;
}

export function formatTableSection(message: RelayMessage): string {
  return [
    "## 手机收集",
    "",
    "| 时间 | 类型 | 内容 | 状态 |",
    "|---|---|---|---|",
    formatTableRow(message),
    TABLE_END,
    "",
  ].join("\n");
}

export function appendTableRow(content: string, message: RelayMessage): string {
  if (content.includes(marker(message))) return content;
  const legacyEnd = "<!-- mobile-capture-table-end -->";
  const endMarker = content.includes(TABLE_END) ? TABLE_END : legacyEnd;
  if (content.includes(endMarker)) {
    return content.replace(endMarker, `${formatTableRow(message)}\n${endMarker}`);
  }
  return `${content.trimEnd()}\n\n${formatTableSection(message)}`;
}

export function initialDailyContent(date: string): string {
  return [
    "---",
    "type: input/capture",
    "status: inbox",
    `created: ${date}`,
    "source: quick-capture",
    "---",
    "",
    `# ${date} 内容收集箱`,
    "",
  ].join("\n");
}
