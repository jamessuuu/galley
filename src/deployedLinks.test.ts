import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  SITE,
  classifyRef,
  ensureSiteBuilt,
  extractRefs,
  scanSite,
  type SiteConfig,
} from "../scripts/check-site-links.mjs";

// Vercel uploads exactly site/ (vercel.json outputDirectory). Any reference
// in site/*.html that resolves outside it, or to nothing inside it, is a
// 404 on the deployed domain no matter how well it resolves in the repo
// tree. The 2026-09-06 sweep found ../docs/SPEC.md and ../docs/DEVIATIONS.md
// dead on the live homepage; scripts/build-site.mjs had fixed the same class
// for assets but not for <a href>.
describe("deployed site links (outputDirectory boundary)", () => {
  beforeAll(() => {
    ensureSiteBuilt(SITE);
  });

  it("every href/src/poster under site/ resolves inside the deployed output or to a tracked file on GitHub", () => {
    const violations = scanSite(SITE);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it("the real pages link repo docs by their GitHub URL, never by a parent-relative path", () => {
    const outputRoot = path.join(SITE.repoRoot, SITE.outputDir);
    const ghPrefix = `https://github.com/${SITE.github.owner}/${SITE.github.repo}/blob/${SITE.github.branch}/`;
    for (const page of ["index.html", "limitations.html"]) {
      const html = readFileSync(path.join(outputRoot, page), "utf8");
      const hrefs = extractRefs(html).filter((r) => r.attr === "href").map((r) => r.value);
      expect(hrefs.some((h) => h.startsWith("../")), `${page} still has a ../ href`).toBe(false);
      expect(hrefs.some((h) => h.startsWith(ghPrefix)), `${page} should link at least one repo doc on GitHub`).toBe(true);
    }
  });
});

describe("extractRefs / classifyRef", () => {
  it("sees href, src and poster on any tag, decodes entities, and skips comments, script bodies and style bodies", () => {
    const html = `
      <!-- <a href="../commented-out.md">not a link</a> -->
      <a href="a.html?x=1&amp;y=2">a</a>
      <video poster="c.png"><source src="d.mp4"></video>
      <script type="module">const s = '<a href="../inside-script.md">';</script>
      <style>.x { background: url("../inside-style.png"); }</style>
    `;
    expect(extractRefs(html)).toEqual([
      { tag: "a", attr: "href", value: "a.html?x=1&y=2" },
      { tag: "video", attr: "poster", value: "c.png" },
      { tag: "source", attr: "src", value: "d.mp4" },
    ]);
  });

  it("separates fragments and non-http schemes (skip) from external URLs and local paths", () => {
    expect(classifyRef("#top")).toBe("skip");
    expect(classifyRef("mailto:x@y.z")).toBe("skip");
    expect(classifyRef("https://www.remotion.dev/")).toBe("external");
    expect(classifyRef("../docs/SPEC.md")).toBe("local");
    expect(classifyRef("./vendor/examples/dogwatch-ci-fix.mp4")).toBe("local");
  });
});

describe("the rules bite on a synthetic site", () => {
  let root: string;
  let site: SiteConfig;
  const gh = `https://github.com/${SITE.github.owner}/${SITE.github.repo}/blob`;

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "galley-links-"));
    mkdirSync(path.join(root, "site", "sub"), { recursive: true });
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "SPEC.md"), "# exists in the repo, not in site/");
    writeFileSync(path.join(root, "site", "ok.html"), "<p>ok</p>");
    writeFileSync(path.join(root, "site", "sub", "index.html"), "<p>sub</p>");
    writeFileSync(path.join(root, "site", "hidden.html"), "<p>excluded by ignore</p>");
    writeFileSync(path.join(root, ".vercelignore"), "hidden.html\n");
    writeFileSync(
      path.join(root, "site", "index.html"),
      [
        '<a href="../docs/SPEC.md">escapes</a>',
        '<a href="nope.html">missing</a>',
        '<a href="hidden.html">not deployed</a>',
        '<a href="ok">clean-url ok</a>',
        '<a href="sub">dir index ok</a>',
        '<a href="/ok.html?x=1#frag">root-relative ok</a>',
        '<a href="#top">fragment</a>',
        '<a href="https://example.com/anything">external, out of scope</a>',
        `<a href="${gh}/${SITE.github.branch}/docs/does-not-exist.md">gh missing</a>`,
        `<a href="${gh}/not-the-default/docs/SPEC.md">gh wrong branch</a>`,
        `<a href="${gh}/${SITE.github.branch}/docs/SPEC.md">gh ok</a>`,
      ].join("\n"),
    );
    site = { ...SITE, repoRoot: root, outputDir: "site", build: null, ignoreFile: ".vercelignore" };
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("flags exactly the four broken shapes and nothing else", () => {
    const violations = scanSite(site);
    const byValue = Object.fromEntries(violations.map((v) => [v.value, v.rule]));
    expect(byValue["../docs/SPEC.md"]).toBe("escapes-output");
    expect(byValue["nope.html"]).toBe("missing-in-output");
    expect(byValue["hidden.html"]).toBe("not-deployed");
    expect(byValue[`${gh}/${SITE.github.branch}/docs/does-not-exist.md`]).toBe("github-path");
    expect(byValue[`${gh}/not-the-default/docs/SPEC.md`]).toBe("github-path");
    expect(violations).toHaveLength(5);
  });
});
