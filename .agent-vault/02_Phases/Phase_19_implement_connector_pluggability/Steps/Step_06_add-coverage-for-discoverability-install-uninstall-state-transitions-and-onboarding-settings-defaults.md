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

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: lock the connector pluggability model down with automated regression coverage and explicit documentation of any pre-existing unrelated failures.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05]]
- [[01_Architecture/Integration_Map|Integration Map]]
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/e2e/app.spec.ts`

## Companion Notes

- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: team-lead
- Last touched: 2026-04-16
- Next action: None (Step complete); continue to update vault indices/tests metadata if required.
<!-- AGENT-END:step-agent-managed-snapshot -->

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

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
