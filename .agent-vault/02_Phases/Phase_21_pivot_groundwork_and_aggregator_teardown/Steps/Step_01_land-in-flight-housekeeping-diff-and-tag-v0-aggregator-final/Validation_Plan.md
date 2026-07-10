# Validation Plan

## Commands

- `pnpm typecheck && pnpm test` (all packages)
- `pnpm test:e2e` (desktop Electron suite; onboarding specs are the sensitive ones)
- `git tag -l v0-aggregator-final` → exactly one result; `git status` → clean tree.

## Acceptance Checks

- The five files are in one commit; the tag points at it; no other working-tree changes rode along.
- Onboarding renders both primary and secondary actions in the workspace step (manual: `pnpm --filter @srgnt/desktop dev`, walk onboarding with no workspace configured).

## Edge Cases

- `Onboarding.test.tsx` may assert the old single-button layout — update expectations, do not revert the component.
- The connector-catalog URL change means dev builds without `SRGNT_CONNECTOR_CATALOG_URL`/registry env now skip the remote catalog: expected, and moot after STEP-21-02 deletes the subsystem.

## Regression Expectations

- No behavior change outside onboarding and dev-only connector catalog resolution. Everything else in the suites must pass untouched.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final|STEP-21-01 Land in-flight housekeeping diff and tag v0-aggregator-final]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
