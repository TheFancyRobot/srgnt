---
note_type: step
template_version: 2
contract_version: 1
title: Wire permission engine round-trips into default-ask prompt UI
step_id: STEP-23-03
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - STEP-23-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Wire permission engine round-trips into default-ask prompt UI

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Wire permission engine round-trips into default-ask prompt UI.
- Parent phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]].
- Exact outcome (re-scoped after the STEP-22-05 spike + DEC-0018 acceptance): **for harnesses that send `session/request_permission`** (the mock agent does; opencode will in Phase 25), the request blocks in a main-process permission engine with default ask-everything — the renderer shows a permission prompt (tool kind, affected paths/commands, allow/reject × once/always), decisions flow back over IPC, "always" answers are remembered per session, and every decision is emitted as an audit event. **For harnesses that never send it** (Pi: spike probe 1 measured 0 round-trips; pi-acp self-approves in-process), the session header shows an honest per-harness "self-approving" trust badge driven by the definition's `permission-routing-gaps` quirk — informational copy only, never implying srgnt gates that agent.
- Starting files: `packages/runtime/src/permissions/` (NEW engine module — the aggregator-era `runtime/src/{approvals,policy}` carry the concepts, not reusable code; leave them untouched); new IPC contract in `packages/contracts/src/ipc/`; renderer `chat/PermissionPrompt.tsx` + `chat/TrustBadge.tsx` (new); the chat controller's `PermissionPort` implementation.
- Validate: unit tests for resolution order (session-remembered → project-policy stub → default-ask); in-process + E2E allow and deny paths against a mock-agent `request_permission` scenario (asserting agent-side `expectOutcome`/`expectOptionId`); audit events (`client/permission_request`/`client/permission_decision`) visible in the in-memory event stream; Pi session shows the badge and never prompts.

## Why This Step Exists

- Permissions-default-ask is an ARCH-0009 invariant and the product's trust story — including being honest when a harness gives us no gate at all (Pi). The spike falsified this step's original single-path framing; the reconciled scope is real round-trips for compliant harnesses PLUS a quirk-driven self-approving badge for Pi.
- The engine built here is the seam Phase 24 project policy and Phase 25 opencode permissions plug into.

## Prerequisites

- STEP-23-01 merged. STEP-23-02 coordinates (fs-write gating) but blocks in neither order.
- Read DEC-0018 "Consequences" (this step's honest-UI copy is named there) and spike probe 1.
- Read `PermissionPort` in `packages/harness/src/acp/connection.ts` and the dev console's `autoApprovePermission` placeholder it replaces for chat sessions (dev console keeps auto-approve).
- Decision needed (recorded, non-blocking — default in the brief): the memory key for `allow_always` within a session; ACP defines none. Default: `(sessionId, toolCall.kind)`.

## Relevant Code Paths

- `packages/runtime/src/permissions/` (new, pure, no ACP/Electron imports — runtime never speaks ACP); old `approvals`/`policy` modules stay untouched.
- `packages/desktop/src/main/chat/` — `PermissionPort` implementation, pending-request map, cancel wiring, audit events (`knownSessionEventKinds` already has the two kinds in `packages/contracts/src/session.ts`).
- `packages/contracts/src/ipc/contracts.ts` — `chat:permission:request` (push) + `chat:permission:respond`; preload mirror.
- `packages/desktop/src/renderer/components/chat/PermissionPrompt.tsx` + `TrustBadge.tsx`; quirks arrive via the STEP-23-01 `chat:session:new` response.
- Mock substrate: `request_permission` directive in `packages/harness/src/testing/mock-agent/scenario.ts` (`expectOutcome`/`expectOptionId` assert agent-side receipt).

## Required Reading

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (permission data flow + default-ask invariant)
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]] (accepted; Consequences section)
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 1: permissions never round-trip for Pi)

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

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui/Validation_Plan|Validation Plan]].
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
