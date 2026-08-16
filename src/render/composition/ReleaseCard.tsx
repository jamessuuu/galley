// The "release card" composition (docs/SPEC.md §"The template"): the ONE
// v1 template, parametrized entirely by brand.json + the assembled props —
// a second layout is a v2 decision (death condition D2), never a runtime
// flag inside this file.

import React from "react";
import { Series } from "remotion";
import type { ReleaseCardProps } from "../compositionProps.js";
import { BEAT_DURATIONS } from "../timing.js";
import "../fonts.js"; // side-effecting: registers the bundled font, see fonts.ts
import { TitleCard } from "./TitleCard.js";
import { CommitFlow } from "./CommitFlow.js";
import { FactsBeat } from "./FactsBeat.js";
import { ClosingCard } from "./ClosingCard.js";

export function ReleaseCard(props: ReleaseCardProps): React.ReactElement {
  const { reducedMotion } = props;
  return (
    <Series>
      <Series.Sequence durationInFrames={BEAT_DURATIONS.title}>
        <TitleCard
          repoName={props.repoName}
          version={props.version}
          dateBeat={props.dateBeat}
          brand={props.brand}
          reducedMotion={reducedMotion}
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT_DURATIONS.commits}>
        <CommitFlow
          commitsBeat={props.commitsBeat}
          brand={props.brand}
          reducedMotion={reducedMotion}
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT_DURATIONS.facts}>
        <FactsBeat
          factsBeat={props.factsBeat}
          brand={props.brand}
          reducedMotion={reducedMotion}
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT_DURATIONS.closing}>
        <ClosingCard
          repoName={props.repoName}
          closingBeat={props.closingBeat}
          brand={props.brand}
          reducedMotion={reducedMotion}
        />
      </Series.Sequence>
    </Series>
  );
}
