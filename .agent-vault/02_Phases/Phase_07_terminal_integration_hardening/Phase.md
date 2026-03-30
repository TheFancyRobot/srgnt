---
note_type: phase
template_version: 2
contract_version: 1
title: Terminal Integration Hardening
phase_id: PHASE-07
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-29'
depends_on:
  - '[[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
related_bugs:
  - '[[03_Bugs/BUG-0002_today-view-launch-flow-fails-in-live-desktop-app|BUG-0002 Today View launch flow fails in live desktop app]]'
  - '[[03_Bugs/BUG-0003_today-view-launch-hardcodes-intent-readonly-bypassing-approval-preview|BUG-0003 Today View launch hardcodes intent: readOnly bypassing approval preview]]'
tags:
  - agent-vault
  - phase
---

# Phase 07 Terminal Integration Hardening

Harden the embedded terminal and agent-launch workflow so it fits the same privilege, artifact, and approval model as the rest of the product.

## Objective

- Deliver a PTY-backed terminal integration that can launch workflows with artifact-aware context, preserve auditability, and avoid broad renderer-side privilege.

## Why This Phase Exists

- The terminal coding agent is a core execution surface in the framework, but it is not the whole product. It must fit the desktop trust boundary instead of bypassing it.
- Preview, approval, and run-log behavior become materially more important once terminal launches can affect user artifacts or workspace state.

## Scope

- Implement PTY-backed terminal services and renderer surface contracts.
- Wire workflow launch actions that pass artifact-aware execution context into terminal sessions.
- Harden preview-before-write behavior, approvals, and run logs for agent-mediated changes.

## Non-Goals

- Building premium orchestration or remote agent coordination.
- Treating the terminal as a replacement for the rest of the command-center UX.

## Dependencies

- Depends on [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]].
- Depends on [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]] for PTY hosting behind the privileged boundary.
- Depends on [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]] for approvals, artifacts, runs, and executor contracts.

## Acceptance Criteria

- [x] Terminal sessions are hosted through the privileged boundary rather than direct renderer process spawning.
- [x] Workflow launch actions can inject safe artifact-aware context into terminal sessions.
- [x] Preview-before-write and approval behavior is explicit for artifact-affecting workflows.
- [x] Run logs capture enough detail to audit terminal-triggered workflow activity without leaking unnecessary sensitive content.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|PHASE-06 Replace Zod with Effect Schema]]
- Current phase status: completed
- Next phase: [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0002_today-view-launch-flow-fails-in-live-desktop-app|BUG-0002 Today View launch flow fails in live desktop app]]
- [[03_Bugs/BUG-0003_today-view-launch-hardcodes-intent-readonly-bypassing-approval-preview|BUG-0003 Today View launch hardcodes intent: readOnly bypassing approval preview]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts|STEP-07-01 Implement PTY Service And Terminal Surface Contracts]] - Start here; establishes the secure hosting path.
- [x] [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]] - Depends on Step 01.
- [x] [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]] - Depends on Steps 01-02.
<!-- AGENT-END:phase-steps -->

## Notes

- All three steps are complete. PTY service, launch context wiring, approval gates, and run logs are implemented and tested.
- STEP-07-01: PTY service in main process, IPC handlers, renderer panel, session lifecycle, environment variable filtering.
- STEP-07-02: LaunchContext schema in contracts, Today View launch path, intent-based routing (readOnly vs artifactAffecting), preload bridge fix (BUG-0002).
- STEP-07-03: ApprovalService with pending/approved/denied/expired states, ApprovalPreview component, run log persistence to .command-center/runs/, RedactionPolicy schema with default sensitive-key filtering, markdown run log output.
- Security hardening pass completed: terminal IPC validation, navigation blocking, CSP without remote fonts, Electron 35.7.5 / Electron Builder 26.8.1 upgrade.
- Remaining architectural note: preload API surface is still broader than ideal; further reduction is a future concern, not a Phase 07 blocker.
