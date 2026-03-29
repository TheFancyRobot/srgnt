---
note_type: step
template_version: 2
contract_version: 1
title: Implement Electron Shell And Preload Boundary
step_id: STEP-02-02
phase: '[[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-02-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement Electron Shell And Preload Boundary

Create the first runnable Electron main/renderer/preload shell with typed, narrow capability boundaries.

## Purpose

- Stand up the desktop shell and preload bridge that later runtime and connector code will plug into.
- Enforce the framework rule that privileged functionality is mediated rather than exposed directly to the renderer.

## Why This Step Exists

- The desktop shell is the main executable product surface.
- Security posture can drift immediately if preload and IPC boundaries are not designed up front.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]].

## Relevant Code Paths

- `packages/desktop/main/`
- `packages/desktop/preload/`
- `packages/desktop/renderer/`
- `packages/runtime/` for shared types
- desktop smoke and typecheck scripts chosen in Step 01

## Required Reading

- [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Create the Electron main, renderer, and preload entry points using the package structure from Step 01.
2. Expose only narrow, typed capabilities through preload and IPC; do not add broad filesystem, network, or shell bridges.
3. Keep secrets, PTY hosting, and connector auth out of the renderer.
4. Add the minimum smoke path needed to prove the shell boots and the bridge can call one safe capability.
5. Validate with the desktop smoke command and a typecheck that covers shared preload contract types.
6. Update notes with the exact IPC entry points created and any capability intentionally deferred.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Main process is the privileged local boundary; renderer is UI only.
- Avoid arbitrary filesystem access and arbitrary shell execution from the renderer.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/desktop/main/index.ts` — Electron main process entry (BrowserWindow creation, IPC handler registration)
- `packages/desktop/preload/index.ts` — contextBridge exposing a narrow, typed API object (e.g., `window.srgnt`)
- `packages/desktop/renderer/index.html` + `renderer/main.ts` — renderer entry that consumes the preload bridge
- `packages/contracts/src/ipc.ts` (or similar) — shared TypeScript types for IPC channels and payloads, validated with Zod
- At least one working IPC round-trip (e.g., `getAppVersion` or `ping`) proving the bridge works end-to-end
- Electron security settings: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (or documented exception)

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — IPC channel types must be Zod schemas in contracts package
- DEC-0004 (macOS + Windows + Linux) — BrowserWindow config must work cross-platform; no macOS-only APIs without guards

**Starting files:**
- Completed STEP-02-01 scaffold: `packages/desktop/package.json`, root workspace scripts, `tsconfig.base.json`
- `packages/contracts/` must exist with Zod installed

**Constraints:**
- Do NOT expose `fs`, `child_process`, `net`, or shell APIs through preload
- Do NOT disable contextIsolation or enable nodeIntegration in renderer
- Do NOT add navigation/routing UI — this step is shell + IPC only
- Do NOT add connector or runtime logic — this is the empty privilege boundary

**Validation:**
1. `pnpm --filter desktop dev` boots Electron and shows a window
2. DevTools console can call the preload-exposed API and get a typed response
3. `pnpm typecheck` passes, including the shared IPC types in contracts
4. Attempting to access `require('fs')` or `process` from renderer fails (security check)
5. Smoke test script (manual or automated) confirms the IPC round-trip

**Junior-readiness verdict:** PASS — the step is well-defined with a single IPC proof point and now inherits the canonical `packages/desktop/` path from STEP-02-01.

## Human Notes

- If an IPC surface feels generic, it is probably too broad for this milestone.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the desktop shell runs and exposes only explicit preload-mediated capabilities.
- Validation target: shell boot plus typed IPC smoke check.
