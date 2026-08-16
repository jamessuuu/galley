// Burned-in caption line, one per beat (docs/SPEC.md: "Burned-in caption
// line per beat (sound-off-first; there is no audio track in v1 — silence
// is honest...)"). Always visible immediately (no per-beat entrance
// animation) so the video reads correctly even scrubbed with sound off.

import React from "react";
import { captionStyle } from "../theme.js";

export function CaptionLine({
  text,
  ink,
}: {
  text: string;
  ink: string;
}): React.ReactElement {
  return <div style={{ ...captionStyle, color: ink }}>{text}</div>;
}
