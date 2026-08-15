/**
 * Showcase-program brand generator — ONE source (showcase-program/brand/brand.mjs),
 * copied into each project repo as `scripts/brand.mjs`. This copy is galley's:
 * it carries the shared mechanism (chip mark, dot-matrix face, SVG/PNG emit)
 * verbatim, plus galley's own glyph (batch-2, not in the shared file's
 * original five-project table — added here per BRAND-KIT.md's per-project
 * glyph requirement).
 *
 * Why shared: five/ten agents each inventing the glyph language is how a
 * brand dies. The palette, grid, stroke weights and the dot-matrix face all
 * come from agentjames/scripts/branding/system.mjs (docs/DESIGN.md is the
 * binding contract). The chip mark is the maker's mark and is IDENTICAL
 * everywhere; only the project glyph differs.
 *
 * Deterministic by construction: no Math.random, no webfont, no network, no
 * date stamping. Same input, same bytes, forever — which is what lets CI
 * diff the output and fail on drift.
 *
 * Usage:  node scripts/brand.mjs --project=galley --out=<dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// docs/DESIGN.md palette. Do not invent colours.
const PAPER = "#FAF7F2";
const INK = "#1A1712";
const AMBER = "#B45309";
// RULE (#E4DDD3, the house hairline gray) is part of the shared palette but
// unused by galley's single glyph — omitted here rather than kept as dead
// code (no-placeholder discipline).

const G = 64; // every glyph is drawn on the same 64-unit grid

// ---------------------------------------------------------------------------
// 5x7 dot matrix — the house display face, generated not licensed.
// Ported from agentjames/scripts/branding/system.mjs, extended to the letters
// the five project names need.
// ---------------------------------------------------------------------------
const FONT = {
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  c: ["00000", "00000", "01111", "10000", "10000", "10000", "01111"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11100", "01000", "01000", "01000"],
  g: ["00000", "00000", "01111", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "10110", "11001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "11110", "10000", "10000"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["00100", "00100", "11111", "00100", "00100", "00101", "00010"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  w: ["00000", "00000", "10001", "10001", "10101", "10101", "01010"],
  // added for galley (batch-2): two arms converging, descender kicked left.
  y: ["00000", "00000", "10001", "10001", "01010", "00100", "01000"],
};

function word(text, x0, y0, cell, fill, gap = 1) {
  const out = [];
  let cx = x0;
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      g.forEach((row, ry) =>
        [...row].forEach((bit, rx) => {
          if (bit === "1") {
            out.push(
              `<rect x="${(cx + rx * cell).toFixed(2)}" y="${(y0 + ry * cell).toFixed(2)}" width="${cell}" height="${cell}" fill="${fill}"/>`
            );
          }
        })
      );
    }
    cx += cell * (5 + gap);
  }
  return { svg: out.join(""), end: cx - cell * gap };
}

// ---------------------------------------------------------------------------
// THE MAKER'S MARK — the agentjames chip. Identical in every repo.
// ---------------------------------------------------------------------------
function chip(ink = INK, amber = AMBER, { pins = 4, grid = G } = {}) {
  const out = [];
  const dieFrom = grid * 0.22;
  const dieSize = grid * 0.56;
  const pinLen = grid * 0.125;
  const pinW = grid * 0.047;
  const step = dieSize / (pins + 1);

  for (let i = 0; i < pins; i++) {
    const off = dieFrom + step * (i + 1) - pinW / 2;
    out.push(`<rect x="${grid * 0.09}" y="${off.toFixed(2)}" width="${pinLen}" height="${pinW}" fill="${ink}"/>`);
    out.push(`<rect x="${(grid - grid * 0.09 - pinLen).toFixed(2)}" y="${off.toFixed(2)}" width="${pinLen}" height="${pinW}" fill="${ink}"/>`);
    out.push(`<rect x="${off.toFixed(2)}" y="${grid * 0.09}" width="${pinW}" height="${pinLen}" fill="${ink}"/>`);
    out.push(`<rect x="${off.toFixed(2)}" y="${(grid - grid * 0.09 - pinLen).toFixed(2)}" width="${pinW}" height="${pinLen}" fill="${ink}"/>`);
  }
  out.push(
    `<rect x="${dieFrom}" y="${dieFrom}" width="${dieSize}" height="${dieSize}" fill="none" stroke="${ink}" stroke-width="${(grid * 0.047).toFixed(3)}"/>`
  );
  // the J: stem, turn, terminal
  out.push(
    `<path d="M${(grid * 0.59).toFixed(2)} ${(grid * 0.3265).toFixed(2)} V${(grid * 0.5559).toFixed(2)} a${(grid * 0.1231).toFixed(2)} ${(grid * 0.1231).toFixed(2)} 0 0 1 -${(grid * 0.1231).toFixed(2)} ${(grid * 0.1231).toFixed(2)} H${(grid * 0.4105).toFixed(2)}" fill="none" stroke="${ink}" stroke-width="${(grid * 0.062).toFixed(3)}" stroke-linecap="butt"/>`
  );
  // pin-1 marker, the single amber signal
  out.push(
    `<rect x="${(grid * 0.2705).toFixed(2)}" y="${(grid * 0.2705).toFixed(2)}" width="${(grid * 0.0728).toFixed(2)}" height="${(grid * 0.0728).toFixed(2)}" fill="${amber}"/>`
  );
  return out.join("");
}

// ---------------------------------------------------------------------------
// PROJECT GLYPHS — one per project, each drawn in the same language:
// ink strokes on the 64 grid, exactly ONE amber element, 0-2px radius,
// no gradients, no glow. Each concept is fixed by that project's SPEC.
// ---------------------------------------------------------------------------
const SW = (G * 0.047).toFixed(3); // standard stroke
// SWH (the hairline stroke weight) is part of the shared palette but unused
// by galley's single glyph, which has no hairline elements — omitted rather
// than kept as dead code.

const GLYPHS = {
  /**
   * galley — a galley proof: a printer's tray (open-topped frame) holding
   * composed type. Rows of set type rest in the tray as solid ink bars
   * (uneven widths, like real justified lines — not decoration, the
   * uneven-ness IS the "real composed type" idea). The bottom row is drawn
   * out past the tray's right wall: the proof pulled, in amber, the one line
   * that was actually printed. Direct read of the name's own rationale
   * (research/naming.md, showcase-program): "the first print pulled from
   * real composed type — nothing on the page that wasn't actually set."
   */
  galley: () =>
    [
      // the tray: open-topped frame, holds the composed lines
      `<path d="M10 14 V52 H54 V14" fill="none" stroke="${INK}" stroke-width="${SW}"/>`,
      // composed type, resting rows — uneven widths, like real set text
      `<rect x="16" y="22" width="30" height="5" fill="${INK}"/>`,
      `<rect x="16" y="30" width="22" height="5" fill="${INK}"/>`,
      `<rect x="16" y="38" width="26" height="5" fill="${INK}"/>`,
      // THE PULLED PROOF — amber, the one line drawn out past the tray wall
      `<rect x="16" y="46" width="44" height="5" fill="${AMBER}"/>`,
    ].join(""),
};

