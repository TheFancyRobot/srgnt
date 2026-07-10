# Validation Plan

## Commands

- `pnpm typecheck && pnpm test && pnpm test:e2e` — green with the reduced surface.
- `rg -n "@srgnt/(connectors|executors|sync|entitlements|fred)|ConnectorStatus|TodayView|CalendarView|connector:" packages/ --glob '!node_modules'` → empty.
- `pnpm --filter @srgnt/desktop dev` — app boots to the slim shell (layout, titlebar, notes, terminal, settings, onboarding).

## Acceptance Checks

- Remaining packages: `tsconfig`, `contracts`, `runtime`, `desktop` (harness arrives in Phase 22).
- No IPC channel prefixed `connector:` registered in main or exposed in preload.
- Onboarding completes without connector steps; Settings renders without connector/entitlement sections.

## Edge Cases

- Persisted layout state from an old profile may reference deleted view ids — the app must fall back to a default view, not crash (add a guard if needed; record in Implementation Notes).
- `patches/@codemirror__view` and semantic-search stay untouched — they belong to kept subsystems.
- `ui-coverage-matrix.spec.ts` enumerates views; update the matrix table, don't blanket-skip.

## Regression Expectations

- Notes, terminal, settings persistence, updater, and crash-reporting tests pass unmodified — if one needs editing, the deletion cut too deep.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces|STEP-21-02 Delete aggregator packages UI IPC and CLI surfaces]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
