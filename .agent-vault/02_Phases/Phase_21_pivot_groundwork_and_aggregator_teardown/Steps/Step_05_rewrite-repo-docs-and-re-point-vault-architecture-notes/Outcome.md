# Outcome

- Result: complete (2026-07-12). README/AGENTS/TESTING now describe the ACP command-center product (4 packages today, `@srgnt/harness` marked upcoming for Phase 22); all connector/aggregator instructions removed except two intentional historical pivot references. Seven vault notes re-pointed with bounded superseded/historical pointers to ARCH-0009 (DEC-0017): System_Overview, Integration_Map, Domain_Model, Connector_Package_Runtime (each with `reviewed_on: 2026-07-12`), plus sync-architecture, fred-workflow-design, conflict-resolution-design; ARCH-0009 Related Notes back-links all of them. `docs/flagship-workflow-walkthrough.md` banner-marked historical.
- Validation: `pnpm typecheck` green; `pnpm test` green (desktop 758/758, recursive exit 0 across contracts/runtime/desktop); `rg` doc grep shows only intentional historical references; E2E not rerun (docs-only change) — STEP-21-03/04 baseline stands (68 passed / 3 pre-existing failures).
- Follow-up: when `@srgnt/harness` lands in Phase 22, promote it from "upcoming" to real in README's structure/boundaries sections; `06_Shared_Knowledge/srgnt_framework_*` notes were out of scope and still describe the aggregator era without banners.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes|STEP-21-05 Rewrite repo docs and re-point vault architecture notes]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