// ---------------------------------------------------------------------------
// COMPACT GLYPHS — purpose-drawn for 16-32px, not scaled-down full glyphs.
//
// Why these exist: the full glyphs are hairline drawings on a 64 grid. Rendered
// into a 16px favicon they turn to mush — verified by rasterising and looking,
// which is the only way this failure is ever caught. A favicon is a silhouette
// problem, not a drawing problem, so these are SOLID shapes with the stroke
// weight roughly tripled, detail removed, and the single amber element enlarged
// enough to survive. Same metaphor, fewer marks.
//
// Each keeps exactly ONE amber element, same as its full sibling.
// ---------------------------------------------------------------------------
const COMPACT = {
  /**
   * galley — the full glyph's tray-plus-rows collapses to mush at 16px (three
   * thin ink bars inside a hairline frame), verified by rasterising and
   * looking. This purpose-drawn version: a heavy, ASYMMETRIC tray (tall left
   * wall, a short right stub low down, so the mouth stands open on the right)
   * with one solid ink block still resting low inside, and a bold amber bar
   * clearing the open mouth entirely — no ink in its path — reading as "the
   * one line pulled clean out." Distinct silhouette from every sibling: no
   * other glyph in this program is an asymmetric open container.
   */
  galley: () =>
    [
      // tray: left wall, full height
      `<rect x="8" y="8" width="9" height="46" fill="${INK}"/>`,
      // tray: bottom
      `<rect x="8" y="46" width="46" height="8" fill="${INK}"/>`,
      // tray: right wall — a short stub, low, so the mouth stands open above it
      `<rect x="45" y="34" width="9" height="20" fill="${INK}"/>`,
      // one row of type still resting, low in the tray
      `<rect x="17" y="36" width="19" height="9" fill="${INK}"/>`,
      // THE PULLED PROOF — amber, clearing the open mouth entirely
      `<rect x="17" y="16" width="45" height="10" fill="${AMBER}"/>`,
    ].join(""),
};

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------
function svg(w, h, inner, { bg = null, label = "Agent James" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${
    bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""
  }${inner}</svg>\n`;
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  const project = args.project;
  const outDir = args.out ?? "apps/web/public/brand";
  if (!project || !GLYPHS[project]) {
    console.error(`brand.mjs: --project must be one of ${Object.keys(GLYPHS).join(", ")}`);
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });
  const written = [];
  const put = (name, content) => {
    writeFileSync(join(outDir, name), content);
    written.push(name);
  };

  // The maker's mark, in both polarities and at both scales.
  put("mark.svg", svg(G, G, chip()));
  put("mark-inv.svg", svg(G, G, chip(PAPER, AMBER), { bg: INK }));
  put("mark-16.svg", svg(G, G, chip(INK, AMBER, { pins: 3 })));
  put("mark-16-inv.svg", svg(G, G, chip(PAPER, AMBER, { pins: 3 }), { bg: INK }));

  // The project glyph.
  const glyph = GLYPHS[project]();
  put("glyph.svg", svg(G, G, glyph, { label: project }));
  put("glyph-inv.svg", svg(G, G, GLYPHS[project]().replaceAll(INK, PAPER), { bg: INK, label: project }));

  // ── Icon family ───────────────────────────────────────────────────────────
  // The PROJECT's own glyph is the identity in a tab, not the chip: five
  // identical chip favicons are indistinguishable in a tab strip, which is the
  // one job a favicon has. The chip stays the maker's mark in the footer and
  // the README lockup — association, not identity.
  const compact = COMPACT[project]();

  // Scalable favicon. Modern browsers take the SVG and downscale it, so this
  // one carries the COMPACT drawing, not the full glyph.
  put("favicon.svg", svg(G, G, compact, { bg: PAPER, label: `${project} icon` }));

  // Explicit small sizes for browsers that pick a raster. Rendered from the
  // compact drawing at each size by the PNG step (scripts/icons.mjs).
  put("icon-compact.svg", svg(G, G, compact, { bg: PAPER, label: `${project} icon` }));
  put("icon-compact-inv.svg", svg(G, G, COMPACT[project]().replaceAll(INK, PAPER), { bg: INK, label: `${project} icon` }));

  // Maskable / apple-touch: same drawing inset to the safe area, on paper, so
  // a platform that crops to a circle or rounds the corners does not clip it.
  const inset = 10;
  const scale = (G - inset * 2) / G;
  put(
    "icon-maskable.svg",
    svg(
      G,
      G,
      `<rect width="${G}" height="${G}" fill="${PAPER}"/><g transform="translate(${inset},${inset}) scale(${scale.toFixed(4)})">${compact}</g>`,
      { label: `${project} icon` }
    )
  );

  // Lockup: project glyph + wordmark, for the README header.
  const cell = 3.2;
  const w = word(project, 84, 30, cell, INK);
  const lockW = Math.ceil(w.end + 12);
  put(
    "lockup.svg",
    svg(
      lockW,
      64,
      `<g transform="translate(4,4) scale(0.87)">${glyph}</g>${w.svg}` +
        `<rect x="${(lockW - 10).toFixed(2)}" y="24" width="5.12" height="22.4" fill="${AMBER}"/>`,
      { label: `${project} — by Agent James` }
    )
  );

  // OG image: paper field, glyph, dot-matrix name, one amber rule. 1200x630.
  const ogWord = word(project, 96, 250, 12, INK);
  put(
    "og.svg",
    svg(
      1200,
      630,
      `<g transform="translate(96,96) scale(1.5)">${glyph}</g>` +
        ogWord.svg +
        `<rect x="96" y="330" width="${Math.min(1008, ogWord.end - 96).toFixed(0)}" height="6" fill="${AMBER}"/>` +
        `<g transform="translate(1040,470) scale(0.9)">${chip()}</g>`,
      { bg: PAPER, label: `${project} — Agent James` }
    )
  );

  // ── Raster sizes ──────────────────────────────────────────────────────────
  // SVG favicons cover modern browsers, but apple-touch-icon and the PWA
  // manifest require real PNGs, and some platforms still pick a raster over an
  // SVG. Each size is rendered FROM THE COMPACT DRAWING rather than from the
  // full glyph, so a 16px icon is a purpose-drawn silhouette and not a
  // downscaled hairline drawing.
  //
  // sharp is optional: if it is not resolvable, the SVGs are still written and
  // this step reports the skip rather than failing the build. That keeps the
  // generator usable in a repo that has not added the dependency yet.
  let sharp = null;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    /* optional */
  }

  if (sharp) {
    const raster = [
      ["favicon-16.png", 16, "icon-compact.svg"],
      ["favicon-32.png", 32, "icon-compact.svg"],
      ["favicon-48.png", 48, "icon-compact.svg"],
      ["apple-touch-icon.png", 180, "icon-maskable.svg"],
      ["icon-192.png", 192, "icon-maskable.svg"],
      ["icon-512.png", 512, "icon-maskable.svg"],
      ["og.png", null, "og.svg"],
    ];
    for (const [name, size, from] of raster) {
      const src = join(outDir, from);
      const img = sharp(src, { density: 384 });
      if (size) img.resize(size, size, { fit: "contain" });
      await img.png({ compressionLevel: 9 }).toFile(join(outDir, name));
      written.push(name);
    }
  } else {
    console.log("brand: sharp not resolvable — SVGs written, PNG sizes skipped");
  }

  console.log(`brand: ${project} -> ${outDir}`);
  for (const f of written) console.log(`  ${f}`);
}

await main();
