# Execution Brief

## Why

- Runtime must shrink to the modules the new product builds on; the main process must become a composition root so Phase 22+ services (harness supervisor, session service, broker) land as modules, not as more lines in a 1,300-line `index.ts`.

## Prerequisites

- STEP-21-02 complete (aggregator IPC gone — that alone removes a large share of `index.ts`).
- **Import audit before deleting each runtime module** (measured 2026-07-10): desktop main imports `CanonicalStore`, `createApprovalService`, `createRunLogService`, `redactEnv`, `truncateOutput`, `DEFAULT_REDACTION_POLICY`, plus the semantic-search Effect layer. The pty/terminal approval flow depends on the approval + run-log + redaction utilities — those modules STAY.

## Likely Code Paths

- Delete outright (no desktop imports per the audit): `packages/runtime/src/{workflows,loaders,query,launch}/`.
- Remove `CanonicalStore` usage from desktop main (it only fed aggregator views), then delete `packages/runtime/src/store/` if nothing else imports it.
- Keep: `approvals/`, `policy/`, `logs/`, `runs/` (`createRunLogService` feeds terminal run logs), `workspace/`, `semantic-search/` (source only).
- `packages/desktop/package.json` → remove the `extraResources` entry bundling `../assets/model`.
- `packages/desktop/src/main/index.ts` → extract per-service modules (suggested: `services/settings.ts`, `services/notes.ts`, `services/terminal.ts`, `services/updater.ts`, `services/workspace.ts`, `services/shell.ts`), each exporting `register(deps)`; `index.ts` keeps window lifecycle + registration only.

## Execution Checklist

1. Re-run the import audit (`rg "from '@srgnt/runtime'" packages/desktop/src`) — the keep/delete split must match reality on the day, not this note.
2. Delete runtime modules in dependency order, running `pnpm --filter @srgnt/runtime test` between deletions.
3. Extract main-process services one at a time, keeping each extraction green (`pnpm --filter @srgnt/desktop test`) — the existing `*.test.ts` files (notes-ipc, settings, crash, updater, shell-open-external) are the parity harness.
4. Remove the model from `extraResources`; verify `pnpm --filter @srgnt/desktop pack` output no longer contains it and boot doesn't load it eagerly (semantic-search stays dormant).

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
