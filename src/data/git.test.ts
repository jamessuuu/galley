import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import {
  GitExtractionError,
  assertGitRepo,
  extractGitRange,
  resolveRef,
} from "./git.js";
import { ensureFixtureRepo } from "../testing/fixture.js";
import {
  FIXTURE_AUTHORS_IN_RANGE,
  FIXTURE_COMMITS_IN_RANGE,
  FIXTURE_RANGE,
} from "../testing/fixturePlan.js";

let repoPath: string;

beforeAll(() => {
  repoPath = ensureFixtureRepo();
});

describe("assertGitRepo", () => {
  it("passes for the fixture repo", () => {
    expect(() => assertGitRepo(repoPath)).not.toThrow();
  });

  it("throws GitExtractionError for a non-repo directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "galley-not-a-repo-"));
    try {
      expect(() => assertGitRepo(dir)).toThrow(GitExtractionError);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("resolveRef", () => {
  it("resolves a real tag to a full 40-char SHA", () => {
    const sha = resolveRef(repoPath, "v1.0.0");
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("throws GitExtractionError naming the bad ref", () => {
    expect(() => resolveRef(repoPath, "not-a-real-ref")).toThrow(
      /not-a-real-ref/
    );
  });
});

describe("extractGitRange against the committed fixture repo", () => {
  it("returns exactly the commits the fixture plan put in this range", () => {
    const data = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);

    expect(data.commits).toHaveLength(FIXTURE_COMMITS_IN_RANGE.length);
    expect(data.commits.map((c) => c.subject)).toEqual(
      FIXTURE_COMMITS_IN_RANGE.map((c) => c.message)
    );
    // chronological (oldest first), matching the plan's own order
    expect(data.commits[0]?.subject).toBe(FIXTURE_COMMITS_IN_RANGE[0]?.message);
    expect(data.commits.at(-1)?.subject).toBe(
      FIXTURE_COMMITS_IN_RANGE.at(-1)?.message
    );
  });

  it("resolves fromSha/toSha to real commit SHAs", () => {
    const data = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    expect(data.fromSha).toMatch(/^[0-9a-f]{40}$/);
    expect(data.toSha).toMatch(/^[0-9a-f]{40}$/);
    expect(data.fromSha).not.toBe(data.toSha);
  });

  it("dedupes authors in first-appearance order", () => {
    const data = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    expect(data.authors.map((a) => a.name)).toEqual(
      FIXTURE_AUTHORS_IN_RANGE.map((a) => a.name)
    );
    expect(data.authors.map((a) => a.email)).toEqual(
      FIXTURE_AUTHORS_IN_RANGE.map((a) => a.email)
    );
  });

  it("attaches a real name+email+ISO date to every commit", () => {
    const data = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    for (const commit of data.commits) {
      expect(commit.hash).toMatch(/^[0-9a-f]{40}$/);
      expect(commit.shortHash.length).toBeGreaterThan(0);
      expect(commit.author.name.length).toBeGreaterThan(0);
      expect(commit.author.email).toContain("@");
      expect(commit.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it("matches a raw `git diff --shortstat` invocation (cross-check, not self-check)", () => {
    const data = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);

    const raw = execFileSync(
      "git",
      ["-C", repoPath, "diff", "--shortstat", FIXTURE_RANGE.from, FIXTURE_RANGE.to],
      { encoding: "utf8" }
    );
    const filesMatch = /(\d+) files? changed/.exec(raw);
    const insMatch = /(\d+) insertions?\(\+\)/.exec(raw);
    const delMatch = /(\d+) deletions?\(-\)/.exec(raw);

    expect(data.stats.filesChanged).toBe(filesMatch ? Number(filesMatch[1]) : 0);
    expect(data.stats.insertions).toBe(insMatch ? Number(insMatch[1]) : 0);
    expect(data.stats.deletions).toBe(delMatch ? Number(delMatch[1]) : 0);
    // sanity: the fixture plan touches 3 files in this range (cli.js twice,
    // utils.js, package.json — 3 distinct paths) and only adds/edits lines,
    // never removes a file, so both counts should be positive.
    expect(data.stats.filesChanged).toBe(3);
    expect(data.stats.insertions).toBeGreaterThan(0);
  });

  it("handles an empty range (from === to) honestly, not as an error", () => {
    const data = extractGitRange(repoPath, "v1.1.0", "v1.1.0");
    expect(data.commits).toEqual([]);
    expect(data.authors).toEqual([]);
    expect(data.stats).toEqual({ filesChanged: 0, insertions: 0, deletions: 0 });
  });
});

describe("extractGitRange error handling", () => {
  it("throws GitExtractionError for a non-existent repo path", () => {
    expect(() =>
      extractGitRange(join(repoPath, "does-not-exist"), "v1.0.0", "v1.1.0")
    ).toThrow(GitExtractionError);
  });

  it("throws naming the specific bad ref, not a generic failure", () => {
    expect(() => extractGitRange(repoPath, "nope-not-real", "v1.1.0")).toThrow(
      /nope-not-real/
    );
  });
});
