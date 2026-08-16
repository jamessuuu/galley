// The house default brand config (docs/SPEC.md's own default palette,
// matching showcase-program/BRAND-KIT.md's house colors), split out from
// brandConfig.ts on purpose: this file does no I/O (no node:fs/node:path),
// so it's safe to import from BOTH the Node CLI path (brandConfig.ts) and
// the browser-bundled Remotion composition path (src/render/exampleProps.ts
// -> Root.tsx). brandConfig.ts itself must never be imported by anything
// under src/render/composition/ — it reads files off disk and pulls
// node:fs into @remotion/bundler's webpack graph, which cannot resolve
// Node built-ins (see docs/DEVIATIONS.md, M3).

export interface DefaultBrandConfig {
  name: string;
  accent: string;
  ink: string;
  paper: string;
  logoSvgPath?: string;
  font?: string;
}

export const DEFAULT_BRAND: DefaultBrandConfig = {
  name: "galley",
  accent: "#B45309",
  ink: "#1A1712",
  paper: "#FAF7F2",
  logoSvgPath: "public/brand/glyph.svg",
  font: "JetBrains Mono",
};
