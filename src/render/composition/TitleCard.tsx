// Beat 1 — title card (docs/SPEC.md): repo name, version, date, brand
// logo/colors.

import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReleaseCardProps } from "../compositionProps.js";
import { motionProgress } from "../motion.js";
import {
  accentRuleStyle,
  containerStyle,
  eyebrowStyle,
  headlineStyle,
  subheadStyle,
} from "../theme.js";
import { SourceLabel } from "./SourceLabel.js";
import { CaptionLine } from "./CaptionLine.js";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TitleCard({
  repoName,
  version,
  dateBeat,
  brand,
  reducedMotion,
}: Pick<ReleaseCardProps, "repoName" | "version" | "dateBeat" | "brand" | "reducedMotion">): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = motionProgress({ frame, fps, reducedMotion, durationInFrames: 24 });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const translateY = interpolate(enter, [0, 1], [24, 0]);

  const dateLine =
    dateBeat.available === true ? (
      <>
        <span>{formatDate(dateBeat.dateIso)}</span>
        {" — "}
        <SourceLabel text={dateBeat.source} accent={brand.accent} ink={brand.ink} />
      </>
    ) : (
      <SourceLabel text={`no data — ${dateBeat.reason}`} accent={brand.accent} ink={brand.ink} />
    );

  return (
    <div style={containerStyle(brand)}>
      <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
        {brand.logoSvgMarkup ? (
          <div
            // brand.json's own committed SVG (loaded by loadBrandConfig at
            // CLI startup), not arbitrary user input at render time.
            style={{ width: 64, height: 64, marginBottom: 24 }}
            dangerouslySetInnerHTML={{ __html: brand.logoSvgMarkup }}
          />
        ) : null}
        <p style={eyebrowStyle}>Release</p>
        <h1 style={headlineStyle}>{repoName}</h1>
        <p style={subheadStyle}>{version}</p>
        <div style={accentRuleStyle(brand.accent, 22)} />
        <p style={{ fontSize: 24, marginTop: 28, opacity: 0.85 }}>{dateLine}</p>
      </div>
      <CaptionLine text={`release ${version} — ${repoName}`} ink={brand.ink} />
    </div>
  );
}
