import { beforeAll, describe, expect, it } from "vitest";

import { extractGitRange } from "../data/git.js";
import type { ReleaseInfo } from "../data/github.js";
import type { Facts } from "../data/facts.js";
import type { ResolvedBrand } from "../brand/brandConfig.js";
import { ensureFixtureRepo } from "../testing/fixture.js";
import { FIXTURE_RANGE } from "../testing/fixturePlan.js";
import {
  assembleCompositionProps,
  sampleCommitMessages,
} from "./compositionProps.js";

const BRAND: ResolvedBrand = {
  name: "galley",
  accent: "#B45309",
  ink: "#1A1712",
  paper: "#FAF7F2",
  font: "JetBrains Mono",
  contrastRatio: 15.86,
};

const GITHUB_RELEASE: ReleaseInfo = {
  source: "github-release",
  title: "v1.1.0",
  tag: "v1.1.0",
  publishedAt: "2024-03-10T09:00:00Z",
  notesExcerpt: "Bump to 1.1.0.",
  url: "https://github.com/jamessuuu/sample-repo/releases/tag/v1.1.0",
};

const GIT_TAG_RELEASE: ReleaseInfo = {
  source: "git-tag",
  tag: "v1.1.0",
  date: "2024-03-10T09:00:00+00:00",
};

const NO_RELEASE: ReleaseInfo = {
  source: "none",
  reason: 'no GitHub release and no git tag named "v1.1.0"',
};

const FACTS: Facts = {
  tests_passed: 42,
  tests_total: 44,
  coverage_pct: 91.5,
  custom: [
    { label: "bundle size", value: "84kb", source: "from CI artifact" },
    { label: "cold start", value: "310ms", source: "from CI artifact" },
    { label: "extra fact (should be dropped)", value: 1, source: "from CI artifact" },
  ],
};

let repoPath: string;

beforeAll(() => {
  repoPath = ensureFixtureRepo();
});

describe("assembleCompositionProps against the fixture repo", () => {
  it("assembles full props when every source is available (snapshot)", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props).toMatchSnapshot();
  });

  it("degrades the date beat to git-tag source honestly", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GIT_TAG_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.dateBeat).toEqual({
      available: true,
      dateIso: "2024-03-10T09:00:00+00:00",
      source: "from git tag",
    });
  });

  it("degrades the date beat to an explicit no-data reason when there's no release or tag", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: NO_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.dateBeat).toEqual({
      available: false,
      reason: 'no GitHub release and no git tag named "v1.1.0"',
    });
  });

  it("degrades the tests fact to an explicit no-data reason when facts.json is absent (D3)", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: null,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.factsBeat.testsFact).toEqual({
      available: false,
      reason: "no facts.json provided",
    });
    // filesChanged is git-sourced and always available, unaffected by facts.json's absence.
    expect(props.factsBeat.filesChangedFact.source).toBe("from git");
    expect(props.factsBeat.customFacts).toEqual([]);
  });

  it("caps custom facts at 2 per docs/SPEC.md ('up to 2 custom facts')", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.factsBeat.customFacts).toHaveLength(2);
    expect(props.factsBeat.customFacts.map((f) => f.label)).toEqual([
      "bundle size",
      "cold start",
    ]);
  });

  it("closing CTA prefers the GitHub remote URL, labeled 'from git remote'", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.closingBeat).toEqual({
      cta: "https://github.com/jamessuuu/sample-repo",
      source: "from git remote",
    });
  });

  it("closing CTA degrades to a real git command honestly when there's no GitHub remote", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: null,
      reducedMotion: false,
    });
    expect(props.closingBeat).toEqual({
      cta: `git checkout ${FIXTURE_RANGE.to}`,
      source: "from git",
    });
  });

  it("echoes reducedMotion back verbatim without altering the data", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const withMotion = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    const reduced = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: true,
    });
    expect(withMotion.reducedMotion).toBe(false);
    expect(reduced.reducedMotion).toBe(true);
    const { reducedMotion: _a, ...withoutMotionA } = withMotion;
    const { reducedMotion: _b, ...withoutMotionB } = reduced;
    expect(withoutMotionA).toEqual(withoutMotionB);
  });

  it("normalizes a missing brand logo to null (not undefined) for the composition", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: BRAND,
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.brand.logoSvgMarkup).toBeNull();
  });

  it("carries a real logo's markup through when the brand has one", () => {
    const git = extractGitRange(repoPath, FIXTURE_RANGE.from, FIXTURE_RANGE.to);
    const props = assembleCompositionProps({
      repoDisplayName: "sample-repo",
      git,
      release: GITHUB_RELEASE,
      facts: FACTS,
      brand: { ...BRAND, logoSvgMarkup: "<svg><circle/></svg>" },
      githubUrl: "https://github.com/jamessuuu/sample-repo",
      reducedMotion: false,
    });
    expect(props.brand.logoSvgMarkup).toBe("<svg><circle/></svg>");
  });
});

describe("sampleCommitMessages", () => {
  const commit = (subject: string) => ({
    hash: "x".repeat(40),
    shortHash: "xxxxxxx",
    author: { name: "a", email: "a@example.com" },
    date: "2024-01-01T00:00:00+00:00",
    subject,
  });

  it("returns every message when there are fewer commits than the max", () => {
    const commits = [commit("a"), commit("b"), commit("c")];
    expect(sampleCommitMessages(commits, 5)).toEqual(["a", "b", "c"]);
  });

  it("returns exactly max messages, evenly spaced, including first and last", () => {
    const commits = Array.from({ length: 20 }, (_, i) => commit(`commit ${i}`));
    const sampled = sampleCommitMessages(commits, 5);
    expect(sampled).toHaveLength(5);
    expect(sampled[0]).toBe("commit 0");
    expect(sampled.at(-1)).toBe("commit 19");
  });

  it("handles max=1 by returning just the first message", () => {
    const commits = [commit("a"), commit("b")];
    expect(sampleCommitMessages(commits, 1)).toEqual(["a"]);
  });

  it("handles zero commits", () => {
    expect(sampleCommitMessages([], 5)).toEqual([]);
  });
});
