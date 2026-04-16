#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ALLOWED_BUMPS = new Set(["patch", "minor", "major"]);
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const detail = stderr || stdout || `Command failed: ${command} ${args.join(" ")}`;
    throw new Error(detail);
  }

  return result.stdout?.trim() ?? "";
}

function getCommitsSinceLastTag() {
  let range = "";
  try {
    const lastTag = run("git", ["describe", "--tags", "--abbrev=0"]);
    if (lastTag) {
      range = `${lastTag}..HEAD`;
    }
  } catch {
    range = "";
  }

  const args = ["log", "--format=%s%n%b%x1e"];
  if (range) {
    args.push(range);
  }

  return run("git", args)
    .split("\u001e")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function recommendBump(commits) {
  if (commits.some((commit) => /BREAKING CHANGE|^[a-z]+(?:\(.+\))?!:/m.test(commit))) {
    return "major";
  }
  if (commits.some((commit) => /^feat(?:\(.+\))?:/m.test(commit))) {
    return "minor";
  }
  return "patch";
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map((value) => Number.parseInt(value, 10));
  if ([major, minor, patch].some(Number.isNaN)) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unsupported bump type: ${bump}`);
  }
}

function ensureCleanGitTree() {
  const status = run("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error(
      "Release aborted: git working tree is not clean. Commit or stash your changes before running npm run release."
    );
  }
}

function printStep(message) {
  process.stdout.write(`${message}\n`);
}

async function chooseBump(argv, recommendedBump) {
  const explicit = argv.find((value) => ALLOWED_BUMPS.has(value));
  if (explicit) {
    return explicit;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return recommendedBump;
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `Recommended release type is "${recommendedBump}". Press Enter to accept or type patch/minor/major: `
  );
  rl.close();

  const selected = answer.trim().toLowerCase();
  if (!selected) {
    return recommendedBump;
  }
  if (!ALLOWED_BUMPS.has(selected)) {
    throw new Error(`Invalid release type: ${selected}. Use patch, minor, or major.`);
  }
  return selected;
}

async function main() {
  ensureCleanGitTree();

  const commits = getCommitsSinceLastTag();
  const recommendedBump = recommendBump(commits);
  const bump = await chooseBump(process.argv.slice(2), recommendedBump);
  const nextVersion = bumpVersion(packageJson.version, bump);

  printStep(`Preparing ${bump} release: ${packageJson.version} -> ${nextVersion}`);
  printStep("Running verification: npm test");
  run("npm", ["test"], { stdio: "inherit" });

  printStep("Running packaging check: npm run pack:dry");
  run("npm", ["run", "pack:dry"], { stdio: "inherit" });

  printStep(`Updating version with npm version ${bump}`);
  run("npm", ["version", bump, "-m", "chore(release): %s"], { stdio: "inherit" });

  printStep("");
  printStep(`Release created successfully at v${nextVersion}.`);
  printStep("Next steps:");
  printStep("  git push && git push --tags");
  printStep("  npm publish");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
