// Shared animation helpers, all gated on `reducedMotion`. docs/SPEC.md:
// "Reduced-motion variant: static cards, same data" — every beat calls
// through here rather than `spring()`/`interpolate()` directly, so the
// reduced-motion behavior (jump straight to the settled end state) lives in
// exactly one place instead of being reimplemented per beat.

import { interpolate, spring } from "remotion";

export interface MotionInput {
  frame: number;
  fps: number;
  reducedMotion: boolean;
  delay?: number;
  durationInFrames?: number;
}

/** 0..1 progress. Reduced motion always returns 1 (fully settled, no animation). */
export function motionProgress({
  frame,
  fps,
  reducedMotion,
  delay,
  durationInFrames,
}: MotionInput): number {
  if (reducedMotion) return 1;
  return spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    ...(delay !== undefined ? { delay } : {}),
    ...(durationInFrames !== undefined ? { durationInFrames } : {}),
  });
}

/** Rounds a 0..1 progress value up to `value`, clamped — used for count-up facts. */
export function countUp(progress: number, value: number): number {
  return Math.round(
    interpolate(progress, [0, 1], [0, value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
}
