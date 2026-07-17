import esbuild from "esbuild";
import process from "node:process";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "node:timers"],
  format: "cjs",
  target: "es2022",
  platform: "browser",
  outfile: "dist/main.js",
  sourcemap: production ? false : "inline",
  minify: production,
  logLevel: "info",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
