#!/usr/bin/env node
// galley — repo -> release-video forge. CLI entry point.
// `render` and `poster` are wired in M4 once the Remotion pipeline exists
// (docs/SPEC.md); `facts init` has no dependency on rendering, so it's
// wired here in M2 alongside the facts.json schema it prints the recipe for.

import { Command } from "commander";
import { factsInitSnippet } from "../data/facts.js";

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

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
