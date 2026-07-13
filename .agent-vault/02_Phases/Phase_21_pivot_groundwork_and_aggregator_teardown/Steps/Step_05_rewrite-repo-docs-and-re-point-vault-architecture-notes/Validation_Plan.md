# Validation Plan

## Commands

- `vault_validate` (all targets) — error count not worse than the pre-step baseline; zero errors on notes this step touched.
- `rg -n 'connector|aggregator|Today view|Calendar' README.md AGENTS.md TESTING.md` — only intentional historical references remain (e.g., the pivot note).
- Fresh-clone smoke: `pnpm install && pnpm typecheck && pnpm --filter @srgnt/desktop dev` following README verbatim.

## Acceptance Checks

- README describes the ACP product and the five-package layout; no instruction references a deleted command (`cli:connectors`, `srgnt-connectors`).
- All four re-pointed architecture notes carry the ARCH-0009 pointer and updated `reviewed_on`; ARCH-0009 links back (Related Notes) — traversal from either side reaches the other.
- PHASE-21 acceptance criteria checkboxes reflect reality; phase status updated.

## Edge Cases

- `docs/pi-teams.md` stays — it documents the dev workflow (and the Groups design reference), not the aggregator product.
- `docs/flagship-workflow-walkthrough.md` describes the dead daily-briefing flow — move under a "historical" note or delete; either way README must not link it.

## Regression Expectations

- Pure docs/vault change: zero code or test diffs beyond possibly `docs/`.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes|STEP-21-05 Rewrite repo docs and re-point vault architecture notes]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
