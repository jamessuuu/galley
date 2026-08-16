// The local render pipeline (docs/SPEC.md §"CLI surface": "Local rendering
// via @remotion/bundler + @remotion/renderer. No cloud, no keys."). M3
// wired the bundle step + the poster (still-frame) renderer; M4 adds the
// full video renderer (renderMedia), wired to the CLI's `render`/`poster`
// commands in src/cli/renderCommand.ts.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
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
  /** Defaults to ReleaseCard's own defaultProps (src/render/exampleProps.ts) if omitted. */
  inputProps?: ReleaseCardProps | Record<string, unknown>;
  outputPath: string;
  /**
   * Frame to capture, default 0. The poster is meaningful at frame 0 only
   * when the caller passes `reducedMotion: true` in inputProps — that's
   * what makes frame 0 of beat 1 the fully-settled title card instead of
   * a mid-entrance-animation frame. galley's CLI always forces this.
   */
  frame?: number;
  /** Which registered composition to render. Defaults to "ReleaseCard" — the CLI never overrides this; only the render-pipeline e2e test does (SmokeTest). */
  compositionId?: string;
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
  compositionId = COMPOSITION_ID,
}: RenderPosterOptions): Promise<RenderPosterResult> {
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    ...(inputProps ? { inputProps } : {}),
  });

  await renderStill({
    composition,
    serveUrl,
    output: outputPath,
    frame,
    imageFormat: "png",
    ...(inputProps ? { inputProps } : {}),
  });

  return { outputPath };
}

// docs/SPEC.md §"CLI surface": "Render timeout enforced (default 10 min)
// with an honest error."
export const DEFAULT_RENDER_TIMEOUT_MS = 10 * 60 * 1000;

export class RenderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderTimeoutError";
  }
}

export interface RenderVideoProgress {
  renderedFrames: number;
  totalFrames: number;
}

export interface RenderVideoOptions {
  serveUrl: string;
  /** Defaults to the composition's own defaultProps if omitted. */
  inputProps?: ReleaseCardProps | Record<string, unknown>;
  outputPath: string;
  /** Wall-clock budget for the WHOLE render (bundle already done). Default 10 min per docs/SPEC.md. */
  timeoutMs?: number;
  onProgress?: (progress: RenderVideoProgress) => void;
  /** Which registered composition to render. Defaults to "ReleaseCard" — only the render-pipeline e2e test overrides this (SmokeTest). */
  compositionId?: string;
}

export interface RenderVideoResult {
  outputPath: string;
  durationInFrames: number;
  fps: number;
}

/**
 * Renders a REAL H.264 mp4 (a real headless-Chromium capture + ffmpeg
 * encode, not a mock) of the ReleaseCard composition. Enforces a hard
 * wall-clock timeout: races the render against a timer that both cancels
 * the in-flight render (via Remotion's cancelSignal, so the browser/ffmpeg
 * work actually stops) and rejects with a named, honest RenderTimeoutError
 * — Remotion's own `timeoutInMilliseconds` option governs per-frame
 * delayRender waits, not total render wall-clock time, so it can't do this
 * job by itself.
 */
export async function renderVideo({
  serveUrl,
  inputProps,
  outputPath,
  timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
  onProgress,
  compositionId = COMPOSITION_ID,
}: RenderVideoOptions): Promise<RenderVideoResult> {
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    ...(inputProps ? { inputProps } : {}),
  });

  const { cancelSignal, cancel } = makeCancelSignal();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      cancel();
      reject(
        new RenderTimeoutError(
          `render of ${composition.durationInFrames} frames did not finish within ${(
            timeoutMs / 60_000
          ).toFixed(1)} min and was aborted — pass a longer timeout or check machine load`
        )
      );
    }, timeoutMs);
  });

  const renderPromise = renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    cancelSignal,
    // docs/SPEC.md: "there is no audio track in v1 — silence is honest, a
    // music bed is v2." The composition never renders an <Audio>/<Video>
    // component, but Remotion still muxes a (silent) AAC track into the
    // mp4 container by default — muted:true suppresses that track
    // entirely so the shipped file matches the written claim literally,
    // not just in practice.
    muted: true,
    ...(inputProps ? { inputProps } : {}),
    ...(onProgress
      ? {
          onProgress: (p: { renderedFrames: number }) =>
            onProgress({
              renderedFrames: p.renderedFrames,
              totalFrames: composition.durationInFrames,
            }),
        }
      : {}),
  });

  try {
    await Promise.race([renderPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }

  return {
    outputPath,
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
  };
}
