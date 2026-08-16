// The Remotion root: registers the single "ReleaseCard" composition
// (docs/SPEC.md death condition D2 — one template, not an engine). Loaded
// by @remotion/bundler at bundle time via src/render/index.ts, never
// imported by the CLI's node runtime directly.

import React from "react";
import { Composition } from "remotion";
import { ReleaseCard } from "./composition/ReleaseCard.js";
import { EXAMPLE_PROPS } from "./exampleProps.js";
import { FPS, HEIGHT, TOTAL_DURATION_IN_FRAMES, WIDTH } from "./timing.js";

export function RemotionRoot(): React.ReactElement {
  return (
    <Composition
      id="ReleaseCard"
      component={ReleaseCard}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={TOTAL_DURATION_IN_FRAMES}
      defaultProps={EXAMPLE_PROPS}
    />
  );
}
