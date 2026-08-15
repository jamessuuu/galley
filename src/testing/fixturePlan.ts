// The single source of truth for galley's committed fixture repo
// (fixtures/sample-repo.bundle). Both the builder (scripts/build-fixture-repo.ts)
// and the git-extractor unit tests (src/data/git.test.ts) import this file,
// so the "expected" values in tests are computed from the same plan that
// built the repo — never hand-copied numbers that can drift out of sync.
//
// Deterministic on purpose: fixed authors, fixed dates, fixed messages,
// fixed file contents. Same plan, same bytes, every run.

export interface FixtureAuthor {
  name: string;
  email: string;
}

export interface FixtureFile {
  path: string;
  content: string;
}

export interface FixtureCommit {
  author: FixtureAuthor;
  /** ISO 8601 with explicit offset — fed straight to GIT_AUTHOR_DATE. */
  date: string;
  message: string;
  files: FixtureFile[];
  tag?: string;
}

export const FIXTURE_AUTHORS = {
  ada: { name: "Ada Cline", email: "ada@example.com" } satisfies FixtureAuthor,
  nomi: { name: "Nomi Reyes", email: "nomi@example.com" } satisfies FixtureAuthor,
};

export const FIXTURE_COMMITS: FixtureCommit[] = [
  {
    author: FIXTURE_AUTHORS.ada,
    date: "2024-03-01T09:00:00+00:00",
    message: "init: project scaffold",
    files: [
      {
        path: "README.md",
        content: "# sample-repo\n\nA deterministic fixture repo for galley's tests.\n",
      },
      {
        path: "package.json",
        content: '{\n  "name": "sample-repo",\n  "version": "0.1.0"\n}\n',
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.ada,
    date: "2024-03-02T09:00:00+00:00",
    message: "feat: add core module",
    files: [
      {
        path: "src/core.js",
        content: "export function core(x) {\n  return x + 1;\n}\n",
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.nomi,
    date: "2024-03-03T09:00:00+00:00",
    message: "feat: add utils helpers",
    files: [
      {
        path: "src/utils.js",
        content:
          "export function clamp(x, lo, hi) {\n  return Math.min(hi, Math.max(lo, x));\n}\n",
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.ada,
    date: "2024-03-04T09:00:00+00:00",
    message: "test: add core tests",
    files: [
      {
        path: "test/core.test.js",
        content:
          'import { core } from "../src/core.js";\n\nif (core(1) !== 2) throw new Error("core(1) should be 2");\n',
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.ada,
    date: "2024-03-05T09:00:00+00:00",
    message: "fix: correct off-by-one in core",
    files: [
      {
        path: "src/core.js",
        content: "export function core(x) {\n  return x + 2;\n}\n",
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.nomi,
    date: "2024-03-06T09:00:00+00:00",
    message: "docs: expand README",
    files: [
      {
        path: "README.md",
        content:
          "# sample-repo\n\nA deterministic fixture repo for galley's tests.\n\n## Usage\n\nThis repo exists only to be rendered by galley's test suite.\n",
      },
    ],
    tag: "v1.0.0",
  },
  {
    author: FIXTURE_AUTHORS.ada,
    date: "2024-03-07T09:00:00+00:00",
    message: "feat: add cli entry",
    files: [
      {
        path: "src/cli.js",
        content:
          'import { core } from "./core.js";\n\nconsole.log(core(Number(process.argv[2] ?? 0)));\n',
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.nomi,
    date: "2024-03-08T09:00:00+00:00",
    message: "refactor: simplify utils",
    files: [
      {
        path: "src/utils.js",
        content:
          "export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));\n",
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.ada,
    date: "2024-03-09T09:00:00+00:00",
    message: "fix: handle empty input in cli",
    files: [
      {
        path: "src/cli.js",
        content:
          'import { core } from "./core.js";\n\nconst raw = process.argv[2];\nif (raw === undefined) {\n  console.error("usage: cli <number>");\n  process.exit(1);\n}\nconsole.log(core(Number(raw)));\n',
      },
    ],
  },
  {
    author: FIXTURE_AUTHORS.nomi,
    date: "2024-03-10T09:00:00+00:00",
    message: "chore: bump version to 1.1.0",
    files: [
      {
        path: "package.json",
        content: '{\n  "name": "sample-repo",\n  "version": "1.1.0"\n}\n',
      },
    ],
    tag: "v1.1.0",
  },
];

// Precomputed views tests can assert against directly.
export const FIXTURE_RANGE = { from: "v1.0.0", to: "v1.1.0" };
export const FIXTURE_COMMITS_IN_RANGE = FIXTURE_COMMITS.slice(6); // after v1.0.0's tag, through v1.1.0
export const FIXTURE_AUTHORS_IN_RANGE: FixtureAuthor[] = [
  FIXTURE_AUTHORS.ada,
  FIXTURE_AUTHORS.nomi,
]; // first-appearance order within the range: ada (commit 7), nomi (commit 8)
