---
note_type: step
template_version: 2
contract_version: 1
title: Implement project auto-create switcher and per-project defaults
step_id: STEP-24-02
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - STEP-24-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement project auto-create switcher and per-project defaults

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement project auto-create switcher and per-project defaults.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: Project entities persist to `projects/<id>/project.json`; starting a session in a new directory auto-creates its project ("project = directory"); projects support rename and merge; a project switcher lives in Navigation; per-project defaults (harness, permission policy) resolve into session creation.
- Starting files: `packages/runtime/src/` (new `projects/` module); `packages/contracts/src/` Project schema; renderer `Navigation.tsx`.
- Validate: unit tests for auto-create/rename/merge and stable-id-by-rootDir mapping; switcher component tests; two projects with sessions swap correctly in E2E.

## Why This Step Exists

- Projects are the organizing entity of the product surface: the session list (03), resume flows (04), and the permission engine's project-policy hook (stubbed in STEP-23-03) all key off the project entity and its `project.json` defaults.
- "Project = directory" with a stable derived id is what lets sessions from any harness coexist in one project and survive renames — the identity rule is the risk being retired here.

## Prerequisites

- STEP-24-01 merged (SessionStore defines the `projects/<id>/sessions/<id>/` path layer).
- STEP-23-03's `packages/runtime/src/permissions/` engine shipped with a project-policy stub that always falls through — this step fills it.
- Renderer orientation: `Navigation.tsx` is the `AppLayout` shell; the switcher's real home is the chat panel's `sidePanelContent` (see `defaultPanels` in `renderer/main.tsx`) — corrected from this note's original starting-files line.

## Relevant Code Paths

- `packages/contracts/src/project.ts` — `SProject` (add optional `permissionPolicy`; `defaultHarnessId` already exists).
- `packages/runtime/src/projects/` (new) — `ProjectStore`: `ensureProjectForDir` (auto-create, id = truncated sha256 of resolved rootDir), rename, merge, defaults; atomic `project.json` writes.
- `packages/contracts/src/ipc/contracts.ts` + `packages/desktop/src/main/` — `project:*` channels + a projects service following the `services/` module pattern, re-rooted via `WorkspaceService` hooks.
- `packages/desktop/src/renderer/components/chat/ProjectSwitcher.tsx` (new) in the chat panel side-panel content.

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (workspace v2 layout; fs path-guard rule)
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (per-project defaults can lean on `session/load` config + `session/set_mode` for Pi)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
