# Execution Brief

## Why

- Every later phase builds on a five-package monorepo without aggregator surface. Deleting before adding (STEP-21-03/04) guarantees new code can never accidentally depend on dead code.

## Prerequisites

- STEP-21-01 complete (`v0-aggregator-final` tag exists — the safety net that makes bold deletion safe).
- Work on a branch; the diff is huge and should review as pure deletion + reference cleanup.

## Likely Code Paths (deletion order matters)

1. **Leaf packages first**: `packages/fred`, `packages/entitlements`, `packages/sync`, `packages/executors` — nothing else imports them except each other and desktop settings surfaces.
2. **Renderer**: `TodayView.tsx`, `CalendarView.tsx`, `ConnectorStatus.tsx` (+ tests), their `sidepanels/` entries, Navigation/ActivityBar entries, onboarding steps and settings sections in `main.tsx` that reference connectors/entitlements.
3. **Preload**: connector IPC surface — channels `connector:list|status|install|uninstall|connect|disconnect` and `connector:package:install|inspect|list|uninstall` in `src/preload/index.ts`.
4. **Main**: `src/main/{cli,connectors}/`, connector handlers in `index.ts`, `connector-ipc.test.ts`, `dev-connectors/`.
5. **Package**: `packages/connectors`, `examples/`, the `srgnt-connectors` bin entry, root `cli:connectors` script.
6. **Contracts**: delete `src/connectors/` and `src/executors/` modules and exports now; leave `src/entities/` for STEP-21-04's rewrite (desktop may still type against entities until then).
7. **E2E**: prune aggregator assertions from `e2e/app.spec.ts` and `e2e/ui-coverage-matrix.spec.ts` (both reference connector/Today/Calendar surfaces).
8. `pnpm-workspace.yaml` is glob-based (untouched), but run `pnpm install` to rewrite `pnpm-lock.yaml`.

## Execution Checklist

1. Delete in the order above, typechecking between groups (`pnpm typecheck`) so each breakage is local and obvious.
2. After renderer deletions, reconcile `LayoutContext`/persisted layout state: remove aggregator view ids from persisted-layout defaults or migrations.
3. Sweep: `rg -n "@srgnt/(connectors|executors|sync|entitlements|fred)|ConnectorStatus|TodayView|CalendarView|connector:" packages/ --glob '!node_modules'` → zero hits.
4. `pnpm install && pnpm build` to confirm the workspace graph is intact.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces|STEP-21-02 Delete aggregator packages UI IPC and CLI surfaces]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
