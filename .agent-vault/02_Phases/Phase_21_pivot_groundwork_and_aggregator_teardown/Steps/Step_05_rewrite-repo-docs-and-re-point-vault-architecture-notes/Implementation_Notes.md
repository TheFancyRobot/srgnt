# Implementation Notes

- Repo reality documented: **4 packages** (tsconfig, contracts, runtime, desktop) — the brief's "five-package structure" includes `@srgnt/harness`, which arrives in Phase 22; README marks it explicitly as planned/not yet in the repo.
- Root pnpm scripts are unchanged from the aggregator era and all still valid (`typecheck`, `test`, `test:e2e`, `build`, `lint`, release shortcuts); no root `cli:connectors` script exists anymore, so TESTING.md's CLI section was pure deadwood.
- Settings still persist to `<workspace>/.command-center/config/desktop-settings.json` (`packages/desktop/src/main/settings.ts:36`); workspace v2 bootstrap creates `projects/`, `groups/templates/`, `harnesses.json`, `settings.json` (`packages/runtime/src/workspace/bootstrap.ts`).
- Current E2E surface (per `packages/desktop/package.json` `test:e2e`): app.spec, gfm-compliance, ui-coverage-matrix, bug-0013-visual (+ packaged.spec for the Linux smoke); TESTING.md coverage bullets rewritten from actual test titles.
- `06_Shared_Knowledge/fred-workflow-design.md` had no YAML frontmatter, so `vault_mutate` rejected it; added minimal `shared_knowledge` frontmatter (matching sibling notes) before appending the historical pointer.
- `docs/flagship-workflow-walkthrough.md` kept but banner-marked HISTORICAL instead of deleted (Validation Plan allowed either; README does not link it).
- ARCH-0009 already back-linked System_Overview/Integration_Map/Domain_Model; appended one Related Notes line adding Connector_Package_Runtime and the three shared-knowledge notes so traversal reaches every re-pointed note from either side.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes|STEP-21-05 Rewrite repo docs and re-point vault architecture notes]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
