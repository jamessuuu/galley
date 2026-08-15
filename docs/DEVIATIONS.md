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
