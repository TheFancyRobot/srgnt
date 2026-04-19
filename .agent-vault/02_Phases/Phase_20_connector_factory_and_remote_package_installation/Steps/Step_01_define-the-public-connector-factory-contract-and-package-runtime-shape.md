---
note_type: step
template_version: 2
contract_version: 1
title: Define the public connector factory contract and package runtime shape
step_id: STEP-20-01
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: planned
owner: ''
created: '2026-04-19'
updated: '2026-04-19'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-19-063125-define-the-public-connector-factory-contract-and-package-runtime-shape-team-lead|SESSION-2026-04-19-063125 team-lead session for Define the public connector factory contract and package runtime shape]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Define the public connector factory contract and package runtime shape

## Purpose

- Outcome: freeze the SDK contract that both bundled and third-party connectors must implement.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Why This Step Exists

- The repo currently has base connector classes but no public factory abstraction a third-party package could target safely.
- If runtime/package decisions are invented piecemeal during implementation, built-ins and external packages will drift immediately.
- Every later step depends on this note defining one exact answer to: “What does a connector package export, what host APIs exist, and which lifecycle states are real?”

## Prerequisites

- Read the Phase 20 note and [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]].
- Read [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]] and assume third-party packages run outside Electron main.
- Inspect `packages/connectors/src/sdk/connector.ts`, `packages/contracts/src/connectors/manifest.ts`, and `packages/desktop/src/main/index.ts` before editing.
- Confirm no code is written for Step 02, Step 03, or Step 04 until this contract is stable enough to reference directly.

## Relevant Code Paths

- `packages/connectors/src/sdk/connector.ts`
- `packages/connectors/src/sdk/index.ts`
- `packages/connectors/src/index.ts`
- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/connectors/manifest.test.ts`
- `packages/connectors/src/sdk/connector.test.ts`
- `packages/desktop/src/main/index.ts`
- `.agent-vault/01_Architecture/Connector_Package_Runtime.md`
- `.agent-vault/06_Shared_Knowledge/srgnt_framework_adr004_connector_contract.md`

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/connectors/src/sdk/connector.ts`
- `packages/contracts/src/connectors/manifest.ts`
- `packages/connectors/src/sdk/connector.test.ts`
- `packages/contracts/src/connectors/manifest.test.ts`

## Execution Prompt

1. Define a public connector factory interface that creates a connector instance from validated package metadata plus a narrow host-provided runtime context.
2. Define the package entrypoint shape for v1. It must expose manifest + factory + compatibility/version metadata, not arbitrary initialization hooks.
3. Define explicit lifecycle states shared by the host and package contract: installed, verified, activated, loaded, connected, errored.
4. Define which host capabilities can be requested or injected. Do **not** pass raw Electron, Node, filesystem, or secret-store access.
5. Extend contracts only as far as needed for runtime compatibility, lifecycle, and minimal package metadata needed by later steps.
6. Update ADR-004 or link a companion note if the current architecture language is too vague for implementation.
7. Add focused contract/SDK tests before moving on.

## Implementation Constraints and Non-Goals

- Third-party package execution target is a worker/subprocess boundary, not Electron main.
- The public contract must be versioned so the host can reject incompatible packages before activation.
- Keep `ConnectorManifest` focused on connector identity/capabilities; if package runtime metadata needs a separate schema, introduce one instead of overloading manifest fields blindly.
- Do not design the factory around built-in-only shortcuts.
- Do not add package download/install logic in this step.
- Do not expose auth/session secret types directly to connector packages.

## Validation Plan

- Run:
  - `pnpm --filter @srgnt/connectors test`
  - `pnpm --filter @srgnt/contracts test`
  - `pnpm --filter @srgnt/connectors typecheck`
  - `pnpm --filter @srgnt/contracts typecheck`
- Add or update tests that prove:
  - a valid package entrypoint shape is accepted;
  - a malformed entrypoint shape is rejected;
  - compatibility/version mismatch is representable and rejectable;
  - lifecycle types distinguish installed/verified/loaded/connected states;
  - the host context type exposes only narrow approved services.
- This step is not complete if only types compile but no test asserts the public contract shape.

## Edge Cases and Failure Modes

- Package entrypoint exists but exports the wrong symbol names.
- Manifest ID and package ID differ.
- Package declares capabilities the host contract cannot satisfy.
- Package targets a newer runtime API or incompatible host SDK range.
- Contract accidentally exposes token-bearing auth/session types or generic Node access.
- Built-ins require undocumented extra context that third parties would not receive.

## Security Considerations

- Required: yes. This step defines the public attack surface for third-party packages.
- Explicitly fail closed on version mismatch, malformed entrypoint shape, and undeclared capability use.
- Make capability requests declarative and host-enforced.
- Keep secrets, filesystem writes, OS APIs, and arbitrary network behavior behind explicit host-owned boundaries.

## Performance Considerations

- Applicable, but lightweight in this step.
- Keep the factory contract small and serialization-friendly so it can cross a worker/subprocess boundary cleanly.
- Avoid host context designs that require large object graphs or stateful singleton injection.

## Integration Touchpoints and Downstream Effects

- Step 02 depends on this contract for built-in registration.
- Step 03 depends on it for package compatibility and metadata fields.
- Step 04 depends on it for worker/subprocess loader handshake behavior.
- Step 05 depends on it for CLI inspect output and failure diagnostics.

## Blockers, Open Decisions, and Handoff Expectations

- No blocker remains on execution isolation; [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]] resolved it.
- If a separate package-runtime schema is introduced, link it from the phase note before handoff.
- Handoff must include exact exported symbols, file locations, and a one-paragraph contract summary for the next step owner.

## Junior-Developer Readiness Checklist

- Exact outcome and success condition: **pass** -- define one public, versioned connector package contract with tests.
- Why the step matters to the phase: **pass** -- every later step depends on this contract.
- Prerequisites, setup state, and dependencies: **pass** -- listed above.
- Concrete starting files, directories, packages, commands, and tests: **pass** -- listed above.
- Required reading completeness: **pass**.
- Implementation constraints and non-goals: **pass**.
- Validation commands, manual checks, and acceptance mapping: **pass**.
- Edge cases, failure modes, and recovery expectations: **pass**.
- Security considerations or N/A judgment: **pass** -- explicitly required.
- Performance considerations or N/A judgment: **pass** -- scoped and documented.
- Integration touchpoints and downstream effects: **pass**.
- Blockers, unresolved decisions, and handoff expectations: **pass**.
- Junior-developer readiness verdict: **PASS**.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-19
- Next action: Freeze the public factory API before any runtime or CLI work starts.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Evidence to preserve: `packages/connectors/src/sdk/connector.ts` currently exposes base classes only; no factory/registry abstraction exists.
- Existing validation anchors: `packages/connectors/src/sdk/connector.test.ts` and `packages/contracts/src/connectors/manifest.test.ts`.
- A junior developer should start by writing down the intended exported symbols before editing any code.

## Human Notes

- This step should end with a junior developer being able to answer: “What exactly must a connector package export, and what does the host promise to provide?”
- If the answer still requires tribal knowledge or chat history, the step is not refined enough.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-19 - [[05_Sessions/2026-04-19-063125-define-the-public-connector-factory-contract-and-package-runtime-shape-team-lead|SESSION-2026-04-19-063125 team-lead session for Define the public connector factory contract and package runtime shape]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Success means the repo has one documented, test-backed connector factory contract and package entrypoint shape that later steps can implement without guessing.
- The expected deliverable is a stable contract, not a partial loader implementation.
