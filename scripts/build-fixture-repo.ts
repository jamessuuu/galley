#!/usr/bin/env -S npx tsx
/**
 * Builds the deterministic fixture repo from src/testing/fixturePlan.ts,
 * then bundles it to fixtures/sample-repo.bundle — which is what actually
 * gets committed to galley's own repo (docs/SPEC.md M1: "fixtures/sample-repo/
 * built by a script, deterministic history").
 *
 * A real nested .git directory can't be committed cleanly inside another
 * git repo (git treats it as an embedded repo / gitlink and silently stops
 * tracking its contents), so the working tree at fixtures/sample-repo/ is
 * gitignored and rebuilt on demand — from the bundle (`git clone` a bundle
 * file works exactly like cloning a remote) rather than from this script,
 * so tests don't depend on network or on this script's own correctness.
 *
 * Usage: npm run fixture:build
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURE_COMMITS } from "../src/testing/fixturePlan.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const FIXTURES_DIR = join(REPO_ROOT, "fixtures");
const SAMPLE_REPO_DIR = join(FIXTURES_DIR, "sample-repo");
const BUNDLE_PATH = join(FIXTURES_DIR, "sample-repo.bundle");

function git(args: string[], extraEnv?: Record<string, string>): string {
  return execFileSync("git", args, {
    cwd: SAMPLE_REPO_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  });
}

function main(): void {
  if (existsSync(SAMPLE_REPO_DIR)) {
    rmSync(SAMPLE_REPO_DIR, { recursive: true, force: true });
  }
  mkdirSync(SAMPLE_REPO_DIR, { recursive: true });

  execFileSync(
    "git",
    ["init", "--quiet", "--initial-branch=main", SAMPLE_REPO_DIR],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  // Local-only fallback identity. Every commit below sets explicit
  // GIT_AUTHOR_*/GIT_COMMITTER_* env vars, but a couple of git plumbing
  // paths still want *some* user.* config present.
  git(["config", "user.name", "galley-fixture-builder"]);
  git(["config", "user.email", "fixture-builder@galley.dev"]);
  git(["config", "commit.gpgsign", "false"]);

  for (const commit of FIXTURE_COMMITS) {
    for (const file of commit.files) {
      const filePath = join(SAMPLE_REPO_DIR, file.path);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, file.content);
    }
    git(["add", "-A"]);
    git(["commit", "--quiet", "-m", commit.message], {
      GIT_AUTHOR_NAME: commit.author.name,
      GIT_AUTHOR_EMAIL: commit.author.email,
      GIT_AUTHOR_DATE: commit.date,
      GIT_COMMITTER_NAME: commit.author.name,
      GIT_COMMITTER_EMAIL: commit.author.email,
      GIT_COMMITTER_DATE: commit.date,
    });
    if (commit.tag) {
      git(["tag", commit.tag]);
    }
  }

  if (existsSync(BUNDLE_PATH)) {
    rmSync(BUNDLE_PATH);
  }
  execFileSync("git", ["bundle", "create", BUNDLE_PATH, "--all"], {
    cwd: SAMPLE_REPO_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });
  execFileSync("git", ["bundle", "verify", BUNDLE_PATH], {
    cwd: SAMPLE_REPO_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  console.log(
    `fixture: built ${FIXTURE_COMMITS.length} commits in ${SAMPLE_REPO_DIR}`
  );
  console.log(`fixture: bundled + verified at ${BUNDLE_PATH}`);
}

main();
