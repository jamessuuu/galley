// Beat 4 — closing card (docs/SPEC.md): install command or URL from
// config. No install command is fabricated (galley has no package-registry
// data source) — see docs/DEVIATIONS.md for the exact interpretation: the
// CTA is the repo's real GitHub URL when one resolves ("from git remote"),
// else a real, runnable `git checkout <ref>` for the exact range rendered
// ("from git"). Never invented copy.

import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReleaseCardProps } from "../compositionProps.js";
import { motionProgress } from "../motion.js";
import { accentRuleStyle, containerStyle, eyebrowStyle, headlineStyle } from "../theme.js";
import { SourceLabel } from "./SourceLabel.js";
import { CaptionLine } from "./CaptionLine.js";

export function ClosingCard({
  repoName,
  closingBeat,
  brand,
  reducedMotion,
}: Pick<ReleaseCardProps, "repoName" | "closingBeat" | "brand" | "reducedMotion">): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = motionProgress({ frame, fps, reducedMotion, durationInFrames: 24 });
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <div style={containerStyle(brand)}>
      <div style={{ opacity }}>
        <p style={eyebrowStyle}>Get it</p>
        <h1 style={{ ...headlineStyle, fontSize: 52, wordBreak: "break-word" }}>
          {closingBeat.cta}
        </h1>
        <div style={accentRuleStyle(brand.accent, 14)} />
        <div style={{ marginTop: 28 }}>
          <SourceLabel text={closingBeat.source} accent={brand.accent} ink={brand.ink} />
        </div>
      </div>
      <CaptionLine
        text={`${repoName} — rendered by galley, every number sourced, none typed by hand`}
        ink={brand.ink}
      />
    </div>
  );
}
