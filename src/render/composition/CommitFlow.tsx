// Beat 2 — commit flow (docs/SPEC.md): animated timeline ticks from real
// commits (sampled messages, author count).

import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReleaseCardProps } from "../compositionProps.js";
import { motionProgress } from "../motion.js";
import { containerStyle, eyebrowStyle, headlineStyle, subheadStyle } from "../theme.js";
import { SourceLabel } from "./SourceLabel.js";
import { CaptionLine } from "./CaptionLine.js";

// Ticks are a decorative representation of commit volume, capped so a
// large range doesn't turn into an unreadable wall of marks. The printed
// number (headline + caption) is always the real, uncapped total.
const MAX_VISUAL_TICKS = 48;

export function CommitFlow({
  commitsBeat,
  brand,
  reducedMotion,
}: Pick<ReleaseCardProps, "commitsBeat" | "brand" | "reducedMotion">): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = motionProgress({ frame, fps, reducedMotion, durationInFrames: 24 });
  const headerOpacity = interpolate(enter, [0, 1], [0, 1]);

  const tickCount = Math.min(commitsBeat.totalCommits, MAX_VISUAL_TICKS);
  const ticksProgress = motionProgress({
    frame,
    fps,
    reducedMotion,
    delay: 12,
    durationInFrames: Math.max(1, durationInFrames - 60),
  });
  const visibleTicks = reducedMotion
    ? tickCount
    : Math.round(interpolate(ticksProgress, [0, 1], [0, tickCount], { extrapolateRight: "clamp" }));

  const messages = commitsBeat.sampledMessages;
  const messageRevealSpan = Math.max(1, durationInFrames - 90);

  return (
    <div style={containerStyle(brand)}>
      <div style={{ opacity: headerOpacity }}>
        <p style={eyebrowStyle}>Commit flow</p>
        <h1 style={headlineStyle}>{commitsBeat.totalCommits} commits</h1>
        <p style={subheadStyle}>
          from {commitsBeat.authorCount} contributor
          {commitsBeat.authorCount === 1 ? "" : "s"}
          {commitsBeat.authorNames.length > 0
            ? ` — ${commitsBeat.authorNames.join(", ")}`
            : ""}
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 40, flexWrap: "wrap" }}>
        {Array.from({ length: tickCount }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 40,
              backgroundColor: i < visibleTicks ? brand.accent : `${brand.ink}22`,
              transition: "none",
            }}
          />
        ))}
        {commitsBeat.totalCommits > MAX_VISUAL_TICKS ? (
          <div
            style={{
              alignSelf: "center",
              marginLeft: 8,
              fontSize: 20,
              opacity: 0.6,
            }}
          >
            +{commitsBeat.totalCommits - MAX_VISUAL_TICKS} more
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((msg, i) => {
          const revealAt = (i / Math.max(1, messages.length)) * messageRevealSpan + 20;
          const msgProgress = reducedMotion
            ? 1
            : interpolate(frame, [revealAt, revealAt + 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
          return (
            <div
              key={i}
              style={{
                opacity: msgProgress,
                transform: `translateX(${(1 - msgProgress) * 16}px)`,
                fontSize: 26,
                fontWeight: 500,
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                minWidth: 0, // required for the ellipsis span below to shrink inside a flex row
              }}
            >
              <span style={{ color: brand.accent, flexShrink: 0 }}>{"›"}</span>
              {/* Real commit subjects have no length limit, and a wrapped
                  second line pushes the caption/source label off the
                  bottom of the frame (found dogfooding against dogwatch's
                  real history, docs/DEVIATIONS.md M6). Single-line clamp
                  with an ellipsis keeps every beat's layout fixed-height
                  regardless of what a real repo's commit messages say. */}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {msg}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <SourceLabel text="from git" accent={brand.accent} ink={brand.ink} />
      </div>
      <CaptionLine
        text={`${commitsBeat.totalCommits} commits, ${commitsBeat.authorCount} contributor(s) — from git`}
        ink={brand.ink}
      />
    </div>
  );
}
