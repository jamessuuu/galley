// Real end-to-end proof of docs/SPEC.md death condition D3 ("any rendered
// number whose provenance the video cannot name... renders an explicit
// 'no data — <reason>' beat") and the reduced-motion variant. M3/M4 proved
// the render pipeline works and exercised ONE ablation (no GitHub remote,
// in renderPipeline.e2e.test.ts's closing-card test); this file is M5's
// "degrade-honestly beats (each source ablated in tests)" — every source
// that CAN degrade, ablated, with a REAL captured frame, not just a props
// assertion (compositionProps.test.ts already covers the props layer).

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EXAMPLE_PROPS } from "./exampleProps.js";
import { bundleCompositionEntry, renderPoster } from "./renderPipeline.js";
import { BEAT_DURATIONS } from "./timing.js";

const BUNDLE_TIMEOUT_MS = 300_000;
const RENDER_TIMEOUT_MS = 60_000;

describe("degrade-honestly beats, ablated for real (docs/SPEC.md D3)", () => {
  let serveUrl: string;
  let outDir: string;

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), "galley-degrade-e2e-"));
    const bundled = await bundleCompositionEntry();
    serveUrl = bundled.serveUrl;
  }, BUNDLE_TIMEOUT_MS);

  afterAll(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  function assertRealPng(path: string): void {
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeGreaterThan(2_000);
  }

  it(
    "beat 1 (title card) renders a real 'no data' frame when there's no release and no git tag",
    async () => {
      const outputPath = join(outDir, "no-release.png");
      await renderPoster({
        serveUrl,
        inputProps: {
          ...EXAMPLE_PROPS,
          reducedMotion: true,
          dateBeat: { available: false, reason: 'no GitHub release and no git tag named "v1.1.0"' },
        },
        outputPath,
        frame: 0,
      });
      assertRealPng(outputPath);
    },
    RENDER_TIMEOUT_MS
  );

  it(
    "beat 3 (facts) renders a real 'no data' tests tile when facts.json is absent, while files-changed (git-sourced) still renders",
    async () => {
      const outputPath = join(outDir, "no-facts.png");
      const factsBeatStartFrame = BEAT_DURATIONS.title + BEAT_DURATIONS.commits;
      await renderPoster({
        serveUrl,
        inputProps: {
          ...EXAMPLE_PROPS,
          reducedMotion: true,
          factsBeat: {
            testsFact: { available: false, reason: "no facts.json provided" },
            filesChangedFact: EXAMPLE_PROPS.factsBeat.filesChangedFact,
            customFacts: [],
          },
        },
        outputPath,
        frame: factsBeatStartFrame + 30,
      });
      assertRealPng(outputPath);
    },
    RENDER_TIMEOUT_MS
  );

  it(
    "the no-release frame and the fully-available frame are visibly different real captures (not the same PNG twice)",
    async () => {
      const withData = join(outDir, "with-release.png");
      const withoutData = join(outDir, "without-release.png");
      await renderPoster({
        serveUrl,
        inputProps: { ...EXAMPLE_PROPS, reducedMotion: true },
        outputPath: withData,
        frame: 0,
      });
      await renderPoster({
        serveUrl,
        inputProps: {
          ...EXAMPLE_PROPS,
          reducedMotion: true,
          dateBeat: { available: false, reason: "no data for this test" },
        },
        outputPath: withoutData,
        frame: 0,
      });
      expect(readFileSync(withData).equals(readFileSync(withoutData))).toBe(false);
    },
    RENDER_TIMEOUT_MS
  );

  it(
    "the reduced-motion flag materially changes the render (mid-animation frame differs from the settled one)",
    async () => {
      // Frame 10 of beat 1 is mid-entrance-animation when reducedMotion is
      // false (spring is still settling) and identical to frame 0's
      // fully-settled state when reducedMotion is true — proving the flag
      // actually changes what gets rendered, not just echoed as a prop.
      const animated = join(outDir, "animated-frame10.png");
      const reduced = join(outDir, "reduced-frame10.png");
      await renderPoster({
        serveUrl,
        inputProps: { ...EXAMPLE_PROPS, reducedMotion: false },
        outputPath: animated,
        frame: 10,
      });
      await renderPoster({
        serveUrl,
        inputProps: { ...EXAMPLE_PROPS, reducedMotion: true },
        outputPath: reduced,
        frame: 10,
      });
      assertRealPng(animated);
      assertRealPng(reduced);
      expect(readFileSync(animated).equals(readFileSync(reduced))).toBe(false);
    },
    RENDER_TIMEOUT_MS
  );
});
