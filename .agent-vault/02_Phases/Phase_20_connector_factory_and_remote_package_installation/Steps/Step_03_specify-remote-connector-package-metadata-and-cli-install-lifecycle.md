---
note_type: step
template_version: 2
contract_version: 1
title: Specify remote connector package metadata and CLI install lifecycle
step_id: STEP-20-03
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

# Step 03 - Specify remote connector package metadata and CLI install lifecycle

## Purpose

- Outcome: define how a remote connector package is fetched, verified, installed, inspected, and removed through a CLI-only v1 workflow.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Why This Step Exists

- The repo can already fetch remote manifest JSON in development, but there is no durable package record or CLI installation lifecycle yet.
- Without a clear install lifecycle, Step 04 would invent persistence and trust behavior ad hoc.
- This step turns “remote package” from an idea into a concrete record model that a junior developer can persist, validate, inspect, and clean up.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01]].
- Review existing dev catalog/package fixtures and current install-state persistence.
- Assume the user-approved v1 default: CLI install uses an explicit package URL/reference only, not catalog-first discovery.

## Relevant Code Paths

- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/dev-connectors/packages/*.json`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/connectors/manifest.test.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/contracts/src/ipc/contracts.ts`

## Execution Prompt

1. Define the remote package metadata record and decide whether it should be a separate schema from `ConnectorManifest`.
2. The durable installed-package record must include at least: source URL/reference, package id, connector id, package version, runtime API version or range, host SDK compatibility, integrity/checksum fields, install root/path, installedAt, verification status, activation status, and last failure state.
3. Specify the CLI-only command set for v1: `install`, `remove`, `list`, and `inspect`.
4. Define canonical install/runtime lifecycle states clearly and align them with the phase invariants: installed, verified, activated, loaded, connected, and error. If additional diagnostic sub-states such as fetched or broken/disabled are needed, define them as transitional or explanatory metadata rather than replacing the canonical states.
5. Define fail-closed behavior for ID mismatch, bad checksum, incompatible SDK/runtime, malformed entrypoint, interrupted install, and uninstall cleanup.
6. Make the user-visible lifecycle explicit enough that a future UI can manage the same durable records without migration.

## Implementation Constraints and Non-Goals

- Default source model for v1 is an explicit package URL/reference only.
- Catalog-first discovery, search, and in-app browsing are out of scope.
- Keep install-time package metadata separate from runtime connected/auth state.
- Do not collapse “installed” into “activated” or “loaded”.
- Do not rely on warning-only behavior; any integrity or compatibility failure must block activation.
- Do not expose secrets in `inspect` output or persisted package metadata.

## Validation Plan

- Run:
  - `pnpm --filter @srgnt/contracts test`
  - `pnpm --filter @srgnt/desktop test`
  - `pnpm --filter @srgnt/contracts typecheck`
  - `pnpm --filter @srgnt/desktop typecheck`
- Add or update tests that prove:
  - package metadata records validate correctly;
  - settings persistence/migration can round-trip the new package registry shape;
  - canonical lifecycle states are representable without ambiguity and any sub-state metadata does not conflict with them;
  - package-id mismatch, bad checksum, and compatibility mismatch all fail closed;
  - partial installs leave recoverable or cleanly removable state.

## Edge Cases and Failure Modes

- A package downloads successfully but checksum verification fails.
- Manifest connector ID and package metadata connector ID disagree.
- Host SDK or runtime API range excludes the current desktop build.
- Artifact write succeeds but activation metadata write fails.
- `inspect` must explain why a package is broken/disabled without exposing sensitive data.
- Uninstall removes package files but leaves stale registry or runtime state behind.

## Security Considerations

- Required: yes.
- This step defines the minimum metadata required to treat remote install as a code-trust event rather than simple manifest ingestion.
- Integrity metadata is mandatory for v1 planning.
- `inspect` and `list` output must be safe for local logs and bug reports.
- Persist only non-secret package state; auth/session cleanup remains a host concern.

## Performance Considerations

- Applicable, but secondary.
- Package metadata should be cheap to read and diff during startup.
- Avoid designs that require downloading or reparsing remote package artifacts on every app launch just to determine installed state.

## Integration Touchpoints and Downstream Effects

- Step 04 uses this package record for the managed registry and loader boundary.
- Step 05 uses the CLI verbs and state names defined here directly.
- `packages/desktop/src/main/settings.ts` is the likely persistence layer that must evolve beyond `installedConnectorIds`.

## Blockers, Open Decisions, and Handoff Expectations

- No blocker remains on source model; v1 defaults to explicit package URL/reference only.
- If this step introduces new contract types, link them back into the phase and architecture note before handoff.
- Handoff must include exact field names and state transitions, not only prose descriptions.

## Junior-Developer Readiness Checklist

- Exact outcome and success condition: **pass** -- define a durable package record and CLI lifecycle with tests.
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
- Next action: Freeze the remote package metadata and CLI verbs in parallel with STEP-20-02 once STEP-20-01 lands.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Evidence to preserve: current install flow validates manifest shape and package ID, but not executable package integrity or host compatibility.
- Existing durable persistence only stores `connectors.installedConnectorIds`; that is insufficient for this step.
- A junior developer should start by writing an example installed-package record and confirming every field has an owner and lifecycle transition.

## Human Notes

- Recommended default for v1 remains explicit URL/reference install plus integrity metadata, not general discovery.
- If a field is only needed for UI convenience and not correctness, defer it unless it prevents future inspect/list behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Success means a developer can describe exactly what a remote connector install record contains and which CLI commands manage it before any loader code is written.
