# SPEC — galley (repo→release-video forge)

Name decided 2026-08-16 (research/naming.md batch-2): **galley** — the galley
proof, printed only from real composed type. Repo: `jamessuuu/galley`; CLI
binary `galley`; npm later via scoped publish (dead squat on the bare name).

2026-08-16. Batch-2 slot B (strategist score 51/70, keep-firm). Binds to
`showcase-program/BATCH-2-STANDARDS.md` (production bar, verification bar,
honesty architecture, DRAFT-WRITEUP deliverable). Build agent copies this to
the repo as `docs/SPEC.md` and follows it milestone by milestone.

## Positioning

A CLI + one Remotion template that renders a repo's REAL shipping story —
commits, release metadata, CI-produced facts — into a branded 30–45s release
video. Every number is sourced from the pipeline and labeled with its source;
none is typed by a human. NOT GitHub-Unwrapped (annual per-user gimmick,
dormant): this is a per-release, on-demand release-comms tool.

## Death conditions (stop the build and report if hit)

- D1: a full end-to-end local render of the sample video has not completed
  by the END OF M4. Render fragility is the named #1 failure mode — surface
  it early, never at the finish line.
- D2: scope creep into a flexible template ENGINE. v1 is ONE template with
  brand parameters. A second template is v2 by definition.
- D3: any rendered number whose provenance the video cannot name. If a
  source is unavailable the section renders an explicit "no data — <reason>"
  beat (degrade-honestly), never a fabricated or hand-typed value.

## Data layer (v1 = exactly three sources, each labeled in-video)

1. **git** (always available, no network): commits between `--from <ref>`
   and `--to <ref>` — count, authors, messages (sampled for display),
   files-changed stats. Extracted via `git log`/`git diff --shortstat`
   against the target repo path.
2. **GitHub release metadata** (network, optional): title/date/notes via
   `gh api repos/{owner}/{repo}/releases` (REST v3 — verify the response
   shape against the live API in M2 and commit a recorded fixture; if
   offline or no release exists, degrade to git tag metadata honestly).
3. **facts.json** (optional, CI-produced): a small schema'd artifact the
   target repo's own CI emits — `{ tests_passed, tests_total, coverage_pct?,
   custom: [{label, value, source}] }`. The CLI ships `facts init` which
   prints a copy-paste CI step that generates it from the repo's real test
   run. Schema-validated; invalid facts are REJECTED with a clear error,
   never partially rendered.

## The template ("release card", 30–45s, 1280×720 default)

Beat 1 — title card: repo name, version, date, brand logo/colors.
Beat 2 — commit flow: animated timeline ticks from real commits (sampled
messages, author count). Beat 3 — facts: count-up of tests passed + files
changed (+ up to 2 custom facts), EACH with a small source label
("from git" / "from CI artifact" / "from GitHub release"). Beat 4 — closing
card: install command or URL from config. Burned-in caption line per beat
(sound-off-first; there is no audio track in v1 — silence is honest, a
music bed is v2). Reduced-motion variant: static cards, same data (rendered
when `--reduced-motion` is passed; also used for the poster PNG).

## Brand config

`brand.json`: { name, accent, ink, paper, logoSvgPath?, font? }. One bundled
OSS font as default (commit it; license file alongside). Colors validated
for ≥4.5:1 title contrast at load — fail loudly with the computed ratio.

## CLI surface

```
<name> render --repo <path> --from <ref> --to <ref> [--brand brand.json]
              [--facts facts.json] [--out release.mp4] [--reduced-motion]
<name> facts init          # prints the CI snippet that emits facts.json
<name> poster ...          # same args → single-frame PNG poster
```
Local rendering via @remotion/bundler + @remotion/renderer. No cloud, no
keys. Render timeout enforced (default 10 min) with an honest error.

## Verification plan

- Unit (vitest): git extractor against a COMMITTED fixture repo
  (`fixtures/sample-repo/` built by a script, deterministic history);
  facts.json schema validation (valid/invalid/edge cases); release-metadata
  parser against recorded GitHub API fixtures; props assembler
  (data → composition props) snapshot-tested.
- e2e: ONE real render of a 3–5s test composition asserting the mp4 exists
  and probe-reported duration matches (±0.5s). On CI, if Chromium/Remotion
  rendering proves runner-hostile after 2 real attempts, env-gate WITH
  LOGGED REASON per standards; the full-length render then remains a
  local-required check — but M4's local render is non-negotiable either way.
- CI (GitHub Actions): typecheck, lint, unit, (e2e or gated), green ON
  ACTIONS after publication.

## Milestones

- M0 scaffold: TS strict, vitest, CI workflow, license, brand per house kit.
- M1 git data layer + fixture repo + tests.
- M2 facts.json schema + `facts init` + GitHub release fetch with recorded
  fixture (verify live schema once, commit the recording).
- M3 Remotion composition: beats 1–4 from static props; snapshot-tested
  props; poster frame renderer.
- M4 CLI wiring + REAL full-length render of the fixture repo's video
  (checkpoint artifact ≤8MB, 720p, committed under `examples/`). D1 gate.
- M5 degrade-honestly beats (each source ablated in tests), reduced-motion
  variant, contrast validation, README quickstart with real commands.
- M6 DOGFOOD: render TWO real videos from sibling repos (suggested:
  dogwatch's CI-fix release, tiltmeter's latest) using their real git
  history + a facts.json generated from their real test runs. Commit ONE
  ≤8MB example + posters for both. These are launch assets, not just tests.
  Then: static demo site (`site/`: sample video, poster, quickstart,
  limitations page), `docs/DRAFT-WRITEUP.md` (finding-first: "release notes
  nobody reads vs a 40-second video from data your CI already emits — here
  is a real one"), `docs/DEVIATIONS.md`, OG/favicon (16px-rasterized proof).

## Limitations page must state

Numbers are only as honest as their sources (facts.json is produced by the
repo's own CI — this tool verifies schema, not truth); GitHub metadata
requires network; one template, 720p default; no audio in v1; render time
scales with video length and machine.
