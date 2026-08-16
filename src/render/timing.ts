// Shared timing constants for the "release card" composition (docs/SPEC.md
// §"The template"). One source of truth so the composition, the props
// assembler, and the render pipeline never disagree about frame counts.

export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;

/** Per-beat duration in frames. Beat order matches docs/SPEC.md exactly. */
export const BEAT_DURATIONS = {
  title: 5 * FPS, // Beat 1 — title card
  commits: 15 * FPS, // Beat 2 — commit flow
  facts: 10 * FPS, // Beat 3 — facts count-up
  closing: 6 * FPS, // Beat 4 — closing card
} as const;

export type BeatName = keyof typeof BEAT_DURATIONS;

export const TOTAL_DURATION_IN_FRAMES = (
  Object.values(BEAT_DURATIONS) as number[]
).reduce((sum, frames) => sum + frames, 0);

// 36s at 30fps — inside docs/SPEC.md's 30-45s default range.
export const TOTAL_DURATION_SECONDS = TOTAL_DURATION_IN_FRAMES / FPS;
