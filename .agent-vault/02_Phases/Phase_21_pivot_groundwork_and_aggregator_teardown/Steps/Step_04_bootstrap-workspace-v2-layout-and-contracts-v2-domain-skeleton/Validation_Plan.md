# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test && pnpm --filter @srgnt/runtime test`
- `pnpm typecheck` (whole workspace — catches missed `@effect/schema` imports at compile time)
- `rg '@effect/schema' packages/ --glob '!node_modules'` → empty (also check `pnpm-lock.yaml` no longer resolves it after `pnpm install`).

## Acceptance Checks

- Fresh bootstrap on an empty dir creates exactly the v2 layout; validate() reports missing dirs correctly; re-running is idempotent.
- Each v2 schema has decode success + failure tests; SessionEvent tolerates unknown `kind` values (skips or preserves raw, per ARCH-0009 tolerant-reader invariant) — property-tested with fast-check.
- HarnessDefinition schema round-trips a realistic Pi definition (npx pi-acp launch spec with env + quirks).

## Edge Cases

- Existing `~/srgnt-workspace` dirs from the aggregator era: bootstrap must not delete user data — v1 layout dirs are ignored, not removed (pre-release, but never destructive).
- Onboarding's workspace step consumes bootstrap results — walk onboarding manually after the change.

## Regression Expectations

- Desktop main compiles against the new contracts with only import-path-level changes; no behavior change in the slim shell.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton|STEP-21-04 Bootstrap workspace v2 layout and contracts v2 domain skeleton]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
