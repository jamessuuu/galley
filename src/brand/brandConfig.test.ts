// docs/SPEC.md §"Brand config": "Colors validated for >=4.5:1 title
// contrast at load — fail loudly with the computed ratio." M3 salvaged
// this module from an untracked working-tree file with zero test
// coverage; M5 ("contrast validation") is where that coverage lands.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BrandConfigError,
  BrandContrastError,
  DEFAULT_BRAND,
  assertTitleContrast,
  contrastRatio,
  loadBrandConfig,
} from "./brandConfig.js";

describe("contrastRatio", () => {
  it("returns 21:1 for pure black on pure white (the WCAG maximum)", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("is symmetric — order of the two colors doesn't matter", () => {
    expect(contrastRatio("#1A1712", "#FAF7F2")).toBeCloseTo(
      contrastRatio("#FAF7F2", "#1A1712"),
      5
    );
  });

  it("returns 1:1 for two identical colors", () => {
    expect(contrastRatio("#808080", "#808080")).toBeCloseTo(1, 5);
  });
});

describe("assertTitleContrast", () => {
  it("passes for the house palette (ink on paper) and returns the real ratio", () => {
    const ratio = assertTitleContrast(DEFAULT_BRAND.ink, DEFAULT_BRAND.paper);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("throws BrandContrastError naming the computed ratio for two close grays", () => {
    let caught: unknown;
    try {
      assertTitleContrast("#999999", "#8a8a8a");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BrandContrastError);
    const err = caught as InstanceType<typeof BrandContrastError>;
    expect(err.ratio).toBeLessThan(4.5);
    expect(err.message).toContain(err.ratio.toFixed(2));
    expect(err.message).toContain("#999999");
    expect(err.message).toContain("#8a8a8a");
  });

  it("does not throw right at the 4.5:1 boundary or above", () => {
    // #767676 on #FFFFFF is the textbook ~4.54:1 WCAG AA boundary pair.
    expect(() => assertTitleContrast("#767676", "#FFFFFF")).not.toThrow();
  });
});

describe("loadBrandConfig (default, no configPath)", () => {
  let originalCwd: string;
  let elsewhere: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    elsewhere = mkdtempSync(join(tmpdir(), "galley-cwd-independence-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(elsewhere, { recursive: true, force: true });
  });

  it("resolves DEFAULT_BRAND's logo from galley's OWN package root, not process.cwd()", () => {
    // Regression test: a real user runs `galley render` from their OWN
    // project's directory, never from inside galley's package folder.
    // Resolving DEFAULT_BRAND.logoSvgPath against process.cwd() instead of
    // galley's install location broke exactly this case (docs/DEVIATIONS.md, M5).
    process.chdir(elsewhere);
    const brand = loadBrandConfig();
    expect(brand.name).toBe(DEFAULT_BRAND.name);
    expect(brand.logoSvgMarkup).toBeDefined();
    expect(brand.logoSvgMarkup).toContain("<svg");
  });

  it("computes and returns the real contrast ratio for the house palette", () => {
    const brand = loadBrandConfig();
    expect(brand.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(brand.contrastRatio).toBeCloseTo(
      contrastRatio(DEFAULT_BRAND.ink, DEFAULT_BRAND.paper),
      5
    );
  });
});

describe("loadBrandConfig (custom brand.json)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "galley-brand-config-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeBrandJson(content: unknown): string {
    const path = join(dir, "brand.json");
    writeFileSync(path, JSON.stringify(content));
    return path;
  }

  it("loads a valid custom brand and resolves its logo relative to the CONFIG FILE's directory", () => {
    writeFileSync(join(dir, "logo.svg"), "<svg><rect/></svg>");
    const path = writeBrandJson({
      name: "acme",
      accent: "#0000FF",
      ink: "#111111",
      paper: "#FFFFFF",
      logoSvgPath: "logo.svg",
      font: "Custom Sans",
    });

    const brand = loadBrandConfig(path);
    expect(brand).toMatchObject({
      name: "acme",
      accent: "#0000FF",
      ink: "#111111",
      paper: "#FFFFFF",
      font: "Custom Sans",
      logoSvgMarkup: "<svg><rect/></svg>",
    });
    expect(brand.contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("defaults font to JetBrains Mono when omitted, and logoSvgMarkup stays undefined without logoSvgPath", () => {
    const path = writeBrandJson({
      name: "acme",
      accent: "#0000FF",
      ink: "#111111",
      paper: "#FFFFFF",
    });
    const brand = loadBrandConfig(path);
    expect(brand.font).toBe("JetBrains Mono");
    expect(brand.logoSvgMarkup).toBeUndefined();
  });

  it("throws BrandConfigError naming the path when the file doesn't exist", () => {
    const missing = join(dir, "does-not-exist.json");
    expect(() => loadBrandConfig(missing)).toThrow(BrandConfigError);
    expect(() => loadBrandConfig(missing)).toThrow(/does-not-exist\.json/);
  });

  it("throws BrandConfigError for invalid JSON", () => {
    const path = join(dir, "broken.json");
    writeFileSync(path, "{ not valid json");
    expect(() => loadBrandConfig(path)).toThrow(BrandConfigError);
    expect(() => loadBrandConfig(path)).toThrow(/not valid JSON/);
  });

  it("throws BrandConfigError listing every schema violation", () => {
    const path = writeBrandJson({
      name: "",
      accent: "blue",
      ink: "#111111",
      // paper missing entirely
    });
    let caught: unknown;
    try {
      loadBrandConfig(path);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BrandConfigError);
    const message = (caught as Error).message;
    expect(message).toContain("name");
    expect(message).toContain("accent");
    expect(message).toContain("paper");
  });

  it("throws BrandConfigError naming the missing logo path (not a generic ENOENT)", () => {
    const path = writeBrandJson({
      name: "acme",
      accent: "#0000FF",
      ink: "#111111",
      paper: "#FFFFFF",
      logoSvgPath: "nope.svg",
    });
    expect(() => loadBrandConfig(path)).toThrow(BrandConfigError);
    expect(() => loadBrandConfig(path)).toThrow(/nope\.svg/);
  });

  it("throws BrandContrastError (not BrandConfigError) for a schema-valid but illegible palette", () => {
    const path = writeBrandJson({
      name: "acme",
      accent: "#0000FF",
      ink: "#999999",
      paper: "#8a8a8a",
    });
    expect(() => loadBrandConfig(path)).toThrow(BrandContrastError);
  });
});
