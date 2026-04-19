---
note_type: step
template_version: 2
contract_version: 1
title: Add CLI install remove inspect commands and end-to-end regression coverage
step_id: STEP-20-05
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: planned
owner: ''
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Add CLI install remove inspect commands and end-to-end regression coverage

## Purpose

- Outcome: ship the CLI-only management surface and lock in the new package platform with regression coverage.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Why This Step Exists

- The user explicitly wants remote installation by CLI first.
- The platform is not shippable until the management workflow and failure cases are validated end to end.
- Existing tests cover built-in connector install/connect UX, but not the new third-party package registry, explicit URL installs, or isolation failure paths.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04]].
- Review the final package registry shape, lifecycle states, and any new host APIs or IPC contracts added earlier in the phase.
- Confirm where the new CLI entrypoint will live, because no connector package-management CLI exists in the repo today.

## Relevant Code Paths

- New CLI entrypoint files added by this phase
- `package.json`
- `TESTING.md`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/dev-connectors/`
- `packages/desktop/e2e/app.spec.ts`
- `packages/desktop/e2e/ui-coverage-matrix.spec.ts`
- `packages/desktop/e2e/packaged.spec.ts`

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- `TESTING.md`
- `package.json`
- `packages/desktop/dev-connectors/catalog.json`
- The package registry and loader implementation added in STEP-20-04

## Execution Prompt

1. Add a CLI-only management workflow for explicit package URL/reference installs with `install`, `remove`, `list`, and `inspect` commands.
2. Route CLI behavior through the same host registry/loader logic created in Step 04; do not create a parallel package-management implementation.
3. Make command output explicit enough to explain install, compatibility, integrity, and activation failures without exposing secrets.
4. Add end-to-end and targeted regression tests for successful install/remove/list/inspect plus the key fail-closed cases.
5. Verify parity where appropriate between bundled connectors and externally installed connectors at the host contract level.
6. Update `TESTING.md` or equivalent docs if new command sequences become required for validation.

## Implementation Constraints and Non-Goals

- CLI v1 default source model is explicit package URL/reference only.
- Do not scope in UI package management here.
- Do not bypass host validation or isolated runtime checks for convenience.
- `inspect` output must not expose tokens, secrets, or unsafe internal state dumps.
- Broad regression is mandatory before this step can be marked done.

## Validation Plan

- Targeted validation during implementation:
  - `pnpm --filter @srgnt/desktop test`
  - `pnpm --filter @srgnt/desktop test:e2e`
- Broad regression before completion:
  - `pnpm test`
  - `pnpm test:e2e`
  - `pnpm test:e2e:packaged:linux`
  - `pnpm run release:check:repo`
- Add or update tests that prove:
  - successful install/remove/list/inspect from explicit package references;
  - package-id mismatch blocks install and reports clearly;
  - integrity/checksum failure blocks activation;
  - incompatible SDK/runtime failure is reported and persisted safely;
  - broken packages remain inspectable and removable;
  - uninstall after load cleans up package artifacts and runtime state.

## Edge Cases and Failure Modes

- CLI reports success for a downloaded package that never verified.
- `inspect` leaks sensitive paths, token-like strings, or internal secret-bearing state.
- `list` does not distinguish installed vs broken vs active packages.
- Remove/uninstall succeeds partially and leaves stale registry entries or artifacts.
- Broad repo regression passes locally but packaged Linux flow fails because the CLI/runtime path is not wired in packaged builds.

## Security Considerations

- Required: yes.
- Command output and logs must be redaction-safe.
- CLI operations must preserve the same fail-closed behavior as the host runtime.
- A CLI convenience path must never skip package integrity validation or worker/subprocess isolation.

## Performance Considerations

- Applicable.
- `list` and `inspect` should use persisted registry state efficiently instead of downloading package artifacts again.
- Broad regression runs are intentionally expensive; note them explicitly so implementers do not omit them by accident.

## Integration Touchpoints and Downstream Effects

- This step is the user-visible MVP for the package platform.
- It depends on Step 04 host services and may require root/package script updates.
- It should leave a clear path for a future UI to consume the same registry data rather than redefine package semantics.

## Blockers, Open Decisions, and Handoff Expectations

- Blocked until Step 04 exposes reusable host APIs for package management.
- If a new CLI package or script is introduced, document where it lives and how it is invoked from the root workspace.
- Handoff must include the final command syntax, expected output examples, and the exact regression suite run before marking complete.

## Junior-Developer Readiness Checklist

- Exact outcome and success condition: **pass** -- CLI management surface exists and is protected by targeted + broad regression coverage.
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
- Next action: Ship the CLI workflow and full regression matrix after the host runtime is implemented.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Validation must cover: bad manifest, package ID mismatch, checksum/integrity failure, incompatible host SDK/runtime version, install cleanup, and uninstall after load.
- No connector package-management CLI exists in the repo yet, so this step likely creates a new entrypoint and root script wiring.
- A junior developer should capture sample `install`, `list`, `inspect`, and `remove` outputs as part of validation notes.

## Human Notes

- Resist adding UI management in this step; capture UI ideas as follow-up work after the CLI path proves the model.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Success means a user can remotely install and manage connector packages from the CLI, and the core safety/compatibility invariants are protected by tests.
