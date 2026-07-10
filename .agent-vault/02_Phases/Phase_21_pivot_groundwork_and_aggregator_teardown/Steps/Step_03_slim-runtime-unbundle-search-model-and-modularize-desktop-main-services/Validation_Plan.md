# Validation Plan

## Commands

- `pnpm typecheck && pnpm test && pnpm test:e2e`
- `pnpm test:e2e:packaged:linux` (packaged smoke — proves the unbundled model doesn't break boot)
- `du -sh packages/desktop/release/*unpacked*` before/after — artifact shrinks by roughly the model size.
- `wc -l packages/desktop/src/main/index.ts` — composition root only (target ≲200 lines).

## Acceptance Checks

- Terminal approval flow works end to end (manual: run a command through TerminalPanel; approval prompt, run log, redaction behave as before).
- Notes and settings IPC behavior unchanged (existing tests pass unmodified).
- No `@srgnt/runtime` export is imported by nothing (dead exports removed).

## Edge Cases

- `semantic-search/worker.ts` dynamically imports `@srgnt/runtime` — that path must keep compiling; the worker fails soft with a clear "model not bundled" state, never a crash.
- `SEMANTIC_SEARCH_VALIDATION.md` references bundled-model behavior — annotate as parked rather than deleting history.

## Regression Expectations

- Zero user-visible change in the slim shell. This step is pure internal restructuring; any E2E diff is a defect.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
