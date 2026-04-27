---
note_type: session
template_version: 2
contract_version: 1
title: executor-1 session for Refactor built-in connectors to register through the shared factory path
session_id: SESSION-2026-04-19-070143
date: '2026-04-19'
status: completed
owner: executor-1
branch: phase-20-connector-factory-remote-package-installation
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
context:
  context_id: 'SESSION-2026-04-19-070143'
  status: completed
  updated_at: '2026-04-19T00:00:00.000Z'
  current_focus:
    summary: 'Advance [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]].'
    target: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]]'
    section: 'Context Handoff'
  last_action:
    type: completed
related_bugs: []
related_decisions:
  - '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]'
created: '2026-04-19'
updated: '2026-04-19'
tags:
  - agent-vault
  - session
---

# executor-1 session for Refactor built-in connectors to register through the shared factory path

Use one note per meaningful work session in `05_Sessions/`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 07:01 - Created session note and linked the target step.
- 07:02 - Implemented built-in connector registration through the shared factory path using a common registry in `packages/connectors`.
- 07:08 - Hit a cross-step blocker in `packages/desktop/src/main/settings.ts` during desktop validation; paused and coordinated with STEP-20-03 fixes.
- 07:17 - Revalidated after settings/type fixes landed; coordinator confirmed the step complete.
<!-- AGENT-END:session-execution-log -->

## Findings

- Desktop main had been duplicating built-in connector definitions inline, which kept first-party connectors on a privileged path.
- Shared registration is now sourced from `packages/connectors`, making built-ins prove the same factory contract external packages will target.
- The blocking desktop validation issue came from STEP-20-03 persistence-shape drift, not from the built-in registry refactor itself.

## Context Handoff

- Resume from the latest completion summary and validation notes below.
- Primary resume target: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]].
- Preserve durable conclusions in linked phase, bug, decision, or architecture notes.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/connectors/src/index.ts`
- `packages/connectors/src/jira/connector.ts`
- `packages/connectors/src/outlook/connector.ts`
- `packages/connectors/src/teams/connector.ts`
- `packages/connectors/src/sdk/registry.ts`
- `packages/connectors/src/sdk/registry.test.ts`
- `packages/desktop/src/main/index.ts`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: `pnpm --filter @srgnt/connectors test && pnpm --filter @srgnt/desktop test && pnpm --filter @srgnt/desktop typecheck`
- Result: pass with 2 pre-existing BUG-0002 desktop test failures reported as unrelated
- Notes: coordinator reported 84 connector tests passing, 852 desktop tests passing aside from the known unrelated failures, typecheck clean, and no new regressions.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None new. The only failing desktop tests were the pre-existing BUG-0002 failures already known to the vault.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- Preserved [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]] by changing registration semantics only; no third-party runtime loading moved into Electron main.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Reuse the shared built-in registry in STEP-20-04 when unifying the managed host loader boundary.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- Completed STEP-20-02 by moving built-in connector definitions and registrations onto the shared factory-backed path.
- Desktop main no longer needs inline built-in manifest duplication to surface Jira, Outlook, and Teams.
- Session ended in a clean handoff state.
