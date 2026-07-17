import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(join(tmpdir(), "quick-capture-"));
const secretsPath = join(temporary, "secrets.json");
const secrets = {
  CLIENT_TOKEN: randomBytes(32).toString("hex"),
  MOBILE_CAPTURE_TOKEN: randomBytes(32).toString("hex"),
  SYNC_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};

try {
  await writeFile(secretsPath, JSON.stringify(secrets), { mode: 0o600 });
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["wrangler", "deploy", "--cwd", "worker", "--secrets-file", secretsPath],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);

  const migration = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["wrangler", "d1", "migrations", "apply", "CAPTURE_DB", "--remote", "--cwd", "worker"],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(migration.stdout);
  process.stderr.write(migration.stderr);
  if (migration.status !== 0) process.exit(migration.status ?? 1);

  const relayUrl = result.stdout.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0] ??
    "粘贴上方部署结果中的 workers.dev 地址";
  console.log("\n部署成功。请立即保存以下个人配置，不要公开或提交到 Git：\n");
  console.log(JSON.stringify({ relayUrl, ...secrets }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
