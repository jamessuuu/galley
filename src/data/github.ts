// The GitHub release-metadata data source (docs/SPEC.md §"Data layer",
// source 2 of 3). Optional, requires network: shells out to `gh api
// repos/{owner}/{repo}/releases` (REST v3). The exact response shape was
// verified once against the live API in M2 (fixtures/github-releases-sample.json,
// recorded from `gh api repos/cli/cli/releases`) and is schema-validated
// here with zod so an unexpected shape degrades honestly instead of
// crashing or reading undefined fields.
//
// Unlike facts.json, an unreachable/empty/malformed GitHub response is NOT
// a hard error — it degrades to git tag metadata, and if there's no tag
// either, to an explicit "none" result the composition renders as a
// no-data beat (docs/SPEC.md death condition D3).

import { execFileSync } from "node:child_process";
import { z } from "zod";

const GitHubReleaseSchema = z.object({
  id: z.number(),
  tag_name: z.string(),
  name: z.string().nullable(),
  target_commitish: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  html_url: z.string(),
  body: z.string().nullable(),
  author: z.object({
    login: z.string(),
    id: z.number(),
    type: z.string(),
  }),
});

const GitHubReleasesResponseSchema = z.array(GitHubReleaseSchema);

export type GitHubRelease = z.infer<typeof GitHubReleaseSchema>;

export type ReleaseInfo =
  | {
      source: "github-release";
      title: string;
      tag: string;
      publishedAt: string;
      notesExcerpt: string;
      url: string;
    }
  | {
      source: "git-tag";
      tag: string;
      date: string;
    }
  | {
      source: "none";
      reason: string;
    };

/** Pure parser for a git remote URL's owner/repo — no shelling out, easy to unit test. */
export function parseGitHubRemoteUrl(
  url: string
): { owner: string; repo: string } | null {
  const match = /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/.exec(
    url.trim()
  );
  if (!match || !match[1] || !match[2]) return null;
  return { owner: match[1], repo: match[2] };
}

/** Reads the repo's `origin` remote and extracts an owner/repo, or null if there isn't one. */
export function deriveRepoSlug(
  repoPath: string
): { owner: string; repo: string } | null {
  let url: string;
  try {
    url = execFileSync("git", ["-C", repoPath, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
  return parseGitHubRemoteUrl(url);
}

function excerpt(body: string | null, maxLen: number): string {
  if (!body) return "";
  const firstParagraph = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)[0]
    ?.replace(/^#+\s*/, "")
    .trim();
  const text = firstParagraph ?? "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

/** Fetches the raw releases array via `gh api`, schema-validated. Returns null on any failure. */
function fetchReleases(owner: string, repo: string): GitHubRelease[] | null {
  let raw: string;
  try {
    raw = execFileSync("gh", ["api", `repos/${owner}/${repo}/releases`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
    });
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = GitHubReleasesResponseSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Looks up `ref` as a real git tag and returns its creation date, or null if it isn't one. */
function tagDate(repoPath: string, ref: string): string | null {
  try {
    const out = execFileSync(
      "git",
      [
        "-C",
        repoPath,
        "for-each-ref",
        "--format=%(creatordate:iso-strict)",
        `refs/tags/${ref}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Pure: finds the release matching `tag` in an already-fetched releases
 * array and maps it to a ReleaseInfo. No I/O — exported so the mapping
 * logic can be unit-tested directly against the recorded fixture
 * (fixtures/github-releases-sample.json) without a live network call.
 */
export function releaseInfoForTag(
  releases: GitHubRelease[],
  tag: string
): ReleaseInfo | undefined {
  const match = releases.find((r) => r.tag_name === tag);
  if (!match) return undefined;
  return {
    source: "github-release",
    title: match.name && match.name.trim().length > 0 ? match.name : match.tag_name,
    tag: match.tag_name,
    publishedAt: match.published_at ?? match.created_at,
    notesExcerpt: excerpt(match.body, 220),
    url: match.html_url,
  };
}

/** Schema-validates an already-parsed GitHub API releases response. Exported for fixture tests. */
export function parseGitHubReleasesResponse(raw: unknown): GitHubRelease[] {
  return GitHubReleasesResponseSchema.parse(raw);
}

/**
 * Resolves release metadata for `toRef`: a real GitHub release if one
 * exists and matches, else the ref's own git tag date, else an explicit
 * "none" with a named reason. Never throws — this source is optional.
 */
export function resolveReleaseInfo(repoPath: string, toRef: string): ReleaseInfo {
  const slug = deriveRepoSlug(repoPath);

  if (slug) {
    const releases = fetchReleases(slug.owner, slug.repo);
    if (releases) {
      const info = releaseInfoForTag(releases, toRef);
      if (info) return info;
    }
  }

  const date = tagDate(repoPath, toRef);
  if (date) {
    return { source: "git-tag", tag: toRef, date };
  }

  const reason = slug
    ? `no GitHub release and no git tag named "${toRef}"`
    : `no GitHub remote configured, and no git tag named "${toRef}"`;
  return { source: "none", reason };
}
