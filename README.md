<p align="left">
  <img src="public/brand/lockup.svg" alt="galley — by Agent James" height="48">
</p>

# galley

**Renders a repo's real commits, CI runs, and test counts into a release
video. Every number is pulled straight from the pipeline — none of it is
typed in by hand.**

> **Status: build complete (docs/SPEC.md milestones M0–M6), not yet
> published.** See [docs/DEVIATIONS.md](docs/DEVIATIONS.md) for what
> shipped differently than spec'd, and
> [docs/limitations.md](docs/limitations.md) for what this tool cannot
> know. `site/` is a static local demo (serve it with any static file
> server, e.g. `npx serve site`) showing the real dogfood examples under
> `examples/`; it is not deployed anywhere.

## What it is

A CLI plus one [Remotion](https://www.remotion.dev/) template that turns a
repository's real shipping history into a branded 30–45s release video: a
title card, an animated commit timeline, a count-up of real test/file
numbers (each labeled with where it came from), and a closing card. Nothing
on screen is typed by a human — every figure traces to git, the GitHub
releases API, or a `facts.json` artifact the target repo's own CI produced.

This is **not** an annual GitHub-Unwrapped-style gimmick. It is a per-release,
on-demand tool: run it against a tag range and get a video for that release.

## Quickstart

```bash
npm install
npm run build

# Render a video from a real repo's real release range.
node dist/cli/index.js render \
  --repo /path/to/some/repo \
  --from v1.0.0 --to v1.1.0 \
  --out release.mp4

# Same data, one still frame — for a README badge or a social card.
node dist/cli/index.js poster \
  --repo /path/to/some/repo \
  --from v1.0.0 --to v1.1.0 \
  --out release.png

# Optional flags on either command:
#   --brand brand.json     custom { name, accent, ink, paper, logoSvgPath?, font? }
#   --facts facts.json     CI-produced test/coverage/custom facts (see below)
#   --reduced-motion       static cards, same data, no animation (render only —
#                           poster always renders the static variant)
```

`examples/sample-repo-v1.1.0.mp4` in this repo is a real output of the
`render` command above, run against the committed fixture repo
(`fixtures/sample-repo/`, no GitHub remote configured) — 1280×720, 36s,
473KB, no audio track. It's the actual D1 verification artifact, not a
hand-picked demo.

To wire `facts.json` into your own CI:

```bash
node dist/cli/index.js facts init
```

prints the copy-paste CI step (runs your test suite through vitest's JSON
reporter and writes `facts.json` from the real pass/total counts).

See [docs/SPEC.md](docs/SPEC.md) for the full CLI surface and
[docs/limitations.md](docs/limitations.md) before you trust a number on
screen.

## Why every number is real

- **git** — commit count, authors, sampled messages, files-changed stats:
  extracted straight from `git log` / `git diff --shortstat` against the
  target repo. Always available, no network.
- **GitHub release metadata** — title/date/notes via `gh api
  repos/{owner}/{repo}/releases`. Optional, requires network; if it's
  unavailable, the video degrades honestly to git tag metadata rather than
  guessing.
- **`facts.json`** — a small schema'd artifact the target repo's own CI
  emits (test counts, coverage, up to two custom facts). `galley facts init`
  prints the CI step that generates it from a real test run. Invalid facts
  are rejected outright, never partially rendered.

Any source that isn't available renders an explicit "no data — \<reason\>"
beat instead of a fabricated number.

## Docs

- [docs/SPEC.md](docs/SPEC.md) — the binding spec, milestone by milestone.
- [docs/limitations.md](docs/limitations.md) — what this tool cannot know.
- [docs/DEVIATIONS.md](docs/DEVIATIONS.md) — spec-vs-reality divergences.
- [docs/DRAFT-WRITEUP.md](docs/DRAFT-WRITEUP.md) — the launch writeup draft.

## Non-goals for v1

One template, not a template engine — a second layout is a v2 decision, not
a flag. No hosted rendering, no cloud, no API keys. No audio track (silence
is honest; a music bed is a v2 idea). No cross-repo comparison or leaderboard.

---

Part of the [Agent James](https://agentjames.vercel.app) portfolio.
Built by James Lorenz Santos. Code MIT; brand assets excluded (see LICENSE).
