---
note_type: step
template_version: 2
contract_version: 1
title: Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults
step_id: STEP-19-06
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: reviewer
created: '2026-04-16'
updated: '2026-04-17'
depends_on:
  - STEP-19-01
  - STEP-19-02
  - STEP-19-03
  - STEP-19-04
  - STEP-19-05
related_sessions:
  - '[[05_Sessions/2026-04-16-231734-add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults-executor-1|SESSION-2026-04-16-231734 executor-1 session for Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]]'
  - '[[05_Sessions/2026-04-16-232508-add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults-executor-1|SESSION-2026-04-16-232508 executor-1 session for Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]]'
related_bugs:
  - '[[03_Bugs/BUG-0016_migrateconnectorsettings-passes-unknown-ids-through-migration-filter|BUG-0016 migrateConnectorSettings passes unknown IDs through migration filter]]'
tags:
  - agent-vault
  - step
---

# Step 06 - Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: lock the connector pluggability model down with automated regression coverage and explicit documentation of any pre-existing unrelated failures.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

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

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05]]
- [[01_Architecture/Integration_Map|Integration Map]]
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/e2e/app.spec.ts`

## Execution Prompt

1. Add or update contract tests so the connector list and settings schema reflect the new install-state defaults and migration behavior.
2. Add desktop unit/integration tests for install, uninstall, connect-before-install rejection, and uninstall cleanup behavior.
3. Extend renderer/component tests so the visible UI states and action labels cover available, installed, connected, and error cases.
4. Add or update desktop E2E coverage for first-run defaults and at least one install/uninstall happy path.
5. Record any unrelated pre-existing failures explicitly; do not weaken assertions to make the suite look green.
6. Finish with a clear pass/fail summary that states whether the install-before-use invariant is fully protected.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: team-lead
- Last touched: 2026-04-16
- Next action: None (Step complete); continue to update vault indices/tests metadata if required.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

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
## Human Notes

- If E2E turns out to be the only blocked layer, do not block the whole phase on it silently; record the exact failing spec and whether unit/integration coverage already protects the invariant.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16: Completed installability regression coverage pass for Phase 19-06.
  - Updated `packages/contracts/src/ipc/contracts.ts` and `packages/contracts/src/ipc/contracts.test.ts` to enforce array-based connector prefs with defaults (`readonly ("jira" | "outlook" | "teams")[]`).
  - Updated `packages/desktop/src/main/settings.ts` and `packages/desktop/src/main/settings.test.ts` migration/fallback logic.
  - Updated renderer layer (`ConnectorStatus`, `Settings`, `ConnectorsSidePanel`) and tests for discoverable/installed/install-uninstall/action semantics.
  - Ran validation: `pnpm -C packages/contracts test`, `pnpm -C packages/desktop test`, `pnpm -C packages/desktop test -- src/renderer/components/ConnectorStatus.test.tsx ...`, and `pnpm -C packages/desktop exec playwright test e2e/ui-coverage-matrix.spec.ts`.
- 2026-04-16 - [[05_Sessions/2026-04-16-231734-add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults-executor-1|SESSION-2026-04-16-231734 executor-1 session for Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]] - Session created.
- 2026-04-16 - [[05_Sessions/2026-04-16-232508-add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults-executor-1|SESSION-2026-04-16-232508 executor-1 session for Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means install-before-use and no-default-installed-connectors are enforced by tests, not just prose.
- Validation target: a fresh workspace starts empty, installation is explicit, connection is guarded, and uninstall restores the discoverable-but-uninstalled state.
- Successful completion closes Phase 19 from a regression-risk standpoint.