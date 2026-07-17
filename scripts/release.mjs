import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "release");
await mkdir(output, { recursive: true });
await Promise.all([
  copyFile(resolve(root, "plugin/dist/main.js"), resolve(output, "main.js")),
  copyFile(resolve(root, "plugin/manifest.json"), resolve(output, "manifest.json")),
  copyFile(resolve(root, "plugin/styles.css"), resolve(output, "styles.css")),
]);
console.log(`Release files ready: ${output}`);
