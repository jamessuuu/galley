// The git data source (docs/SPEC.md §"Data layer", source 1 of 3).
// Always available, no network: reads real commit history straight out of
// `git log` / `git diff --shortstat` against the target repo. Unlike the
// GitHub-release and facts.json sources, git is not optional — if the repo
// path or the refs are bad, extractGitRange throws (a CLI usage error), it
// does not degrade to a "no data" beat. There is no honest video without it.

import { execFileSync } from "node:child_process";

export interface GitAuthor {
  name: string;
  email: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: GitAuthor;
  /** ISO 8601 (strict), from git's %aI. */
  date: string;
  subject: string;
}

export interface GitRangeStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface GitRangeData {
  repoPath: string;
  fromRef: string;
  toRef: string;
  fromSha: string;
  toSha: string;
  /** Chronological, oldest first. */
  commits: GitCommit[];
  /** Unique, in order of first appearance within the range. */
  authors: GitAuthor[];
  stats: GitRangeStats;
}

export class GitExtractionError extends Error {
  constructor(
    message: string,
    readonly repoPath: string,
    override readonly cause?: unknown
  ) {
    super(message);
    this.name = "GitExtractionError";
  }
}

const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

function runGit(repoPath: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr?: unknown }).stderr ?? "").trim()
        : "";
    throw new GitExtractionError(
      `git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`,
      repoPath,
      err
    );
  }
}

/** Throws GitExtractionError if `repoPath` is not (inside) a git work tree. */
export function assertGitRepo(repoPath: string): void {
  const out = runGit(repoPath, ["rev-parse", "--is-inside-work-tree"]).trim();
  if (out !== "true") {
    throw new GitExtractionError(
      `${repoPath} is not a git repository`,
      repoPath
    );
  }
}

/** Resolves `ref` to a full commit SHA, or throws naming the bad ref. */
export function resolveRef(repoPath: string, ref: string): string {
  try {
    return runGit(repoPath, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
  } catch (err) {
    throw new GitExtractionError(
      `ref "${ref}" does not resolve to a commit in ${repoPath}`,
      repoPath,
      err
    );
  }
}

function parseLog(raw: string): GitCommit[] {
  return raw
    .split(RECORD_SEP)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const [hash, shortHash, authorName, authorEmail, date, subject] =
        record.split(FIELD_SEP);
      if (!hash || !shortHash || !date) {
        throw new Error(`malformed git log record: ${JSON.stringify(record)}`);
      }
      return {
        hash,
        shortHash,
        author: { name: authorName ?? "", email: authorEmail ?? "" },
        date,
        subject: subject ?? "",
      };
    });
}

function parseShortstat(raw: string): GitRangeStats {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { filesChanged: 0, insertions: 0, deletions: 0 };
  }
  const filesMatch = /(\d+) files? changed/.exec(trimmed);
  const insMatch = /(\d+) insertions?\(\+\)/.exec(trimmed);
  const delMatch = /(\d+) deletions?\(-\)/.exec(trimmed);
  return {
    filesChanged: filesMatch ? Number(filesMatch[1]) : 0,
    insertions: insMatch ? Number(insMatch[1]) : 0,
    deletions: delMatch ? Number(delMatch[1]) : 0,
  };
}

function uniqueAuthors(commits: GitCommit[]): GitAuthor[] {
  const seen = new Set<string>();
  const authors: GitAuthor[] = [];
  for (const commit of commits) {
    const key = commit.author.email
      ? commit.author.email.toLowerCase()
      : commit.author.name;
    if (!seen.has(key)) {
      seen.add(key);
      authors.push(commit.author);
    }
  }
  return authors;
}

/**
 * Extracts real commit history + shortstat between two refs (exclusive of
 * `fromRef`, inclusive of `toRef` — standard `fromRef..toRef` git range
 * semantics). Throws GitExtractionError if the repo or either ref is bad.
 */
export function extractGitRange(
  repoPath: string,
  fromRef: string,
  toRef: string
): GitRangeData {
  assertGitRepo(repoPath);
  const fromSha = resolveRef(repoPath, fromRef);
  const toSha = resolveRef(repoPath, toRef);

  const format = `--format=%H${FIELD_SEP}%h${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%aI${FIELD_SEP}%s${RECORD_SEP}`;
  const logRaw = runGit(repoPath, [
    "log",
    "--reverse",
    format,
    `${fromSha}..${toSha}`,
  ]);
  const commits = parseLog(logRaw);

  const shortstatRaw = runGit(repoPath, [
    "diff",
    "--shortstat",
    fromSha,
    toSha,
  ]);
  const stats = parseShortstat(shortstatRaw);

  return {
    repoPath,
    fromRef,
    toRef,
    fromSha,
    toSha,
    commits,
    authors: uniqueAuthors(commits),
    stats,
  };
}
