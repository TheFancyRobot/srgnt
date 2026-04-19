---
note_type: step
template_version: 2
contract_version: 1
title: Refactor built-in connectors to register through the shared factory path
step_id: STEP-20-02
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: planned
owner: ''
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Refactor built-in connectors to register through the shared factory path

## Purpose

- Outcome: make Jira, Outlook, and Teams prove the same registration and instantiation path external connector packages will use.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Why This Step Exists

- The current code duplicates built-in connector metadata between package-level manifests and desktop main-process definitions.
- If bundled connectors keep a privileged special path, the public factory contract will be unproven and third-party support will stay theoretical.
- This is the first concrete check that Step 01 created a usable contract instead of a purely abstract type layer.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01]].
- Inspect built-in connector manifests and the desktop connector catalog/bootstrap logic.
- Confirm which built-in definitions still live in `packages/desktop/src/main/index.ts` before editing.

## Relevant Code Paths

- `packages/connectors/src/jira/index.ts`
- `packages/connectors/src/outlook/index.ts`
- `packages/connectors/src/teams/index.ts`
- `packages/connectors/src/index.ts`
- `packages/connectors/src/jira/jira.test.ts`
- `packages/connectors/src/outlook/outlook.test.ts`
- `packages/connectors/src/teams/teams.test.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`
- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/e2e/app.spec.ts`
- `packages/desktop/e2e/ui-coverage-matrix.spec.ts`

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- `packages/connectors/src/{jira,outlook,teams}/index.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`

## Execution Prompt

1. Replace desktop-owned built-in connector duplication with shared factory-backed registrations.
2. Make `packages/connectors` the source of truth for built-in connector definitions.
3. Keep the bundled catalog discoverable by default, but now sourced from shared package definitions.
4. Preserve Phase 19 install-before-use behavior and current UI-visible state semantics.
5. Keep enough fixture support for dev catalogs and tests without reintroducing metadata drift.
6. Add regression coverage that proves built-ins are now created through the shared factory path.

## Implementation Constraints and Non-Goals

- Shared path means shared contract semantics, not shared unrestricted privilege.
- It is acceptable for built-ins to keep temporary host adapters while third-party isolation is still being implemented, but the connector **definition** and registration model must be shared.
- Keep connector IDs stable: `jira`, `outlook`, `teams`.
- Do not redesign connector-specific canonical mapping logic in this step.
- Do not implement remote package installation or CLI behavior here.

## Validation Plan

- Run:
  - `pnpm --filter @srgnt/connectors test`
  - `pnpm --filter @srgnt/desktop test`
  - `pnpm --filter @srgnt/desktop test:e2e`
- Add or update tests that prove:
  - built-in connector definitions come from shared package registrations, not desktop-only duplicates;
  - desktop install/connect/disconnect behavior still works for bundled connectors;
  - UI/e2e flows still show available/installed/connected states correctly.
- If a full e2e run is too slow during iteration, still run it before marking the step complete.

## Edge Cases and Failure Modes

- Desktop main still has a hidden fallback `builtinConnectorDefinitions` path after refactor.
- Built-in manifests drift from shared package definitions or dev catalog fixtures.
- A connector remains visible in the UI but can no longer connect because registration moved incorrectly.
- Shared registration accidentally changes connector IDs, auth metadata, or capability lists.

## Security Considerations

- Required: yes, but lower risk than Step 01/04.
- Do not let first-party convenience APIs expand the public host contract silently.
- Any special handling that remains must be explicitly host/runtime-specific, not a hidden connector-definition privilege path.

## Performance Considerations

- Applicable but modest.
- Avoid repeated manifest construction or duplicate registration scans on every request if a shared static registry can be cached safely.
- Preserve current startup behavior; do not add expensive remote fetches to built-in registration.

## Integration Touchpoints and Downstream Effects

- Step 03 uses the cleaned-up definition model to separate package metadata from connector identity.
- Step 04 relies on shared registrations to unify bundled and remote package handling.
- Existing desktop UI and preload surfaces should continue to work without schema breakage in this step.

## Blockers, Open Decisions, and Handoff Expectations

- Blocker if Step 01 does not clearly define how bundled registrations are exported.
- Handoff must identify exactly which desktop-owned definitions were deleted or reduced and where the new shared registry lives.
- If a temporary compatibility shim remains, document its removal plan in Implementation Notes.

## Junior-Developer Readiness Checklist

- Exact outcome and success condition: **pass** -- built-ins register through the shared factory path and regression tests prove it.
- Why the step matters to the phase: **pass**.
- Prerequisites, setup state, and dependencies: **pass**.
- Concrete starting files, directories, packages, commands, and tests: **pass**.
- Required reading completeness: **pass**.
- Implementation constraints and non-goals: **pass**.
- Validation commands, manual checks, and acceptance mapping: **pass**.
- Edge cases, failure modes, and recovery expectations: **pass**.
- Security considerations or N/A judgment: **pass**.
- Performance considerations or N/A judgment: **pass**.
- Integration touchpoints and downstream effects: **pass**.
- Blockers, unresolved decisions, and handoff expectations: **pass**.
- Junior-developer readiness verdict: **PASS**.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-19
- Next action: Remove desktop-only built-in connector duplication after STEP-20-01 lands.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Evidence to preserve: desktop main currently carries built-in connector metadata separately from `packages/connectors`.
- Existing strong regressions live in connector package tests plus desktop IPC/e2e suites.
- A junior developer should diff `packages/desktop/src/main/index.ts` before and after this step to confirm duplication actually shrank.

## Human Notes

- Treat any remaining desktop-only special casing as a smell unless it is strictly about host/runtime boundaries rather than connector definition itself.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Success means first-party connectors are no longer a separate species; they are registered and created through the same shared factory model external developers will target.
