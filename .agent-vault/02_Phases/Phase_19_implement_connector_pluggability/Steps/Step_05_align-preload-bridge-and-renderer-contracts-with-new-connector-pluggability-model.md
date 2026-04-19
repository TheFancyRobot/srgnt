---
note_type: step
template_version: 2
contract_version: 1
title: Align preload bridge and renderer contracts with new connector pluggability model
step_id: STEP-19-05
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-03
  - STEP-19-04
related_sessions:
  - '[[05_Sessions/2026-04-16-232215-align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model-executor-1|SESSION-2026-04-16-232215 executor-1 session for Align preload bridge and renderer contracts with new connector pluggability model]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Align preload bridge and renderer contracts with new connector pluggability model

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: wire the new install/uninstall lifecycle cleanly through preload and renderer orchestration so the UI can use real desktop APIs without type drift or stale semantics.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Why This Step Exists

- Step 03 introduces the main-process truth and Step 04 updates the presentational UI, but the preload API and top-level renderer state still reflect the old toggle-first connector model.
- `packages/desktop/src/renderer/main.tsx` currently refreshes connector state via `connectConnector`, `disconnectConnector`, and settings saves that assume connector booleans.
- Without this step, the UI cannot exercise the new lifecycle safely or type-check against the actual desktop boundary.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]].
- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04]].
- Review current renderer bootstrap and refresh flows in `packages/desktop/src/renderer/main.tsx` before editing callbacks.

## Relevant Code Paths

- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04]]
- [[01_Architecture/Integration_Map|Integration Map]]
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`

## Execution boundary (Step 04 vs Step 05)

**Step 05 scope:** orchestration + contract alignment.

- Wire `window.srgnt` methods and renderer state transitions (install/uninstall/connect/disconnect).
- Align type contracts between main handler names, preload signatures, and renderer-facing props.
- Update top-level state refresh and post-action behavior.

**Step 04 outputs consumed here:**
- Presentational components with action callback props only.
- Stable naming/labels for each action in each state.

**Step 05 does not own:**
- visual copy rewrites or section-grouping layout in components (except minimal prop-prop changes to compile wireup).
- introducing new UX semantics not already defined by Step 04.


## Execution Prompt

1. Add preload bridge methods for install and uninstall, keeping naming and return types aligned with the main-process handlers from Step 03.
2. Update `window.srgnt` typings so renderer code sees the same connector state shape and method set as preload.
3. Refactor top-level renderer orchestration to use explicit install, uninstall, connect, and disconnect callbacks instead of treating settings saves or connect/disconnect calls as installation.
4. Ensure refresh logic after connector actions keeps connector lists and settings in sync without auto-installing anything.
5. Remove any renderer assumptions that connector booleans live inside generic settings UI state unless that state now genuinely represents installed connector IDs.
6. Preserve component markup from Step 04; avoid changing action labels/copy unless required to compile data flow.
7. Finish by typechecking the desktop package and manually exercising the full renderer flow against the real preload API.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-16
- Next action: Wire install/uninstall through preload and renderer orchestration, then remove stale toggle-first assumptions.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- `window.srgnt` exposes the full connector lifecycle needed by the renderer.
- Top-level renderer state can install, uninstall, connect, disconnect, and refresh connectors without abusing generic settings persistence.
- Types stay aligned across main, preload, and renderer.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] remains the architecture contract: preload is the only renderer-accessible desktop boundary.
- Preload is the only renderer-accessible desktop boundary.
- Keep connector lifecycle methods explicit; avoid overloading `saveDesktopSettings()` with install semantics unless the persisted install record is intentionally being edited.
- Prefer targeted state refresh after connector actions over full reload gymnastics, as long as correctness stays clear.

**Starting files and likely touch points:**
- `packages/desktop/src/preload/index.ts` for exposed methods and bridge types.
- `packages/desktop/src/renderer/env.d.ts` for the `SrgntAPI` contract.
- `packages/desktop/src/renderer/main.tsx` for bootstrapping, refresh helpers, and connector action callbacks.
- Step 04-presentational components only where callback props or prop types need final wiring.

**Constraints and non-goals:**
- Do not expose main-process internals or secret-bearing state in preload.
- Do not regress existing non-connector settings flows.
- Do not keep dead toggle-era code paths around if they create contradictory behavior.
- Do not change install semantics inside tests without also updating the contract surface.

**Edge cases and failure modes:**
- Renderer refresh after workspace switch must not resurrect stale installed state from the previous workspace.
- Install followed by immediate connect should work in sequence and refresh accurately.
- Uninstall from a connected state must leave the UI in a clean available/uninstalled state.
- Failed install/connect actions should surface safe errors and leave state coherent.

**Security:**
- Renderer sees only safe summary state and action methods.
- Preload must not leak token/session material or privileged filesystem details beyond existing safe APIs.

**Performance:**
- Avoid unnecessary double-fetches where one targeted refresh is enough, but prefer correctness over micro-optimization.
- Keep connector refresh logic centralized so future connector growth does not multiply networkless IPC chatter unnecessarily.

**Validation:**
1. `pnpm -C packages/desktop typecheck`
2. `pnpm -C packages/desktop test -- --filter connector`
3. Manual smoke in desktop app:
   - launch fresh workspace
   - install connector
   - connect connector
   - disconnect connector
   - uninstall connector
   - confirm UI and settings remain coherent at each step

**Junior-readiness verdict:** PASS — the main challenge is tracing renderer state flow, but the starting files and action matrix are now explicit.

### Readiness packet (handoff)

- **Starting files:** `packages/desktop/src/preload/index.ts`, `packages/desktop/src/renderer/env.d.ts`, `packages/desktop/src/renderer/main.tsx`, plus Step 04 callback props in `ConnectorStatus.tsx` / `ConnectorsSidePanel.tsx` / `Settings.tsx`.
- **Success condition:** `window.srgnt` exposes install/uninstall/connect/disconnect methods; renderer state refreshes truthfully after each action without auto-install semantics in settings paths.
- **Blockers:** none within the note’s scope; unresolved dependency is external if Step 03 API contracts are incomplete or differ from described naming.
- **Edge/failure cases to validate:** workspace-switch state resurrection, rapid install→connect sequence, uninstall while connected, IPC error propagation, stale UI if refresh logic fails.
- **Validation expectations:** desktop typecheck + filtered desktop tests + manual install/connect/disconnect/uninstall smoke flow with coherent state after each action.
- **Downstream effect:** completes the contract boundary so Step 06 can lock invariants with tests against real payload shapes.

## Human Notes

- If the renderer currently mixes connector state into generic settings state too deeply, favor a small explicit connector action layer rather than another round of implicit boolean patches.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-232215-align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model-executor-1|SESSION-2026-04-16-232215 executor-1 session for Align preload bridge and renderer contracts with new connector pluggability model]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the renderer can use the real connector lifecycle end to end through preload without type drift.
- Validation target: one manual pass can install, connect, disconnect, and uninstall a connector without contradictory UI or stale settings.
- Follow-up moves to [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06]].