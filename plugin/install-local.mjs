import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const pluginRoot = resolve(import.meta.dirname);
const vaultRoot = resolve(process.argv[2] ?? process.env.OBSIDIAN_VAULT ?? resolve(pluginRoot, "../../.."));
const pluginsRoot = resolve(vaultRoot, ".obsidian/plugins");
const destination = resolve(pluginsRoot, "quick-capture");
const legacy = resolve(pluginsRoot, "wechat-private-sync");

await access(resolve(vaultRoot, ".obsidian"), constants.R_OK | constants.W_OK);
await mkdir(destination, { recursive: true });
await Promise.all([
  copyFile(resolve(pluginRoot, "dist/main.js"), resolve(destination, "main.js")),
  copyFile(resolve(pluginRoot, "manifest.json"), resolve(destination, "manifest.json")),
  copyFile(resolve(pluginRoot, "styles.css"), resolve(destination, "styles.css")),
]);

try {
  await access(resolve(destination, "data.json"), constants.F_OK);
} catch {
  try {
    await copyFile(resolve(legacy, "data.json"), resolve(destination, "data.json"));
    console.log("Migrated settings from wechat-private-sync.");
  } catch {
    // New installation: Obsidian creates data.json after settings are saved.
  }
}

const enabledPath = resolve(vaultRoot, ".obsidian/community-plugins.json");
try {
  const enabled = JSON.parse(await readFile(enabledPath, "utf8"));
  const next = [
    ...new Set([
      ...enabled.filter((id) => id !== "wechat-private-sync"),
      "quick-capture",
    ]),
  ];
  await writeFile(enabledPath, `${JSON.stringify(next, null, 2)}\n`);
} catch {
  // Obsidian will enable the plugin manually when no plugin list is available.
}
