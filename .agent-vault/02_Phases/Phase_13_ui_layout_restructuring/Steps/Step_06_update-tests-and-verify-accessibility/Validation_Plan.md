# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: Existing tests are updated for the new shell, new component tests cover ActivityBar/LayoutContext/SidePanel behavior, app-level smoke coverage exists for the reworked layout, and the accessibility/manual validation checklist is completed or explicitly marked blocked with a reason.
- Why this step matters to the phase: Phase 13 changes the core shell, so the phase is not credible without automated regression coverage and a documented accessibility verification pass.
- Prerequisites, setup state, and dependencies: Steps 04 and 05 complete; the new shell, side panels, settings refactor, and persistence scope are stable enough to test without moving targets.
- Concrete starting files, directories, packages, commands, and tests: Start in `packages/desktop/src/renderer/components/*.test.tsx`, `packages/desktop/src/renderer/test-utils.tsx`, `packages/desktop/vitest.config.ts`, `packages/desktop/src/test-setup.ts`, `packages/desktop/e2e/app.spec.ts`, and `packages/desktop/e2e/fixtures.ts`; run `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop typecheck`, `pnpm --filter @srgnt/desktop build:renderer`, and `pnpm --filter @srgnt/desktop test:e2e` when feasible.
- Required reading completeness: Pass. The note points to existing test files, test infrastructure, the architecture note, and the WAI-ARIA toolbar interaction model.
- Implementation constraints and non-goals: Focus on tests and verification only; do not reopen product decisions already fixed in earlier steps; if E2E or screen-reader tooling is unavailable, document the blocker instead of silently skipping coverage.
- Validation commands, manual checks, and acceptance criteria mapping: The component tests, app-level shell smoke path, manual accessibility checklist, renderer build, and optional-but-documented E2E run together cover the phase acceptance criteria for accessibility, preserved view rendering, and layout behavior.
- Edge cases, failure modes, and recovery expectations: Missing provider errors, outdated E2E selectors, terminal-shortcut coverage, persistence-scope regressions, and unavailable assistive tooling are all accounted for above.
- Security considerations or explicit not-applicable judgment: Not applicable for production behavior. This step adds tests and validation only.
- Performance considerations or explicit not-applicable judgment: Not applicable for runtime performance, but the test suite should stay targeted before broader smoke/E2E runs.
- Integration touchpoints and downstream effects: This step verifies the results of Steps 03-05 and may require small test-harness helpers shared across renderer component tests.
- Blockers, unresolved decisions, and handoff expectations: No open design blockers remain; only environment blockers such as unavailable screen-reader or Electron E2E support may remain, and those must be recorded explicitly in the outcome summary.
- Junior-developer readiness verdict: PASS - the note now makes app-level smoke coverage and blocked-validation reporting explicit, which closes the biggest verification gaps from the earlier refinement.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06 Update tests and verify accessibility]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
