import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  deriveRepoSlug,
  parseGitHubRemoteUrl,
  parseGitHubReleasesResponse,
  releaseInfoForTag,
  resolveReleaseInfo,
} from "./github.js";
import { ensureFixtureRepo } from "../testing/fixture.js";
import { FIXTURE_COMMITS } from "../testing/fixturePlan.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(here, "..", "..", "fixtures", "github-releases-sample.json");

/**
 * Recorded 2026-08-16 via `gh api repos/cli/cli/releases` — the live GitHub
 * releases API response shape, verified once per docs/SPEC.md M2. Public
 * release data (GitHub CLI's own releases), trimmed to drop the `assets`
 * array (irrelevant to galley, and huge). Used to unit-test the parser
 * against something real instead of a hand-typed fake, per the spec's
 * verification plan ("release-metadata parser against recorded GitHub API
 * fixtures").
 */
function loadFixtureReleases(): unknown {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

describe("parseGitHubReleasesResponse against the recorded live fixture", () => {
  it("schema-validates the real recorded API response", () => {
    const releases = parseGitHubReleasesResponse(loadFixtureReleases());
    expect(releases.length).toBe(3);
  });

  it("preserves the real fields from the recording", () => {
    const releases = parseGitHubReleasesResponse(loadFixtureReleases());
    const first = releases[0];
    expect(first?.tag_name).toBe("v2.97.0");
    expect(first?.draft).toBe(false);
    expect(first?.author.login).toBe("github-actions[bot]");
    expect(first?.html_url).toContain("github.com/cli/cli/releases/tag/v2.97.0");
  });

  it("rejects a response that doesn't match the recorded shape", () => {
    expect(() => parseGitHubReleasesResponse([{ not: "a release" }])).toThrow();
    expect(() => parseGitHubReleasesResponse({ not: "an array" })).toThrow();
  });

  it("accepts the real empty-releases shape (`[]`, a repo with no releases yet)", () => {
    // Verified live 2026-08-16 against a real no-releases repo
    // (`gh api repos/jamessuuu/dogwatch/releases` -> `[]`, not an error).
    expect(parseGitHubReleasesResponse([])).toEqual([]);
  });
});

describe("releaseInfoForTag (pure mapping, recorded fixture)", () => {
  it("maps a matching release to a github-release ReleaseInfo", () => {
    const releases = parseGitHubReleasesResponse(loadFixtureReleases());
    const info = releaseInfoForTag(releases, "v2.96.0");
    expect(info?.source).toBe("github-release");
    if (info?.source === "github-release") {
      expect(info.title).toBe("GitHub CLI 2.96.0");
      expect(info.tag).toBe("v2.96.0");
      expect(info.url).toContain("v2.96.0");
      expect(info.notesExcerpt.length).toBeGreaterThan(0);
      expect(info.notesExcerpt.length).toBeLessThanOrEqual(220);
    }
  });

  it("returns undefined when no release matches the tag", () => {
    const releases = parseGitHubReleasesResponse(loadFixtureReleases());
    expect(releaseInfoForTag(releases, "v99.99.99-does-not-exist")).toBeUndefined();
  });

  it("falls back to tag_name when name is null", () => {
    const releases = parseGitHubReleasesResponse(loadFixtureReleases());
    const withNullName = releases.map((r) => ({ ...r, name: null }));
    const info = releaseInfoForTag(withNullName, "v2.97.0");
    expect(info?.source === "github-release" && info.title).toBe("v2.97.0");
  });
});

describe("parseGitHubRemoteUrl", () => {
  it("parses an https remote with .git suffix", () => {
    expect(parseGitHubRemoteUrl("https://github.com/jamessuuu/dogwatch.git")).toEqual({
      owner: "jamessuuu",
      repo: "dogwatch",
    });
  });

  it("parses an https remote without .git suffix", () => {
    expect(parseGitHubRemoteUrl("https://github.com/jamessuuu/tiltmeter")).toEqual({
      owner: "jamessuuu",
      repo: "tiltmeter",
    });
  });

  it("parses an ssh-style remote", () => {
    expect(parseGitHubRemoteUrl("git@github.com:jamessuuu/galley.git")).toEqual({
      owner: "jamessuuu",
      repo: "galley",
    });
  });

  it("returns null for a non-GitHub remote", () => {
    expect(parseGitHubRemoteUrl("https://gitlab.com/someone/somewhere.git")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseGitHubRemoteUrl("not a url at all")).toBeNull();
  });
});

describe("deriveRepoSlug + resolveReleaseInfo against the (remote-less) fixture repo", () => {
  it("returns null — the fixture repo has no origin remote", () => {
    const repoPath = ensureFixtureRepo();
    expect(deriveRepoSlug(repoPath)).toBeNull();
  });

  it("degrades honestly to git-tag metadata when there's no GitHub remote", () => {
    const repoPath = ensureFixtureRepo();
    const info = resolveReleaseInfo(repoPath, "v1.0.0");
    expect(info.source).toBe("git-tag");
    if (info.source === "git-tag") {
      expect(info.tag).toBe("v1.0.0");
      // the tag was created right after the "docs: expand README" commit
      const taggedCommit = FIXTURE_COMMITS.find((c) => c.tag === "v1.0.0");
      expect(info.date.slice(0, 10)).toBe(taggedCommit?.date.slice(0, 10));
    }
  });

  it("degrades all the way to 'none' with a named reason for a non-tag ref", () => {
    const repoPath = ensureFixtureRepo();
    const info = resolveReleaseInfo(repoPath, "not-a-real-ref-or-tag");
    expect(info.source).toBe("none");
    if (info.source === "none") {
      expect(info.reason).toContain("not-a-real-ref-or-tag");
    }
  });
});
