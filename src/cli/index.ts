#!/usr/bin/env node
// galley — repo -> release-video forge. CLI entry point.
// `facts init` has no dependency on rendering, so it was wired in M2
// alongside the facts.json schema it prints the recipe for. `render` and
// `poster` (M4) share their data-resolution step via renderCommand.ts and
// differ only in which render function (renderVideo/renderPoster,
// src/render/renderPipeline.ts) they hand the assembled props to.

import { Command } from "commander";
import { resolve } from "node:path";
import { factsInitSnippet } from "../data/facts.js";
import { buildReleaseCardProps } from "./renderCommand.js";
import {
  DEFAULT_RENDER_TIMEOUT_MS,
  bundleCompositionEntry,
  renderPoster,
  renderVideo,
} from "../render/renderPipeline.js";

const program = new Command();

program
  .name("galley")
  .description(
    "Renders a repo's real commits, CI runs, and test counts into a release video."
  )
  .version("0.1.0");

const facts = program.command("facts").description("facts.json helpers");

facts
  .command("init")
  .description(
    "Print the CI step that generates facts.json from a real test run."
  )
  .action(() => {
    process.stdout.write(factsInitSnippet());
  });

program
  .command("render")
  .description("Render a repo's real release data into a branded video.")
  .requiredOption("--repo <path>", "path to the target git repository")
  .requiredOption("--from <ref>", "start ref (exclusive), e.g. a previous tag")
  .requiredOption("--to <ref>", "end ref (inclusive), e.g. the release tag")
  .option("--brand <path>", "path to a brand.json (defaults to galley's own house brand)")
  .option("--facts <path>", "path to a CI-produced facts.json (omit to degrade honestly)")
  .option("--out <path>", "output .mp4 path", "release.mp4")
  .option("--reduced-motion", "render the static (no-animation) variant", false)
  .action(async (opts: {
    repo: string;
    from: string;
    to: string;
    brand?: string;
    facts?: string;
    out: string;
    reducedMotion: boolean;
  }) => {
    const props = buildReleaseCardProps(opts, opts.reducedMotion);
    const outputPath = resolve(process.cwd(), opts.out);

    console.log(`galley: bundling composition...`);
    const { serveUrl } = await bundleCompositionEntry();

    console.log(
      `galley: rendering ${props.repoName} ${props.version} -> ${outputPath} (this can take a while)...`
    );
    const result = await renderVideo({
      serveUrl,
      inputProps: props,
      outputPath,
      timeoutMs: DEFAULT_RENDER_TIMEOUT_MS,
      onProgress: ({ renderedFrames, totalFrames }) => {
        process.stdout.write(`\rgalley: rendered ${renderedFrames}/${totalFrames} frames`);
      },
    });
    process.stdout.write("\n");
    console.log(
      `galley: wrote ${result.outputPath} (${result.durationInFrames} frames @ ${result.fps}fps)`
    );
  });

program
  .command("poster")
  .description(
    "Render a single-frame PNG poster from a repo's real release data (same data as `render`, always the static variant)."
  )
  .requiredOption("--repo <path>", "path to the target git repository")
  .requiredOption("--from <ref>", "start ref (exclusive), e.g. a previous tag")
  .requiredOption("--to <ref>", "end ref (inclusive), e.g. the release tag")
  .option("--brand <path>", "path to a brand.json (defaults to galley's own house brand)")
  .option("--facts <path>", "path to a CI-produced facts.json (omit to degrade honestly)")
  .option("--out <path>", "output .png path", "release.png")
  .action(async (opts: {
    repo: string;
    from: string;
    to: string;
    brand?: string;
    facts?: string;
    out: string;
  }) => {
    // The poster is always the static (reduced-motion) variant, per
    // docs/SPEC.md: "[the reduced-motion variant is] also used for the
    // poster PNG" — a still frame of a mid-animation moment would be an
    // arbitrary, meaningless capture.
    const props = buildReleaseCardProps(opts, true);
    const outputPath = resolve(process.cwd(), opts.out);

    console.log(`galley: bundling composition...`);
    const { serveUrl } = await bundleCompositionEntry();

    console.log(`galley: rendering poster for ${props.repoName} ${props.version} -> ${outputPath}...`);
    const result = await renderPoster({ serveUrl, inputProps: props, outputPath, frame: 0 });
    console.log(`galley: wrote ${result.outputPath}`);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
