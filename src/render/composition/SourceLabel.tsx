// The provenance tag every rendered number/claim carries (docs/SPEC.md
// death condition D3: "any rendered number whose provenance the video
// cannot name" is a build failure). One component so every beat renders
// source labels identically.

import type { CSSProperties } from "react";
import React from "react";

export function SourceLabel({
  text,
  accent,
  ink,
}: {
  text: string;
  accent: string;
  ink: string;
}): React.ReactElement {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.7,
    color: ink,
  };
  return (
    <span style={style}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: accent,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {text}
    </span>
  );
}
