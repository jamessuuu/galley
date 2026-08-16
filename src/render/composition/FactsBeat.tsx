// Beat 3 — facts (docs/SPEC.md): count-up of tests passed + files changed
// (+ up to 2 custom facts), EACH with its own source label. This is the
// beat death condition D3 is really about: nothing here renders without a
// named source, including the honest "no data" case.

import type { CSSProperties } from "react";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { ReleaseCardProps } from "../compositionProps.js";
import { countUp, motionProgress } from "../motion.js";
import { containerStyle, eyebrowStyle } from "../theme.js";
import { SourceLabel } from "./SourceLabel.js";
import { CaptionLine } from "./CaptionLine.js";

const tileStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 260,
};

const tileValueStyle: CSSProperties = {
  fontSize: 64,
  fontWeight: 700,
  lineHeight: 1,
};

function StatTile({
  value,
  label,
  sourceText,
  accent,
  ink,
}: {
  value: string;
  label: string;
  sourceText: string;
  accent: string;
  ink: string;
}): React.ReactElement {
  return (
    <div style={tileStyle}>
      <div style={tileValueStyle}>{value}</div>
      <div style={{ fontSize: 22, opacity: 0.75 }}>{label}</div>
      <SourceLabel text={sourceText} accent={accent} ink={ink} />
    </div>
  );
}

export function FactsBeat({
  factsBeat,
  brand,
  reducedMotion,
}: Pick<ReleaseCardProps, "factsBeat" | "brand" | "reducedMotion">): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerProgress = motionProgress({ frame, fps, reducedMotion, durationInFrames: 20 });
  const countProgress = motionProgress({
    frame,
    fps,
    reducedMotion,
    delay: 12,
    durationInFrames: 60,
  });

  const { testsFact, filesChangedFact, customFacts } = factsBeat;

  const testsTile =
    testsFact.available === true ? (
      <StatTile
        value={`${countUp(countProgress, testsFact.passed)}/${testsFact.total}`}
        label="tests passed"
        sourceText={testsFact.source}
        accent={brand.accent}
        ink={brand.ink}
      />
    ) : (
      <div style={tileStyle}>
        <div style={{ ...tileValueStyle, fontSize: 32, opacity: 0.6 }}>no data</div>
        <div style={{ fontSize: 22, opacity: 0.75 }}>tests passed</div>
        <SourceLabel text={testsFact.reason} accent={brand.accent} ink={brand.ink} />
      </div>
    );

  const filesTile = (
    <StatTile
      value={String(countUp(countProgress, filesChangedFact.filesChanged))}
      label={`files changed (+${filesChangedFact.insertions}/-${filesChangedFact.deletions})`}
      sourceText={filesChangedFact.source}
      accent={brand.accent}
      ink={brand.ink}
    />
  );

  const customTiles = customFacts.map((fact, i) => {
    const display =
      typeof fact.value === "number" ? String(countUp(countProgress, fact.value)) : fact.value;
    return (
      <StatTile
        key={i}
        value={display}
        label={fact.label}
        sourceText={fact.source}
        accent={brand.accent}
        ink={brand.ink}
      />
    );
  });

  return (
    <div style={containerStyle(brand)}>
      <p style={{ ...eyebrowStyle, opacity: headerProgress * 0.6 }}>The real numbers</p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "56px 72px",
          marginTop: 32,
        }}
      >
        {testsTile}
        {filesTile}
        {customTiles}
      </div>
      <CaptionLine
        text="every number above is labeled with where it came from"
        ink={brand.ink}
      />
    </div>
  );
}
