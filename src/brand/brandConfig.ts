// brand.json (docs/SPEC.md §"Brand config"): { name, accent, ink, paper,
// logoSvgPath?, font? }. Describes the TARGET project's identity to paint
// into the rendered video — not necessarily galley's own. Colors are
// validated for >=4.5:1 title contrast "at load" (i.e. here, before any
// rendering starts) and fail loudly with the computed ratio, per spec.

import { readFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { DEFAULT_BRAND } from "./defaultBrand.js";

export { DEFAULT_BRAND };

// DEFAULT_BRAND.logoSvgPath ("public/brand/glyph.svg") ships INSIDE
// galley's own package (package.json's `files` includes "public"), not
// inside whatever repo the CLI is pointed at — so when no --brand is
// given, it must resolve relative to galley's OWN install location, never
// process.cwd(). A real user runs `galley render` from their own project's
// directory, not from inside galley's package folder; resolving against
// cwd there would throw "brand logo not found" every time. Same
// src-and-dist-sit-at-equal-depth trick as renderPipeline.ts's REPO_ROOT.
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex color, e.g. #1A1712");

export const BrandConfigSchema = z.object({
  name: z.string().min(1),
  accent: hexColor,
  ink: hexColor,
  paper: hexColor,
  logoSvgPath: z.string().optional(),
  font: z.string().optional(),
});

export type BrandConfigInput = z.infer<typeof BrandConfigSchema>;

/** Fully resolved brand: the validated config plus the logo's actual SVG markup (if any). */
export interface ResolvedBrand {
  name: string;
  accent: string;
  ink: string;
  paper: string;
  font: string;
  /** Raw <svg>...</svg> markup, read from logoSvgPath at load time. Undefined if no logo configured. */
  logoSvgMarkup?: string;
  /** Computed via assertTitleContrast at load. */
  contrastRatio: number;
}

export class BrandConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrandConfigError";
  }
}

export class BrandContrastError extends Error {
  constructor(
    message: string,
    readonly ratio: number
  ) {
    super(message);
    this.name = "BrandContrastError";
  }
}

function srgbChannelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [rl, gl, bl] = [r, g, b].map(srgbChannelToLinear);
  return 0.2126 * (rl ?? 0) + 0.7152 * (gl ?? 0) + 0.0722 * (bl ?? 0);
}

/** WCAG 2.x relative-luminance contrast ratio between two hex colors, range [1, 21]. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

const MIN_TITLE_CONTRAST = 4.5;

/** Throws BrandContrastError (naming the computed ratio) if ink-on-paper falls under 4.5:1. */
export function assertTitleContrast(ink: string, paper: string): number {
  const ratio = contrastRatio(ink, paper);
  if (ratio < MIN_TITLE_CONTRAST) {
    throw new BrandContrastError(
      `brand contrast is ${ratio.toFixed(2)}:1 (ink=${ink} on paper=${paper}), ` +
        `below the ${MIN_TITLE_CONTRAST}:1 minimum for title text`,
      ratio
    );
  }
  return ratio;
}

/**
 * Loads, schema-validates, and resolves a brand config. `configPath` is
 * resolved relative to the current working directory; `logoSvgPath` inside
 * the config is resolved relative to the CONFIG FILE's own directory (so a
 * brand.json can live inside any target repo and point at that repo's own
 * assets) — or relative to cwd when using DEFAULT_BRAND with no config file.
 * Fails loudly (BrandConfigError / BrandContrastError) rather than
 * rendering with a broken or illegible brand.
 */
export function loadBrandConfig(configPath?: string): ResolvedBrand {
  let raw: unknown;
  let baseDir: string;

  if (configPath) {
    const absPath = isAbsolute(configPath) ? configPath : resolve(configPath);
    if (!existsSync(absPath)) {
      throw new BrandConfigError(`brand config not found at ${absPath}`);
    }
    try {
      raw = JSON.parse(readFileSync(absPath, "utf8"));
    } catch (err) {
      throw new BrandConfigError(
        `brand config at ${absPath} is not valid JSON: ${(err as Error).message}`
      );
    }
    baseDir = dirname(absPath);
  } else {
    raw = DEFAULT_BRAND;
    baseDir = PACKAGE_ROOT;
  }

  const result = BrandConfigSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new BrandConfigError(`brand config failed validation:\n${details}`);
  }
  const config = result.data;

  let logoSvgMarkup: string | undefined;
  if (config.logoSvgPath) {
    const logoAbsPath = isAbsolute(config.logoSvgPath)
      ? config.logoSvgPath
      : resolve(baseDir, config.logoSvgPath);
    if (!existsSync(logoAbsPath)) {
      throw new BrandConfigError(
        `brand logo not found at ${logoAbsPath} (from logoSvgPath: ${config.logoSvgPath})`
      );
    }
    logoSvgMarkup = readFileSync(logoAbsPath, "utf8");
  }

  const ratio = assertTitleContrast(config.ink, config.paper);

  return {
    name: config.name,
    accent: config.accent,
    ink: config.ink,
    paper: config.paper,
    font: config.font ?? "JetBrains Mono",
    contrastRatio: ratio,
    ...(logoSvgMarkup !== undefined ? { logoSvgMarkup } : {}),
  };
}
