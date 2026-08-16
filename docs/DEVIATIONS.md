# Deviations from spec

Every divergence between `docs/SPEC.md` and what actually shipped, with the
reasoning, per `showcase-program/BATCH-2-STANDARDS.md`'s honesty
architecture. Entries are added as they happen, not reconstructed after the
fact.

## M0 — package manager and repo layout

**Spec says:** nothing explicit about package manager or monorepo-vs-single-
package layout; it only specifies the CLI surface and the data/render/CLI
components.

**Built as:** a single npm package (not a pnpm workspace/monorepo, unlike
the batch-1 siblings). galley is genuinely one thing — a CLI plus one
Remotion template — with no multi-app surface (no separate web app in v1),
so a monorepo would be structure without a second workspace to justify it.
`npm` (not `pnpm`) for the same reason: no workspace protocol needed.

This is a scope choice within an area the spec left open, not a violation of
a MUST — recorded here for completeness rather than as a defect.

## M3 — closing card CTA ("install command or URL from config")

**Spec says:** "Beat 4 — closing card: install command or URL from config."
The brand config schema (`{ name, accent, ink, paper, logoSvgPath?, font? }`)
has no field for an install command or URL, and the CLI surface has no
matching flag either — v1's data layer has no source that could honestly
produce a package-registry install command (galley doesn't talk to npm).

**Built as:** the closing CTA is derived, not configured: the target repo's
resolved GitHub URL (`https://github.com/{owner}/{repo}`, from the same
`git remote get-url origin` parse `src/data/github.ts` already does for
release lookup) when one resolves, labeled "from git remote"; otherwise a
real, literally-runnable `git checkout <toRef>` for the exact range that was
rendered, labeled "from git". Never a fabricated `npm install <name>` —
that would violate the honesty architecture (nothing on screen not sourced
or static template copy) for a repo that may not even be an npm package.

## M3 — Remotion composition props type is a `type`, not an `interface`

**Not really a deviation, recorded for future maintainers:** `ReleaseCardProps`
(`src/render/compositionProps.ts`) is declared as an object-literal `type`
rather than an `interface`. Remotion's `<Composition>` generic constrains
its Props parameter to `Record<string, unknown>`; only type-alias object
literals pick up TypeScript's implicit string index signature that
satisfies that constraint — a same-shaped `interface` fails to typecheck
there. Every other exported shape in this codebase uses `interface`
(matching `.eslintrc`/house style); this one field is the sole exception,
and it's exactly this Remotion API requirement, not a style drift.

## M3 — `src/brand/defaultBrand.ts` split out of `src/brand/brandConfig.ts`

**Not a spec deviation** (brand config's shape and behavior are unchanged),
recorded because it wasn't anticipated going into M3: `brandConfig.ts` reads
files off disk (`node:fs`/`node:path`) — correct for the CLI's Node runtime,
but the Remotion composition (`src/render/exampleProps.ts` -> `Root.tsx` ->
`index.ts`, the entry point `@remotion/bundler` bundles with webpack for
browser/headless-Chromium execution) needs the same `DEFAULT_BRAND` palette
for its Studio-preview default props. Importing `brandConfig.ts` from that
path pulled `node:fs` into webpack's dependency graph, which webpack cannot
resolve ("UnhandledSchemeError: Reading from 'node:fs' is not handled").
Fix: `DEFAULT_BRAND` (the plain palette constant, zero I/O) now lives in its
own `src/brand/defaultBrand.ts`; `brandConfig.ts` imports and re-exports it
for the CLI path, `exampleProps.ts` imports it directly for the render
path. Rule for future code: nothing under `src/render/composition/` (or
anything it imports, even transitively) may import `brandConfig.ts` itself.

## M3 — `bundleCompositionEntry` needs a `webpackOverride` for NodeNext imports

**Not a spec deviation**, recorded as a real integration snag worth knowing
about: `tsconfig.json` uses `moduleResolution: NodeNext`, so every relative
import under `src/render/` is written with an explicit `.js` extension
(`from "../compositionProps.js"`) even though the file on disk is `.ts`.
That's correct for `tsc`'s own CLI build, but Remotion's bundler (webpack)
doesn't know that `.js` import specifiers can resolve to `.ts`/`.tsx`
source files, and fails with "Module not found" for every such import.
Fixed with a `resolve.extensionAlias` override
(`{ ".js": [".js", ".ts", ".tsx"] }`) passed via `bundle()`'s
`webpackOverride` option in `src/render/renderPipeline.ts` — the standard
fix for this exact NodeNext-imports + Remotion-bundler combination.
