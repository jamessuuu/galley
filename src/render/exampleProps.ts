// Placeholder props for <Composition defaultProps>. Only used as the
// Remotion Studio preview default and as inputProps fallback for the
// bundle's own composition metadata — every REAL render (CLI `render`/
// `poster`, or the render pipeline in renderPipeline.ts) always passes its
// own inputProps assembled by compositionProps.ts from real data, which
// overrides this entirely. Not shipped to end users as-is.

import { DEFAULT_BRAND } from "../brand/defaultBrand.js";
import type { ReleaseCardProps } from "./compositionProps.js";

export const EXAMPLE_PROPS: ReleaseCardProps = {
  reducedMotion: false,
  brand: {
    name: DEFAULT_BRAND.name,
    accent: DEFAULT_BRAND.accent,
    ink: DEFAULT_BRAND.ink,
    paper: DEFAULT_BRAND.paper,
    font: DEFAULT_BRAND.font ?? "JetBrains Mono",
    logoSvgMarkup: null,
  },
  repoName: "sample-repo",
  version: "v1.1.0",
  dateBeat: {
    available: true,
    dateIso: "2024-03-10T09:00:00+00:00",
    source: "from git tag",
  },
  commitsBeat: {
    totalCommits: 4,
    authorCount: 2,
    authorNames: ["Ada Cline", "Nomi Reyes"],
    sampledMessages: [
      "feat: add cli entry",
      "refactor: simplify utils",
      "fix: handle empty input in cli",
      "chore: bump version to 1.1.0",
    ],
  },
  factsBeat: {
    testsFact: { available: true, passed: 12, total: 12, source: "from CI artifact" },
    filesChangedFact: { filesChanged: 3, insertions: 9, deletions: 3, source: "from git" },
    customFacts: [],
  },
  closingBeat: {
    cta: "https://github.com/jamessuuu/sample-repo",
    source: "from git remote",
  },
};
