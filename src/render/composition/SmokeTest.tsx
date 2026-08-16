// A tiny, deliberately separate composition used ONLY by the render
// pipeline's e2e test (docs/SPEC.md verification plan: "e2e: ONE real
// render of a 3-5s test composition asserting the mp4 exists and
// probe-reported duration matches (±0.5s)"). Never shipped to end users —
// ReleaseCard (the one v1 template, death condition D2) is the only
// composition the CLI's `render`/`poster` commands ever select. This one
// exists purely so the render pipeline's mechanics (bundle -> select ->
// renderMedia -> probe) can be proven fast, without paying for a full
// 36s/720p ReleaseCard render on every test run.

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export function SmokeTest(): React.ReactElement {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1A1712",
        color: "#FAF7F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        fontFamily: "monospace",
      }}
    >
      frame {frame}
    </AbsoluteFill>
  );
}
