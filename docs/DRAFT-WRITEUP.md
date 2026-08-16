# DRAFT — staged for review, not published

Finding-first draft per `showcase-program/BATCH-2-STANDARDS.md`. Nothing in
this file has been posted anywhere.

---

# Release notes nobody reads vs. a 40-second video from data your CI already emits

Every repo produces the same artifact after every release: a CHANGELOG
entry or a GitHub release page nobody opens. The information is real —
commits, test results, release metadata — but the format is dead on
arrival. galley takes the same real data and turns it into a 30–45 second
branded video instead, with every number labeled where it came from.

Here's a real one:

```
galley render --repo dogwatch --from 478fcbb --to 5143aeb --facts facts.json
```

That's dogwatch's actual CI-fix release arc — 5 real commits from git,
243/246 real test results from a real `vitest` run, 29 files changed
(+383/-62), rendered straight through. 1280×720, 36 seconds, 913KB, no
audio track. It's committed in this repo at
`examples/dogwatch-ci-fix.mp4` — not a mockup, the actual output of the
command above.

## The finding: labeling the source is the whole product

The interesting design decision wasn't the video template — it was
refusing to let anything render without a named source. Every number on
screen carries a small tag: "from git," "from CI artifact," "from GitHub
release." That constraint (docs/SPEC.md calls it death condition D3: *"any
rendered number whose provenance the video cannot name"* fails the build)
turned out to shape almost every other decision:

- **git** data (commit counts, authors, files-changed) is always
  available, so it's the only source that's non-optional — a bad repo
  path or ref is a hard error, not a degrade.
- **`facts.json`** — a small schema'd artifact a repo's own CI produces —
  is optional. Missing it doesn't fail the render; it renders an explicit
  "no data — no facts.json provided" tile instead of a blank or a
  fabricated number.
- **GitHub release metadata** is optional and network-dependent. When it's
  unavailable, the video falls back to git tag metadata, and when there's
  no tag either, to the same explicit "no data" pattern.

That last path isn't hypothetical — both dogfood videos in this repo hit
it for real. Neither dogwatch nor tiltmeter tags its releases, so both
title cards honestly read *"no data — no GitHub release and no git tag
named '5143aeb'"* instead of guessing a date. A tool that claims to source
every number honestly has to be willing to show "no data" on its own
launch assets, not just in a test fixture built to exercise the code path.

## What dogfooding against real repos actually caught

The fixture repo used through most of development has short, synthetic
commit messages by design — deterministic test data. Rendering dogwatch's
real history for the first time surfaced a real layout bug on the first
try: one real commit subject ("fix(ci): propagate the sibling-checkout fix
to watch.yml/resume.yml/canary.yml (the M7 blocker)") was long enough to
wrap to a second line and visually collide with the caption underneath it.
Fixed with a single-line ellipsis clamp instead of an unconstrained wrap,
then re-verified against the longest subject in either dogfood repo's real
history. It's a small bug, but it's the exact kind that only shows up once
you point the tool at data you didn't write yourself — which is the entire
argument for dogfooding over shipping against fixtures alone.

## What it doesn't do

galley renders one template — a "release card" with a title, a commit
timeline, a facts count-up, and a closing card — parametrized by a
`brand.json` (name, colors, font, logo). A second layout is a v2 decision,
not a runtime flag. There's no AI summarization of what changed and no
quality judgment of the release; commit messages shown are sampled
verbatim from git, never rewritten. `facts.json` is schema-validated, not
fact-checked — if a repo's own CI miscounts its tests, galley repeats the
miscount faithfully, labeled "from CI artifact" so a viewer knows exactly
which claim to go verify elsewhere. No audio track in v1: silence is the
honest default when there's no real narration or licensed music to attach
a claim to.

## Try it

```bash
npm install && npm run build

node dist/cli/index.js render \
  --repo /path/to/some/repo \
  --from v1.0.0 --to v1.1.0 \
  --out release.mp4

# same data, one still frame
node dist/cli/index.js poster --repo /path/to/some/repo --from v1.0.0 --to v1.1.0 --out release.png

# wire facts.json into your own CI
node dist/cli/index.js facts init
```

Three committed examples prove the pipeline end to end:
`examples/sample-repo-v1.1.0.mp4` (the deterministic fixture repo, the
milestone-4 verification artifact), `examples/dogwatch-ci-fix.mp4` and its
poster, and `examples/tiltmeter-latest.png` — two more real repos, real
git history, real test results, rendered by the same command shown above.
A static demo (`site/index.html`) walks through all three with the exact
commands that produced them; `docs/limitations.md` is the honest version
of this section, and `docs/DEVIATIONS.md` records every place the build
diverged from spec, including the layout bug above, with reasoning.
