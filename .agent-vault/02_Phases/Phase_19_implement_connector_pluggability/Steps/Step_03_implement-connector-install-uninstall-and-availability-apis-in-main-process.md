---
note_type: step
template_version: 2
contract_version: 1
title: Implement connector install/uninstall and availability APIs in main process
step_id: STEP-19-03
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-02
related_sessions:
  - '[[05_Sessions/2026-04-16-225955-implement-connector-install-uninstall-and-availability-apis-in-main-process-executor-1|SESSION-2026-04-16-225955 executor-1 session for Implement connector install/uninstall and availability APIs in main process]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Implement connector install/uninstall and availability APIs in main process

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: add explicit install/uninstall control in the main process and make runtime connector state derive from **catalog + installed settings + live connection state**.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Why This Step Exists

- After Step 02, installation intent can be persisted honestly, but the main process still uses `connect` / `disconnect` as a proxy for installation.
- The desktop app needs an API surface that lets the renderer say “install this connector” without immediately authenticating it.
- This is also where install-before-use becomes enforceable: connect flows must reject uninstalled connectors.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]].
- Review how connector state is currently derived and where `connectorState` is mutated in `packages/desktop/src/main/index.ts`.
- Understand the secret boundary in [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`

## Execution Prompt

1. Add explicit IPC channel definitions for connector installation and uninstallation.
2. Implement main-process install and uninstall handlers that mutate only persisted install state plus the in-memory connector runtime state derived from it.
3. Ensure install returns an **installed but disconnected** connector unless some later explicit connect/auth action occurs.
4. Ensure uninstall removes installation intent and clears any in-memory connected/error/freshness state so the connector returns to a discoverable-but-uninstalled posture.
5. Update existing `connect` / `disconnect` handlers so they no longer stand in for installation. If a connector is not installed, connect must reject or fail closed with a clear error.
6. Keep availability derived from the bundled catalog. Do not add renderer wiring in this step.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-16
- Next action: Add install/uninstall handlers and guard connect/disconnect behind installation.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- `connector:install` and `connector:uninstall` exist as first-class desktop APIs.
- `connector:list` and `connector:status` reflect catalog discoverability separately from installation.
- `connector:connect` and `connector:disconnect` no longer implicitly install or uninstall connectors.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] remains the architecture boundary: catalog/install actions may cross preload, but auth/session secrets stay in main.
- Install is a workspace configuration change; connect is a runtime/auth change.
- Uninstall should clear runtime state that would mislead the UI (connected status, last sync, last error, entity counts) unless a stronger reason is documented.
- Unknown or uninstalled connector IDs must fail closed with a clear main-process error.

**Starting files and likely touch points:**
- `packages/contracts/src/ipc/contracts.ts` for channel definitions.
- `packages/desktop/src/main/index.ts` for handler registration, connector state derivation, and guard logic.
- `packages/desktop/src/main/settings.ts` only if helper functions are needed for install-state persistence.
- Existing tests near `packages/contracts/src/ipc/contracts.test.ts` and `packages/desktop/src/main/settings.test.ts`.

**Constraints and non-goals:**
- Do not expose secrets or auth session details to the renderer.
- Do not let install automatically call connect/auth.
- Do not let uninstall silently leave a connector marked connected.
- Do not wire preload or renderer yet; that is Step 05.

**Edge cases and failure modes:**
- Installing an already installed connector should be idempotent.
- Uninstalling an uninstalled connector should be safe and explicit.
- Connecting before install must fail predictably.
- Workspace-not-set and settings-write-failure paths must leave runtime state consistent.

**Security:**
- Main process remains the only place that can mutate install state and future auth state.
- Errors returned to the renderer should be safe and non-secret.

**Performance:**
- Recompute only the small connector state map; no reason for heavyweight reload work.
- Prefer deterministic helper functions that can be unit tested without booting Electron windows.

**Validation:**
1. `pnpm -C packages/contracts test -- --filter ipc`
2. `pnpm -C packages/desktop test -- --filter connector`
3. Manual smoke via desktop app or handler-level harness:
   - install connector -> listed as installed but disconnected
   - connect installed connector -> connected
   - uninstall connected connector -> listed as available/uninstalled and no longer connected
   - connect uninstalled connector -> rejected

**Junior-readiness verdict:** PASS — the step is small enough if the implementer keeps install and connect semantics separate.

## Human Notes

- If this step uncovers a missing reusable helper for “derive connector runtime state from catalog + settings”, add the helper here rather than scattering the logic further.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-225955-implement-connector-install-uninstall-and-availability-apis-in-main-process-executor-1|SESSION-2026-04-16-225955 executor-1 session for Implement connector install/uninstall and availability APIs in main process]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the main process owns a truthful install/uninstall lifecycle and enforces install-before-use.
- Validation target: install, connect, disconnect, and uninstall each do one thing and only one thing.
- Follow-up splits into UI refactor work in [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04]] and wiring work in [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05]].