// The Remotion root: registers the single "ReleaseCard" composition
// (docs/SPEC.md death condition D2 — one template, not an engine). Loaded
// by @remotion/bundler at bundle time via src/render/index.ts, never
// imported by the CLI's node runtime directly.

import React from "react";
import { Composition } from "remotion";
import { ReleaseCard } from "./composition/ReleaseCard.js";
import { SmokeTest } from "./composition/SmokeTest.js";
import { EXAMPLE_PROPS } from "./exampleProps.js";
import {
  FPS,
  HEIGHT,
  SMOKE_TEST_COMPOSITION_ID,
  SMOKE_TEST_DURATION_IN_FRAMES,
  SMOKE_TEST_FPS,
  TOTAL_DURATION_IN_FRAMES,
  WIDTH,
} from "./timing.js";

export function RemotionRoot(): React.ReactElement {
  return (
    <>
      <Composition
        id="ReleaseCard"
        component={ReleaseCard}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={TOTAL_DURATION_IN_FRAMES}
        defaultProps={EXAMPLE_PROPS}
      />
      {/* Render-pipeline smoke test only — see SmokeTest.tsx. Never selected by the CLI. */}
      <Composition
        id={SMOKE_TEST_COMPOSITION_ID}
        component={SmokeTest}
        width={640}
        height={360}
        fps={SMOKE_TEST_FPS}
        durationInFrames={SMOKE_TEST_DURATION_IN_FRAMES}
      />
    </>
  );
}
