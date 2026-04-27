# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- Automated tests prove that discoverable connectors are listed even when nothing is installed.
- Fresh defaults prove zero installed connectors.
- Install, connect, disconnect, and uninstall transitions behave distinctly and regressions are caught quickly.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] defines the boundary the tests must protect: renderer sees safe summary state only, main owns privileged behavior.
- The most important assertions are semantic, not cosmetic: no default install, install-before-use, safe uninstall cleanup, and truthful migration.
- Keep tests close to the layer they protect; do not rely only on broad E2E coverage.
- If unrelated E2E failures remain, document them exactly and keep the new assertions runnable where possible.

**Starting files and likely touch points:**
- `packages/contracts/src/ipc/contracts.test.ts` for schema/default behavior.
- `packages/desktop/src/main/settings.test.ts` for persisted install-state and migration.
- `packages/desktop/src/main/index.ts` only where contract/main-process payload behavior is asserted.
- Existing renderer component tests for visible state/action labels.
- `packages/desktop/e2e/app.spec.ts` and/or `packages/desktop/e2e/ui-coverage-matrix.spec.ts` for realistic flow coverage.

**Constraints and non-goals:**
- Do not replace behavioral assertions with snapshots only.
- Do not mark install-before-use as “manual only” if a unit/integration assertion can enforce it.
- Do not hide unrelated failures; classify them.
- Do not mutate product behavior just to simplify tests unless the behavior change is separately justified.

**Edge cases and failure modes:**
- Legacy settings migration with one connector previously true.
- Fresh settings file absent or partially missing.
- Connect attempted before install.
- Uninstall while connected or in error state.
- Workspace switch after install/uninstall actions.

**Security:**
- Tests must continue to enforce that only safe summary state is visible in renderer-facing contracts.
- No new test fixture should require embedding real secrets.

**Performance:**
- Prefer narrow, deterministic tests over flaky long-path coverage where possible.
- E2E should prove the flow once; unit/integration tests should carry most combinatorial coverage.

### Readiness packet (handoff)

- **Starting files:** `packages/contracts/src/ipc/contracts.test.ts`, `packages/desktop/src/main/settings.test.ts`, `packages/desktop/src/main/index.ts`, `packages/desktop/src/renderer/components/ConnectorStatus.test.tsx`, `packages/desktop/src/renderer/components/Settings.test.tsx`, `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.test.tsx`, `packages/desktop/e2e/app.spec.ts`, and `packages/desktop/e2e/ui-coverage-matrix.spec.ts`.
- **Success condition:** all targeted tests show that discoverability is independent from install/connect, fresh install state is empty, connect-before-install is rejected, and uninstall returns connectors to discoverable/uninstalled state while preserving safe main-process auth boundary assumptions.
- **Blockers:** none inside Step 06; execution is blocked only by incomplete Step 03/04/05 APIs or pending runtime behavior in the main process.
- **Edge/failure cases to validate:** malformed legacy migration inputs, connect-before-install rejection, uninstall while connected, and stale workspace switching that could rehydrate phantom install state.
- **Validation expectations:**
  1. `pnpm -C packages/contracts test`
  2. `pnpm -C packages/desktop test`
  3. `pnpm -C packages/desktop test:e2e` (or current desktop E2E command)
  4. Record full-suite totals only if required, and explicitly call out pre-existing failures not introduced by these tests.
- **Downstream effect:** Step 06 completion gives implementation an audit-safe test suite that protects Phase 19 invariants before full rollout.

**Validation (for implementation):**
1. `pnpm -C packages/contracts test`
2. `pnpm -C packages/desktop test`
3. `pnpm -C packages/desktop test:e2e` or the project’s current desktop E2E command
4. If full-suite totals are part of the current team standard, record the resulting desktop/runtime/E2E totals and call out pre-existing unrelated failures explicitly.

**Junior-readiness verdict:** PASS — the test plan is explicit, layered, and focused on the actual invariants that matter.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
