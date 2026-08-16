// Shared style tokens for the "release card" composition, derived from the
// brand slice of ReleaseCardProps (never hardcoded — a repo's own
// brand.json fully controls these colors per docs/SPEC.md's brand config).

import type { CSSProperties } from "react";
import type { ReleaseCardProps } from "./compositionProps.js";
import { FONT_FAMILY } from "./fonts.js";

export function containerStyle(brand: ReleaseCardProps["brand"]): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    backgroundColor: brand.paper,
    color: brand.ink,
    fontFamily: brand.font || FONT_FAMILY,
    padding: "72px 96px",
    boxSizing: "border-box",
  };
}

export const eyebrowStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: 4,
  textTransform: "uppercase",
  opacity: 0.6,
  margin: 0,
};

export const headlineStyle: CSSProperties = {
  fontSize: 76,
  fontWeight: 700,
  margin: "12px 0 0",
  lineHeight: 1.05,
  letterSpacing: -1,
};

export const subheadStyle: CSSProperties = {
  fontSize: 30,
  fontWeight: 500,
  margin: "20px 0 0",
  opacity: 0.85,
};

export function accentRuleStyle(accent: string, widthPct: number): CSSProperties {
  return {
    height: 8,
    width: `${widthPct}%`,
    backgroundColor: accent,
    marginTop: 32,
  };
}

export const captionStyle: CSSProperties = {
  position: "absolute",
  bottom: 48,
  left: 96,
  right: 96,
  fontSize: 22,
  fontWeight: 500,
  opacity: 0.65,
};
