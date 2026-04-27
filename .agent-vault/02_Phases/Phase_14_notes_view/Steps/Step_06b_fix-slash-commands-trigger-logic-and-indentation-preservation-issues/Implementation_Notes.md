# Implementation Notes

- Trigger logic fix: Changed validation to check text before slash token start (`word.from`) instead of `pos - 1`
- Indentation fix: Command insertion replaces only slash token range, preserving existing indentation
- Integration fix: Added `normalizeCompletionSources()` helper to wrap all sources in async functions for CodeMirror compatibility
- All 194 tests pass: `pnpm --filter @srgnt/desktop test`

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_06b_fix-slash-commands-trigger-logic-and-indentation-preservation-issues|STEP-14-06b Fix slash commands trigger logic and indentation preservation issues (BUG-0010)]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
