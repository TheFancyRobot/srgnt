---
note_type: step
template_version: 2
contract_version: 1
title: Harden Previews Approvals And Run Logs
step_id: STEP-07-03
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
status: scaffolded
owner: ''
created: '2026-03-21'
updated: '2026-03-28'
depends_on:
  - STEP-07-01
  - STEP-07-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Harden Previews Approvals And Run Logs

Add the trust and audit features required once terminal launches can affect user artifacts.

## Purpose

- Make previews, approval gates, and run logs explicit for terminal-triggered operations.
- Preserve auditability without over-logging sensitive content.

## Why This Step Exists

- The framework calls out silent changes and unreadable logs as trust risks.
- Terminal integration becomes unsafe quickly if writes bypass preview and approval UX.

## Prerequisites

- Complete [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts|STEP-07-01 Implement PTY Service And Terminal Surface Contracts]].
- Complete [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]].

## Relevant Code Paths

- `packages/runtime/`
- `packages/desktop/renderer/`
- run-log and artifact modules from Phase 03

## Required Reading

- [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Add preview and approval handling to artifact-affecting terminal launch flows.
2. Harden run logs so they capture enough detail for audit while supporting redaction and sensitivity boundaries.
3. Validate at least one approval-required path and one read-only launch path.
4. Update notes with the final preview behavior, approval states, and log redaction assumptions.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: scaffolded
- Current owner:
- Last touched: 2026-03-22
- Next action: Replace the current scaffolding with the promised implementation and verification path.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Run logs should support later premium and sync prep without storing more than needed.

### Refinement (readiness checklist pass)

**Exact outcome:**
- Approval gate system in `packages/runtime/src/approvals/` — terminal launch actions that affect artifacts require explicit user approval before execution
- Approval states (Zod enum): `pending`, `approved`, `denied`, `expired` — no implicit or silent approval
- Preview UI in `packages/desktop/renderer/` — before a terminal command runs against an artifact, user sees: the command to be executed, the target artifact/directory, the originating workflow context (`LaunchContext`), and a clear approve/deny interface
- Run log system in `packages/runtime/src/logs/` — structured run logs for terminal sessions capturing: launch context, command executed, start/end timestamps, exit code, output summary (truncated), approval state. Persisted as markdown files per DEC-0007.
- **Redaction boundary**: run logs must NOT capture: secrets, tokens, environment variables marked sensitive, or full terminal output beyond a configured truncation limit. This redaction boundary is foundational — PHASE-08 (product hardening) and PHASE-09 (sync preparation) depend on it. Establish the `RedactionPolicy` Zod schema here even if enforcement is basic.
- Tests: approval-required path (command blocked until approved), read-only path (no approval needed), denial path (command never executes), run log validation (contains expected fields, respects redaction)
- Manual validation: one approval-required flow and one read-only flow

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): Approval states, run log entries, and `RedactionPolicy` are all Zod schemas
- DEC-0004 (macOS + Windows + Linux): Approval UI and run logs work on all platforms
- DEC-0006 (PHASE-09/09 produce architecture docs): The redaction boundary established here is a prerequisite for PHASE-09 sync prep — design it now, even if only locally enforced
- DEC-0007 (Dataview/markdown local data): Run logs are markdown files with YAML frontmatter, queryable by the Dataview engine

**Starting files (must exist before this step runs):**
- PTY service from STEP-07-01
- Launch action system and `LaunchContext` from STEP-07-02
- Runtime model from PHASE-03
- Artifact model from PHASE-03 (to determine which operations are artifact-affecting)

**Constraints:**
- Do NOT allow silent execution of artifact-affecting commands — all must pass through the approval gate
- Do NOT log full terminal output in run logs — truncate and redact per `RedactionPolicy`
- Do NOT store secrets in run logs under any circumstances
- Do NOT make approval optional or skippable in this step — hardening means the gate is mandatory for artifact-affecting actions
- Prefer explicit `denied` / `approval-pending` states over ambiguous silent behavior (per Human Notes)
- Do NOT over-engineer the redaction system — establish the boundary and schema now, full enforcement hardens in PHASE-08/08. The goal here is: the shape exists, basic rules apply, and later phases can tighten without restructuring.

**Validation:**
A junior dev verifies completeness by:
1. Triggering an artifact-affecting launch action and confirming the approval preview appears (command, target, context visible)
2. Denying the approval and confirming the command never executes (check process list)
3. Approving the action and confirming the command executes and a run log is persisted
4. Inspecting the persisted run log file: valid markdown, YAML frontmatter with launch context, command, exit code, timestamps
5. Checking the run log does NOT contain raw environment variables or token values
6. Triggering a read-only launch action from the approved template list and confirming it proceeds without an approval gate
7. Parsing a `RedactionPolicy` and run log entry through their Zod schemas — both validate

**Junior-readiness verdict:** PASS — The step is well-defined with two clear paths (approval-required vs. read-only) and concrete artifacts (approval UI, run logs, redaction schema). The main risk is under-specifying the redaction boundary, which the `RedactionPolicy` Zod schema requirement addresses. The explicit note about PHASE-08/08 coupling gives future developers context for why the boundary exists.

## Human Notes

- Prefer explicit denied or approval-pending states over ambiguous silent behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means terminal-triggered changes participate in the same preview, approval, and audit model as other workflows.
- Validation target: read-only and approval-required paths are both testable and understandable.
