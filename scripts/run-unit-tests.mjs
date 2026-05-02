import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(rootDir, "tests", "unit");
const cacheDir = path.join(rootDir, ".unit-test-cache");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const current = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(current);
    return /\.(test|spec)\.tsx?$/.test(entry.name) ? [current] : [];
  });
}

const testFiles = walk(testsDir);

if (testFiles.length === 0) {
  console.error("Tidak ada unit test di tests/unit.");
  process.exit(1);
}

if (!cacheDir.startsWith(rootDir)) {
  throw new Error("Cache test harus berada di dalam workspace.");
}

fs.rmSync(cacheDir, { recursive: true, force: true });
fs.mkdirSync(cacheDir, { recursive: true });

const outputFiles = [];

for (const file of testFiles) {
  const relativeName = path
    .relative(testsDir, file)
    .replace(/[\\/]/g, "__")
    .replace(/\.(test|spec)\.tsx?$/, ".mjs");
  const outfile = path.join(cacheDir, relativeName);

  await build({
    entryPoints: [file],
    outfile,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    sourcemap: "inline",
    logLevel: "silent",
  });

  outputFiles.push(outfile);
}

const result = spawnSync(process.execPath, ["--test", ...outputFiles], {
  cwd: rootDir,
  stdio: "inherit",
});

fs.rmSync(cacheDir, { recursive: true, force: true });

process.exit(result.status ?? 1);
