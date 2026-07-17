---
note_type: step
template_version: 2
contract_version: 1
title: Build ChatView streaming surface with message thought and markdown rendering
step_id: STEP-23-01
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Build ChatView streaming surface with message thought and markdown rendering

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Build ChatView streaming surface with message thought and markdown rendering.
- Parent phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]].
- Exact outcome: a ChatView component in the center panel renders a live ACP session: user/agent message chunks stream in, thought chunks render as collapsible blocks, and message bodies render GFM markdown using the existing notes markdown machinery — built on existing layout components and semantic tokens.
- Starting files: `packages/desktop/src/renderer/components/` (new `chat/` directory); `LayoutContext.tsx`; notes markdown rendering pipeline; `packages/contracts/src/ipc/` for the new session IPC contract.
- Validate: component tests with scripted update streams; manual dev-console-fed session renders correctly in light/dark themes.

## Why This Step Exists

- First product surface of the ACP pivot; every later step (tool cards, permissions, composer) consumes the session-controller IPC and update-stream reducer built here. Shipping it first de-risks the core UX earliest (phase decision log D16).
- Productizes the plumbing STEP-22-05's dev console proved: desktop-main driving `@srgnt/harness` (Supervisor + `AcpAgentConnection`) with `session/update` frames streamed to the renderer.

## Prerequisites

- PHASE-22 merged (`@srgnt/harness`, mock agent, dev console on `main`); `pnpm install && pnpm build` green.
- Read `packages/desktop/src/main/dev-console/session-controller.ts` + `index.ts` fully — the reference implementation, including the mandatory `Function('return import("@srgnt/harness")')()` lazy-ESM pattern (desktop main compiles to CommonJS; a static value import throws `ERR_REQUIRE_ESM`).
- Spike report "Streamed-update shape": one real Pi turn = 37 thought chunks + 23 message chunks + 1 tool_call + 24 tool_call_updates + 2 `session_info_update`, interleaved — the reducer must batch renders and tolerate unknown kinds.

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts` — add `chat:session:*` channels next to the `dev:session:*` block; new-session response must carry harness `id`/`name`/`quirks` (STEP-23-03's trust badge needs them).
- `packages/desktop/src/main/chat/` (new) — `ChatSessionController` modeled on `DevSessionController`; wire in `main/index.ts` beside `registerDevConsoleHandlers` with app-quit teardown.
- `packages/desktop/src/preload/index.ts` — `chatSession*` + `onChatSessionUpdate`, mirroring the `devSession*` block.
- `packages/desktop/src/renderer/components/chat/` (new) — `ChatView`, `MessageList`, `ThoughtBlock`, `Markdown`, pure `transcriptReducer.ts`; panel registration in `renderer/main.tsx` (`defaultPanels` + `activePanel` switch) and `components/icons.tsx`.
- Markdown reality: no standalone MD→HTML renderer exists; notes machinery is a CodeMirror editing stack — see the brief's read-only-EditorView assumption.

## Required Reading

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (renderer surfaces + data flow)
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]] (accepted — pinned pi-acp@0.0.31 for phases 23–24)
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] ("Streamed-update shape" section)

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

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering/Validation_Plan|Validation Plan]].
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
