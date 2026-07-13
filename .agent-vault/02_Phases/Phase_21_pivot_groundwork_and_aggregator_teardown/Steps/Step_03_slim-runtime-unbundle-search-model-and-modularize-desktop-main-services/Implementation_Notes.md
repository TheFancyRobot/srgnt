# Implementation Notes

- Import audit on the day (post STEP-21-02): desktop main's only runtime imports were `CanonicalStore, createRunLogService, createApprovalService, redactEnv, truncateOutput, DEFAULT_REDACTION_POLICY` in `src/main/index.ts` plus the dynamic `import('@srgnt/runtime')` in `src/main/semantic-search/worker.ts`. `createRunLogService` lives in `logs/run-log.ts` (runtime `runs/` was already deleted in STEP-21-02).
- `runtime/src/artifacts/` was only consumed by `workflows/daily-briefing` — deleted together. `store/` was only consumed by desktop's `entitiesList` handler (contracts fixtures seeding), which had no renderer consumer.
- Preload channel maps are guarded bidirectionally by `preload-ipc-sync.test.ts` and `preload-self-contained.test.ts` (BUG-0002): removing a channel from main/contracts requires removing it from the preload inline map, and vice versa.
- `src/main/semantic-search/ipc-handlers.test.ts` does source-string assertions against the main process implementation; it now reads `../services/semantic-search.ts` instead of `../index.ts`.
- dist layout mirrors src (`tsconfig.main.json` rootDir/outDir), so `__dirname`-relative preload/renderer paths must be computed in `index.ts` and injected into `services/window.ts`.
- After editing contracts, desktop unit tests resolve `@srgnt/contracts` from `dist/` — stale dist causes false preload-sync failures. Clean rebuild (`rm -rf packages/{contracts,runtime}/dist` + `pnpm --filter ... build`) before judging failures.
- `../assets/model` (the extraResources source) did not exist in the repo; the packaged app never actually shipped a model from this tree. Boot-without-model is covered by the worker's `fs.access(modelAssetPath)` fallback ("fallback semantic search").
- Workspace root changes flow through hooks in `services/workspace.ts` (`beforeRootChanged` -> semantic-search watcher stop/teardown, `prepareWorkspace` -> `ensureNotesDir`, `afterRootChanged` -> crash reporter root, notes handler re-registration, semantic-search init), preserving the original `setWorkspaceRootInternal` ordering exactly.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
