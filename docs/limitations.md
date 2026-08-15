# Limitations

What galley cannot know, and what it does not measure. Read this before you
trust a number on screen.

## Numbers are only as honest as their sources

- **git** data (commit counts, authors, files-changed) is read directly from
  the target repo's own history via `git log` / `git diff --shortstat`. It
  is as accurate as the repo's history — a rewritten history, a squash-merge
  policy, or a shallow clone (`--depth`) changes what git itself reports, and
  galley reports exactly what git reports, nothing more.
- **`facts.json`** (test counts, coverage, custom facts) is produced by the
  *target repo's own CI*, not by galley. Galley validates that the file
  matches its schema and rejects anything malformed — it does not, and
  cannot, verify that the numbers inside are true. If a repo's CI lies or
  miscounts, galley's video repeats the lie faithfully, labeled "from CI
  artifact" so a viewer knows exactly which claim to go verify.
- **GitHub release metadata** requires network access and a working `gh` CLI
  session. If either is unavailable, or the repo has no GitHub remote, or no
  release exists for the target ref, galley degrades to git tag metadata
  instead of guessing — and if there's no tag either, the beat renders
  "no data" rather than an invented date or title.

## Scope limits (v1, by design — see docs/SPEC.md's death conditions)

- **One template.** Every video uses the same "release card" layout,
  parametrized by `brand.json`. A different layout is a v2 decision, not a
  runtime flag — this is a deliberate non-goal, not an oversight.
- **720p (1280×720) default, 30–45s.** Longer or higher-resolution renders
  work but were not the tuned target; render time scales roughly linearly
  with duration and resolution, and with the host machine's CPU/GPU.
- **No audio track in v1.** Silence is the honest default when there's no
  real narration or licensed music to attach a claim to. A music bed is a v2
  idea, not a v1 corner cut.
- **Render time is real wall-clock time**, dominated by launching a headless
  Chromium instance and encoding H.264 frame-by-frame. It is not
  instantaneous, and a render can fail if the host machine cannot launch
  Chromium (missing shared libraries on some minimal Linux containers, for
  example) — galley surfaces that as an explicit error, not a hang.
- **`--from`/`--to` accept any git ref** (tags, SHAs, branches) — galley does
  not require semantic-version tags, but the closing card's "version" text
  is only as meaningful as the ref you pass it.

## What galley does not attempt

- It does not judge whether a release is *good* — no quality score, no
  sentiment analysis of commit messages, no AI-generated summary of what
  changed. The commit messages shown are sampled verbatim from git, not
  rewritten.
- It does not talk to any AI/LLM API. Every string on screen is either
  pulled verbatim from a data source or is static template copy.
- It does not publish, upload, or share the rendered video anywhere. The
  output is a local `.mp4`/`.png` file; what happens to it next is yours.
