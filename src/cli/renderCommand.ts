// Shared prep for the `render` and `poster` CLI commands (docs/SPEC.md
// §"CLI surface"): resolves every data source (git, GitHub release,
// facts.json, brand) from the CLI's flags and assembles the exact props
// the Remotion composition reads. Both commands call this, then differ
// only in which render function they hand the result to.

import { basename, resolve } from "node:path";
import { loadBrandConfig } from "../brand/brandConfig.js";
import { loadFactsFromFile } from "../data/facts.js";
import { extractGitRange } from "../data/git.js";
import { deriveRepoSlug, resolveReleaseInfo } from "../data/github.js";
import { assembleCompositionProps, type ReleaseCardProps } from "../render/compositionProps.js";

export interface RenderCommandOptions {
  repo: string;
  from: string;
  to: string;
  brand?: string;
  facts?: string;
}

/**
 * Resolves all three data sources + brand for `--repo/--from/--to[/--brand]
 * [/--facts]` and returns the assembled composition props. Throws
 * (GitExtractionError, FactsValidationError, BrandConfigError,
 * BrandContrastError) on any hard failure — git being unreadable, an
 * invalid facts.json, or an invalid/illegible brand config are all usage
 * errors the CLI's top-level catch reports and exits non-zero on, per
 * docs/SPEC.md ("invalid facts are REJECTED... never partially rendered";
 * brand contrast "fail[s] loudly"). The GitHub release lookup and the
 * GitHub-remote-derived closing CTA are the only sources allowed to
 * degrade silently to "no data" instead of throwing.
 */
export function buildReleaseCardProps(
  opts: RenderCommandOptions,
  reducedMotion: boolean
): ReleaseCardProps {
  const repoPath = resolve(process.cwd(), opts.repo);

  const git = extractGitRange(repoPath, opts.from, opts.to);
  const release = resolveReleaseInfo(repoPath, opts.to);
  const facts = opts.facts ? loadFactsFromFile(resolve(process.cwd(), opts.facts)) : null;
  const brand = loadBrandConfig(opts.brand ? resolve(process.cwd(), opts.brand) : undefined);

  const slug = deriveRepoSlug(repoPath);
  const githubUrl = slug ? `https://github.com/${slug.owner}/${slug.repo}` : null;
  const repoDisplayName = slug ? slug.repo : basename(repoPath);

  return assembleCompositionProps({
    repoDisplayName,
    git,
    release,
    facts,
    brand,
    githubUrl,
    reducedMotion,
  });
}
