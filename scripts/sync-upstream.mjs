#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(
  process.env.PSTACK_SYNC_ROOT ?? dirname(fileURLToPath(import.meta.url)),
  process.env.PSTACK_SYNC_ROOT ? "." : "..",
);
const lockPath = join(root, "upstream.lock.json");
const boundaryLock = JSON.parse(readFileSync(lockPath, "utf8"));

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeContent(source) {
  return source
    .replaceAll("~/.cursor/rules/pstack-models.mdc", "$PSTACK_CONFIG (or .pstack/config.md)")
    .replaceAll(".cursor/skills/", "skills/")
    .replaceAll(".cursor/plugins/", "plugins/")
    .replaceAll("subagent_type:", "role:")
    .replaceAll("AskQuestion", "structured interaction tool")
    .replaceAll('environment: "cloud"', "environment: host-managed")
    .replaceAll("environment: 'cloud'", "environment: host-managed")
    .replaceAll("claude-fable-5-thinking-max", "host-configured role/model")
    .replaceAll("gpt-5.6-sol-max", "host-configured role/model")
    .replaceAll("grok-4.6-fast-xhigh", "host-configured role/model")
    .replaceAll("claude-opus-5-thinking-xhigh", "host-configured role/model")
    .replaceAll(/\bTask (?:subagent|tool)\b/g, "host task runner");
}

export function isProtectedPath(path) {
  return (
    boundaryLock.protectedPaths.includes(path) ||
    boundaryLock.protectedPrefixes.some((prefix) => path.startsWith(prefix))
  );
}

async function filesUnder(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files.push(path);
    }
  }
  await walk(directory);
  return files;
}

function parseArgs(argv) {
  const sourceIndex = argv.indexOf("--source");
  return {
    mode: argv.includes("--check") ? "check" : argv.includes("--apply") ? "apply" : argv.includes("--dry-run") ? "apply" : null,
    dryRun: argv.includes("--dry-run"),
    source: sourceIndex === -1 ? null : argv[sourceIndex + 1],
  };
}

async function sourceRepository(lock, sourceArg) {
  if (sourceArg) return { path: resolve(sourceArg), cleanup: null };
  const path = await mkdtemp(join(tmpdir(), "pstack-upstream-"));
  try {
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--branch", lock.ref, lock.repository, path],
      { stdio: "inherit" },
    );
    try {
      execFileSync(
        "git",
        ["fetch", "--quiet", "--depth", "1", "origin", lock.commit],
        { cwd: path },
      );
    } catch {
      // A missing baseline makes protected-file review fail closed.
    }
    return { path, cleanup: path };
  } catch (error) {
    await rm(path, { recursive: true, force: true });
    throw error;
  }
}

async function sourcePathFor(lock, destination, sourceRoot) {
  for (const mapping of lock.sourceRoots) {
    const prefix = `${mapping.destination}/`;
    if (destination.startsWith(prefix)) {
      const candidate = join(mapping.source, destination.slice(prefix.length));
      try {
        await stat(join(sourceRoot, candidate));
        return candidate;
      } catch {
        // Another source root may own this destination.
      }
    }
  }
  return null;
}

async function protectedChanges(lock, sourceRoot, commit) {
  const changes = [];
  for (const destination of lock.protectedPaths) {
    const sourcePath = await sourcePathFor(lock, destination, sourceRoot);
    if (!sourcePath) continue;
    const latestPath = join(sourceRoot, sourcePath);
    try {
      const latest = await readFile(latestPath);
      const baseline = execFileSync(
        "git",
        ["show", `${lock.commit}:${sourcePath}`],
        { cwd: sourceRoot },
      );
      if (hash(latest) !== hash(baseline)) changes.push(destination);
    } catch {
      changes.push(`${destination} (baseline unavailable at ${commit})`);
    }
  }
  return changes;
}

async function applyUpdate(lock, sourceRoot, commit, dryRun) {
  const conflicts = await protectedChanges(lock, sourceRoot, commit);
  if (conflicts.length > 0) {
    console.error("Upstream changed protected OMP-adapted files:");
    for (const path of conflicts) console.error(`- ${path}`);
    console.error("Review and merge those files manually before rerunning --apply.");
    return 2;
  }

  const changed = [];
  for (const mapping of lock.sourceRoots) {
    const sourceDirectory = join(sourceRoot, mapping.source);
    for (const sourceFile of await filesUnder(sourceDirectory)) {
      const destination = join(
        root,
        mapping.destination,
        relative(sourceDirectory, sourceFile),
      );
      const destinationKey = relative(root, destination);
      if (isProtectedPath(destinationKey)) continue;
      const next = normalizeContent(await readFile(sourceFile, "utf8"));
      const mode = (await stat(sourceFile)).mode & 0o777;
      let current = null;
      let currentMode = null;
      try {
        current = await readFile(destination, "utf8");
        currentMode = (await stat(destination)).mode & 0o777;
      } catch {
        // New upstream file.
      }
      if (current === next && (currentMode & 0o111) === (mode & 0o111)) continue;
      changed.push(destinationKey);
      if (!dryRun) {
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, next);
        await chmod(destination, mode);
      }
    }
  }

  if (changed.length === 0) {
    console.log(`No managed skill changes for upstream ${commit}.`);
    return 0;
  }
  console.log(`${dryRun ? "Would update" : "Updated"} ${changed.length} managed files:`);
  for (const path of changed) console.log(`- ${path}`);
  if (!dryRun) {
    await writeFile(
      lockPath,
      `${JSON.stringify({ ...lock, commit }, null, 2)}\n`,
    );
  }
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.mode || (args.source !== null && !args.source)) {
    console.error("Usage: sync-upstream.mjs --check [--source DIR]");
    console.error("       sync-upstream.mjs --apply [--dry-run] [--source DIR]");
    return 64;
  }
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const source = await sourceRepository(lock, args.source);
  try {
    const commit = git(["rev-parse", "HEAD"], source.path);
    console.log(`pinned=${lock.commit}`);
    console.log(`latest=${commit}`);
    if (commit === lock.commit) {
      console.log("Upstream is already pinned at the latest checked revision.");
      return 0;
    }
    if (args.mode === "check") return 10;
    return await applyUpdate(lock, source.path, commit, args.dryRun);
  } finally {
    if (source.cleanup) await rm(source.cleanup, { recursive: true, force: true });
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
