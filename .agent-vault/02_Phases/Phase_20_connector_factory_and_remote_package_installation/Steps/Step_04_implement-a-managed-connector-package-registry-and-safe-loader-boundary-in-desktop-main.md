---
note_type: step
template_version: 2
contract_version: 1
title: Implement a managed connector package registry and safe loader boundary in desktop main
step_id: STEP-20-04
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: planned
owner: ''
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-02
  - STEP-20-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Implement a managed connector package registry and safe loader boundary in desktop main

## Purpose

- Outcome: add the host-side package registry and loading path that turns remote package metadata into safely loadable connector instances.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Why This Step Exists

- This is where the factory contract and CLI install design become a real runtime subsystem.
- It is also the main security boundary: third-party connector packages must not execute in renderer/preload or gain broad unmediated Electron access.
- Without this step, Phase 20 remains a planning exercise rather than an actual pluggable package platform.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02]] and [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle|STEP-20-03]].
- Re-read [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]] before implementation.
- Review current connector IPC/install handlers and settings persistence.

## Relevant Code Paths

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/connectors/src/sdk/connector.ts`
- `packages/connectors/src/index.ts`

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`

## Execution Prompt

1. Implement a managed package registry that stores durable installed package records separate from simple connector install intent.
2. Build the third-party loader path around a worker/subprocess boundary, not direct Electron main execution.
3. Add a fail-closed loader handshake that validates package compatibility, integrity, and entrypoint shape before activation.
4. Ensure renderer/preload only receive high-level connector/package state and never executable package access.
5. Keep install, verified, activated, loaded, connected, and error states independently derivable for diagnostics and future UI surfaces.
6. Make uninstall cleanup remove runtime state and managed artifacts cleanly.
7. Add focused tests for mismatched IDs, incompatible versions, failed worker/subprocess startup, failed load handshake, restart recovery, and uninstall cleanup.

## Implementation Constraints and Non-Goals

- Third-party connector packages must run outside Electron main.
- Desktop main remains the privileged owner of package verification records, secure storage, auth/session orchestration, and typed IPC.
- Do not pass raw Electron/Node/global process objects into the package runtime.
- Preserve Phase 19 behavior for bundled connectors while extending the system underneath it.
- Do not build the CLI surface yet; this step provides the host runtime Step 05 will call.

## Validation Plan

- Run:
  - `pnpm --filter @srgnt/desktop test`
  - `pnpm --filter @srgnt/desktop typecheck`
  - `pnpm --filter @srgnt/contracts test`
  - `pnpm --filter @srgnt/connectors test`
- Add or update tests that prove:
  - an invalid package never reaches activation;
  - a worker/subprocess startup or handshake failure leaves the package disabled/broken instead of half-loaded;
  - uninstall removes package artifacts and clears runtime state;
  - restart logic does not auto-reactivate broken packages without revalidation;
  - preload/renderer continue to consume only typed high-level state.

## Edge Cases and Failure Modes

- Package verifies on disk but the worker/subprocess fails to boot.
- Worker/subprocess boots but exports an incompatible runtime handshake.
- Package crashes after activation and must be marked broken without taking down the desktop app.
- Registry record exists but artifact path is missing or corrupted on restart.
- Uninstall runs while the package is loaded or connected.
- Built-in connectors continue working while third-party runtime is disabled or partially migrated.

## Security Considerations

- Required: highest-priority step.
- This is the step that prevents remote install from becoming privileged main-process code execution.
- Secret-bearing auth/session state must remain host-owned per [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010]].
- Logs, crash output, and diagnostics from the isolated runtime must be redaction-safe.
- Loader and registry behavior must fail closed on missing integrity data, runtime mismatch, or startup failure.

## Performance Considerations

- Applicable.
- Startup should derive package state from the registry efficiently without repeatedly fetching remote sources.
- Package activation should be lazy or bounded so installed-but-unused connectors do not degrade app startup excessively.
- Crash/restart handling should avoid tight restart loops for broken packages.

## Integration Touchpoints and Downstream Effects

- Step 05 depends directly on the registry and loader APIs from this step.
- IPC contract updates may be needed if inspect/list state becomes richer.
- Settings persistence and migration tests must evolve with the new registry structure.
- Built-in connectors from Step 02 must continue to function while the host runtime expands.

## Blockers, Open Decisions, and Handoff Expectations

- Blocked if Step 03 has not defined concrete package record fields and state names.
- If a new `packages/desktop/src/main/connectors/*` module structure is introduced, note it explicitly so future contributors do not keep adding logic back into `main/index.ts`.
- Handoff must include the registry schema location, loader entrypoints, activation flow, and a list of failure paths covered by tests.

## Junior-Developer Readiness Checklist

- Exact outcome and success condition: **pass** -- host registry + isolated loader boundary implemented with fail-closed tests.
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
- Next action: Build the host-side registry and loader after contract + install design settle.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Highest-risk area: remote install becoming arbitrary code execution in privileged Electron surfaces.
- Existing desktop tests already cover install-before-connect behavior but do not yet cover managed package registry or isolated runtime failure handling.
- A junior developer should start this step by drawing the activation state machine and matching each state transition to a test.

## Human Notes

- If a subprocess/worker boundary is needed for safety, that is no longer optional for third parties; it is the default path per [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]].

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Success means the desktop host can manage installed connector packages safely and produce connector instances without collapsing trust boundaries.
