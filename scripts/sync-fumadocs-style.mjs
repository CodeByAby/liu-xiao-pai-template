import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = path.join(
  rootDir,
  "node_modules",
  "fumadocs-ui",
  "dist",
  "style.css",
);
const targetDir = path.join(rootDir, "public");
const targetPath = path.join(targetDir, "fumadocs-style.css");

try {
  await mkdir(targetDir, { recursive: true });
  await copyFile(sourcePath, targetPath);

  console.log(`Synced Fumadocs stylesheet to ${path.relative(rootDir, targetPath)}`);
} catch (error) {
  console.error(
    [
      "Failed to sync the Fumadocs stylesheet.",
      "Expected source:",
      `  ${path.relative(rootDir, sourcePath)}`,
      "Run `pnpm install` to restore dependencies before running dev/build again.",
    ].join("\n"),
  );

  throw error;
}
