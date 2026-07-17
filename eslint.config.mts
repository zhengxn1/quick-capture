import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
  globalIgnores([
    "node_modules",
    "plugin/dist",
    "release",
    "worker",
    "scripts",
    ".private",
  ]),
  {
    files: ["plugin/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["plugin/src/**/*.ts"],
    rules: {
      // The settings UI is Chinese and intentionally preserves product names such as
      // iPhone and Cloudflare, so the English-only sentence-case heuristic is disabled.
      "obsidianmd/ui/sentence-case": "off",
      // Declarative setting definitions require Obsidian 1.13; this plugin keeps
      // compatibility with the declared minimum version 1.5.0.
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
      "@typescript-eslint/no-deprecated": "off",
    },
  },
);
