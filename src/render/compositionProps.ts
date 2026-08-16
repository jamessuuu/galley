// The props assembler (docs/SPEC.md verification plan: "props assembler
// (data -> composition props) snapshot-tested"). Pure and I/O-free: takes
// the already-fetched output of the three data sources (src/data/git.ts,
// src/data/github.ts, src/data/facts.ts) plus a resolved brand
// (src/brand/brandConfig.ts) and maps them onto the EXACT shape the
// Remotion composition (src/render/composition/ReleaseCard.tsx) reads.
//
// Every value that can be missing carries its own honest availability flag
// and, when present, the exact source label docs/SPEC.md's beat 3 names
// ("from git" / "from CI artifact" / "from GitHub release") — this is
// where death condition D3 ("any rendered number whose provenance the
// video cannot name") gets enforced in code, not just in the template.

import type { GitCommit, GitRangeData } from "../data/git.js";
import type { Facts } from "../data/facts.js";
import type { ReleaseInfo } from "../data/github.js";
import type { ResolvedBrand } from "../brand/brandConfig.js";

export type DateBeat =
  | { available: true; dateIso: string; source: "from GitHub release" | "from git tag" }
  | { available: false; reason: string };

export type TestsFact =
  | { available: true; passed: number; total: number; source: "from CI artifact" }
  | { available: false; reason: string };

export interface FilesChangedFact {
  filesChanged: number;
  insertions: number;
  deletions: number;
  source: "from git";
}

export interface CustomFactView {
  label: string;
  value: string | number;
  source: string;
}

export type ClosingCta =
  | { cta: string; source: "from git remote" }
  | { cta: string; source: "from git" };

/** The exact prop shape the Remotion composition (ReleaseCard) reads. A type
 * alias (not an interface) on purpose: Remotion's <Composition> generic
 * constrains Props to `Record<string, unknown>`, and only object-literal
 * type aliases pick up the implicit index signature that satisfies that. */
export type ReleaseCardProps = {
  reducedMotion: boolean;
  brand: {
    name: string;
    accent: string;
    ink: string;
    paper: string;
    font: string;
    logoSvgMarkup: string | null;
  };
  repoName: string;
  version: string;
  dateBeat: DateBeat;
  commitsBeat: {
    totalCommits: number;
    authorCount: number;
    authorNames: string[];
    sampledMessages: string[];
  };
  factsBeat: {
    testsFact: TestsFact;
    filesChangedFact: FilesChangedFact;
    customFacts: CustomFactView[];
  };
  closingBeat: ClosingCta;
};

export interface AssembleCompositionPropsInput {
  repoDisplayName: string;
  git: GitRangeData;
  release: ReleaseInfo;
  facts: Facts | null;
  brand: ResolvedBrand;
  /** e.g. "https://github.com/owner/repo", or null if no GitHub remote resolves. */
  githubUrl: string | null;
  reducedMotion: boolean;
  /** Beat 2 samples at most this many commit subjects for display. Default 5. */
  maxSampledMessages?: number;
  /** Beat 3 shows at most this many custom facts, per docs/SPEC.md ("up to 2"). Default 2. */
  maxCustomFacts?: number;
}

const DEFAULT_MAX_SAMPLED_MESSAGES = 5;
const DEFAULT_MAX_CUSTOM_FACTS = 2;

function toDateBeat(release: ReleaseInfo): DateBeat {
  if (release.source === "github-release") {
    return { available: true, dateIso: release.publishedAt, source: "from GitHub release" };
  }
  if (release.source === "git-tag") {
    return { available: true, dateIso: release.date, source: "from git tag" };
  }
  return { available: false, reason: release.reason };
}

function toTestsFact(facts: Facts | null): TestsFact {
  if (!facts) {
    return { available: false, reason: "no facts.json provided" };
  }
  return {
    available: true,
    passed: facts.tests_passed,
    total: facts.tests_total,
    source: "from CI artifact",
  };
}

/** Evenly-spaced sample of commit subjects, oldest-to-newest order preserved
 * (git.ts already returns commits in chronological order). Returns all of
 * them if there are fewer than `max`. */
export function sampleCommitMessages(commits: GitCommit[], max: number): string[] {
  if (commits.length <= max) return commits.map((c) => c.subject);
  if (max <= 1) {
    const first = commits[0];
    return first ? [first.subject] : [];
  }
  const step = (commits.length - 1) / (max - 1);
  const indices = new Set<number>();
  for (let i = 0; i < max; i++) {
    indices.add(Math.round(i * step));
  }
  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => commits[i])
    .filter((c): c is GitCommit => c !== undefined)
    .map((c) => c.subject);
}

function toClosingCta(githubUrl: string | null, toRef: string): ClosingCta {
  if (githubUrl) {
    return { cta: githubUrl, source: "from git remote" };
  }
  return { cta: `git checkout ${toRef}`, source: "from git" };
}

/** Maps the three data sources + resolved brand onto ReleaseCardProps. Pure
 * (no I/O), so it's cheap to snapshot-test against fixture data without
 * touching disk, network, or a real git repo. */
export function assembleCompositionProps(
  input: AssembleCompositionPropsInput
): ReleaseCardProps {
  const maxSampledMessages = input.maxSampledMessages ?? DEFAULT_MAX_SAMPLED_MESSAGES;
  const maxCustomFacts = input.maxCustomFacts ?? DEFAULT_MAX_CUSTOM_FACTS;

  return {
    reducedMotion: input.reducedMotion,
    brand: {
      name: input.brand.name,
      accent: input.brand.accent,
      ink: input.brand.ink,
      paper: input.brand.paper,
      font: input.brand.font,
      logoSvgMarkup: input.brand.logoSvgMarkup ?? null,
    },
    repoName: input.repoDisplayName,
    version: input.git.toRef,
    dateBeat: toDateBeat(input.release),
    commitsBeat: {
      totalCommits: input.git.commits.length,
      authorCount: input.git.authors.length,
      authorNames: input.git.authors.map((a) => a.name),
      sampledMessages: sampleCommitMessages(input.git.commits, maxSampledMessages),
    },
    factsBeat: {
      testsFact: toTestsFact(input.facts),
      filesChangedFact: {
        filesChanged: input.git.stats.filesChanged,
        insertions: input.git.stats.insertions,
        deletions: input.git.stats.deletions,
        source: "from git",
      },
      customFacts: (input.facts?.custom ?? []).slice(0, maxCustomFacts),
    },
    closingBeat: toClosingCta(input.githubUrl, input.git.toRef),
  };
}
