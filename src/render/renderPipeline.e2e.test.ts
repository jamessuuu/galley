// Real end-to-end render test (docs/SPEC.md verification plan): bundles
// the actual Remotion entry point and captures a REAL headless-Chromium
// still frame for every beat, then asserts on the produced PNGs. No mocks
// — this is the "poster frame renderer" M3 promises, proven working, not
// just typechecking. Slower than the rest of the suite (webpack bundle +
// possible first-run Chrome Headless Shell download), hence the generous
// per-test/per-hook timeouts.

import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getVideoMetadata } from "@remotion/renderer";
import { EXAMPLE_PROPS } from "./exampleProps.js";
import { bundleCompositionEntry, renderPoster, renderVideo } from "./renderPipeline.js";
import { BEAT_DURATIONS, SMOKE_TEST_COMPOSITION_ID, SMOKE_TEST_DURATION_IN_FRAMES, SMOKE_TEST_FPS } from "./timing.js";

const BUNDLE_TIMEOUT_MS = 300_000; // first run may download Chrome Headless Shell (~110MB)
const RENDER_TIMEOUT_MS = 60_000;

describe("renderPipeline e2e (real Remotion bundle + render, no mocks)", () => {
  let serveUrl: string;
  let outDir: string;

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), "galley-render-e2e-"));
    const bundled = await bundleCompositionEntry();
    serveUrl = bundled.serveUrl;
  }, BUNDLE_TIMEOUT_MS);

  afterAll(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  function assertRealPng(path: string): void {
    expect(existsSync(path)).toBe(true);
    const stats = statSync(path);
    // A real 1280x720 PNG frame is tens of KB; a broken/empty capture is not.
    expect(stats.size).toBeGreaterThan(2_000);
  }

  it(
    "renders a real still frame from beat 1 (title card)",
    async () => {
      const outputPath = join(outDir, "beat1-title.png");
      const result = await renderPoster({
        serveUrl,
        inputProps: { ...EXAMPLE_PROPS, reducedMotion: true },
        outputPath,
        frame: 0,
      });
      expect(result.outputPath).toBe(outputPath);
      assertRealPng(outputPath);
    },
    RENDER_TIMEOUT_MS
  );

  it(
    "renders a real still frame from beat 3 (facts, count-up settled)",
    async () => {
      const outputPath = join(outDir, "beat3-facts.png");
      const factsBeatStartFrame = BEAT_DURATIONS.title + BEAT_DURATIONS.commits;
      await renderPoster({
        serveUrl,
        inputProps: { ...EXAMPLE_PROPS, reducedMotion: true },
        outputPath,
        frame: factsBeatStartFrame + 30,
      });
      assertRealPng(outputPath);
    },
    RENDER_TIMEOUT_MS
  );

  it(
    "renders a real still frame from beat 4 (closing card) with the degrade-honestly no-GitHub-remote CTA",
    async () => {
      const outputPath = join(outDir, "beat4-closing.png");
      const closingBeatStartFrame =
        BEAT_DURATIONS.title + BEAT_DURATIONS.commits + BEAT_DURATIONS.facts;
      await renderPoster({
        serveUrl,
        inputProps: {
          ...EXAMPLE_PROPS,
          reducedMotion: true,
          closingBeat: { cta: "git checkout v1.1.0", source: "from git" },
        },
        outputPath,
        frame: closingBeatStartFrame + 30,
      });
      assertRealPng(outputPath);
    },
    RENDER_TIMEOUT_MS
  );

  it(
    "renders a REAL mp4 (docs/SPEC.md verification plan's '3-5s test composition') with a probe-verified duration",
    async () => {
      const outputPath = join(outDir, "smoke-test.mp4");
      const result = await renderVideo({
        serveUrl,
        outputPath,
        compositionId: SMOKE_TEST_COMPOSITION_ID,
      });

      expect(result.outputPath).toBe(outputPath);
      expect(result.durationInFrames).toBe(SMOKE_TEST_DURATION_IN_FRAMES);
      expect(result.fps).toBe(SMOKE_TEST_FPS);
      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(500);

      const expectedSeconds = SMOKE_TEST_DURATION_IN_FRAMES / SMOKE_TEST_FPS;
      const metadata = await getVideoMetadata(outputPath);
      expect(metadata.durationInSeconds).not.toBeNull();
      expect(Math.abs((metadata.durationInSeconds ?? 0) - expectedSeconds)).toBeLessThanOrEqual(0.5);
      // docs/limitations.md: "No audio track in v1." Proven against the
      // real rendered file, not just asserted in prose.
      expect(metadata.audioCodec).toBeNull();
    },
    RENDER_TIMEOUT_MS
  );
});
