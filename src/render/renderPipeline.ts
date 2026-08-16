// The local render pipeline (docs/SPEC.md §"CLI surface": "Local rendering
// via @remotion/bundler + @remotion/renderer. No cloud, no keys."). M3
// wires the bundle step + the poster (still-frame) renderer; the CLI
// `render`/`poster` commands and the full video renderer (renderMedia) are
// wired in M4 alongside the real committed example render.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { ReleaseCardProps } from "./compositionProps.js";

// Resolves to <repoRoot>/src/render/index.ts regardless of whether THIS
// module is currently running from src/ (tsx, tests) or dist/ (the built
// CLI) — both sit at the same depth under the repo root, and
// @remotion/bundler always wants the TS/TSX SOURCE entry point (its
// webpack config compiles it itself; there is nothing to gain, and real
// risk of drift, from pointing it at tsc's own dist output instead).
const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, "..", "..");
export const COMPOSITION_ENTRY_POINT = join(REPO_ROOT, "src", "render", "index.ts");
export const COMPOSITION_ID = "ReleaseCard";

export interface BundledComposition {
  serveUrl: string;
}

/**
 * Bundles the Remotion entry point via @remotion/bundler (webpack under the
 * hood). Takes real wall-clock time (seconds) — callers rendering both a
 * poster and a video in the same CLI invocation should bundle once and
 * reuse the serveUrl for both, rather than bundling per-artifact.
 */
export async function bundleCompositionEntry(): Promise<BundledComposition> {
  const serveUrl = await bundle({
    entryPoint: COMPOSITION_ENTRY_POINT,
    onProgress: () => {
      // Intentionally silent by default; the CLI (M4) wires its own
      // progress reporting through this option.
    },
    // tsconfig.json uses moduleResolution: NodeNext, so every relative
    // import under src/render/ is written with an explicit `.js`
    // extension (correct for tsc's own dist output) even though the real
    // file on disk is `.ts`/`.tsx`. Webpack's default resolver doesn't
    // know that mapping, so without this override every such import
    // fails to resolve inside Remotion's bundle. Standard fix for this
    // exact NodeNext-imports + Remotion-bundler combination.
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          ...config.resolve?.extensionAlias,
          ".js": [".js", ".ts", ".tsx"],
        },
      },
    }),
  });
  return { serveUrl };
}

export interface RenderPosterOptions {
  serveUrl: string;
  inputProps: ReleaseCardProps;
  outputPath: string;
  /**
   * Frame to capture, default 0. The poster is meaningful at frame 0 only
   * when the caller passes `reducedMotion: true` in inputProps — that's
   * what makes frame 0 of beat 1 the fully-settled title card instead of
   * a mid-entrance-animation frame. galley's CLI (M4) always forces this.
   */
  frame?: number;
}

export interface RenderPosterResult {
  outputPath: string;
}

/** Renders ONE real still frame (a real headless-Chromium capture, not a
 * mock) of the ReleaseCard composition to a PNG file. */
export async function renderPoster({
  serveUrl,
  inputProps,
  outputPath,
  frame = 0,
}: RenderPosterOptions): Promise<RenderPosterResult> {
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
  });

  await renderStill({
    composition,
    serveUrl,
    output: outputPath,
    frame,
    inputProps,
    imageFormat: "png",
  });

  return { outputPath };
}
