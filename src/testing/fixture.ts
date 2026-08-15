// Materializes the committed fixture bundle (fixtures/sample-repo.bundle)
// into a real working repo at fixtures/sample-repo/ on demand. That
// directory is gitignored and rebuilt from the bundle rather than committed
// directly — see scripts/build-fixture-repo.mjs for why.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// src/testing -> repo root is two levels up.
const REPO_ROOT = join(here, "..", "..");

export const FIXTURE_REPO_PATH = join(REPO_ROOT, "fixtures", "sample-repo");
export const FIXTURE_BUNDLE_PATH = join(
  REPO_ROOT,
  "fixtures",
  "sample-repo.bundle"
);

/**
 * Ensures fixtures/sample-repo/ exists as a real git working tree, cloned
 * from the committed bundle if it isn't there yet. Idempotent — safe to
 * call at the top of every test file that needs the fixture repo.
 */
export function ensureFixtureRepo(): string {
  if (existsSync(join(FIXTURE_REPO_PATH, ".git"))) {
    return FIXTURE_REPO_PATH;
  }
  if (!existsSync(FIXTURE_BUNDLE_PATH)) {
    throw new Error(
      `galley fixture: ${FIXTURE_BUNDLE_PATH} is missing. Run \`npm run fixture:build\` first.`
    );
  }
  mkdirSync(dirname(FIXTURE_REPO_PATH), { recursive: true });
  execFileSync("git", ["clone", "--quiet", FIXTURE_BUNDLE_PATH, FIXTURE_REPO_PATH], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  return FIXTURE_REPO_PATH;
}
