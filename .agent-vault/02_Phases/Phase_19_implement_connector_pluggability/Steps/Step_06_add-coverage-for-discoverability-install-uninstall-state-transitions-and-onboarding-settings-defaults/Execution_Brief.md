# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Phase 19 changes the connector mental model across contracts, settings, main process, preload, renderer, and onboarding defaults.
- Without focused tests, the repo could easily regress back to “bundled means enabled” or silently break migration/install transitions.
- This phase is only done when install-before-use and no-default-installed-connectors are enforceable, not just described.

## Prerequisites

- Complete Steps 01-05 for this phase.
- Review existing contract, settings, renderer, and desktop E2E tests before adding new ones.
- Start from a clean run so any unrelated failures can be clearly identified as pre-existing.

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/src/renderer/components/ConnectorStatus.test.tsx`
- `packages/desktop/src/renderer/components/Settings.test.tsx`
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.test.tsx`
- `packages/desktop/e2e/app.spec.ts`
- `packages/desktop/e2e/ui-coverage-matrix.spec.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/renderer/main.tsx`

## Execution Prompt

1. Add or update contract tests so the connector list and settings schema reflect the new install-state defaults and migration behavior.
2. Add desktop unit/integration tests for install, uninstall, connect-before-install rejection, and uninstall cleanup behavior.
3. Extend renderer/component tests so the visible UI states and action labels cover available, installed, connected, and error cases.
4. Add or update desktop E2E coverage for first-run defaults and at least one install/uninstall happy path.
5. Record any unrelated pre-existing failures explicitly; do not weaken assertions to make the suite look green.
6. Finish with a clear pass/fail summary that states whether the install-before-use invariant is fully protected.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
