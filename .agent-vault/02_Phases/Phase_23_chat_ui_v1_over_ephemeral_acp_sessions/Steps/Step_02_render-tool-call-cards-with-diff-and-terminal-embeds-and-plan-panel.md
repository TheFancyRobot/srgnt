---
note_type: step
template_version: 2
contract_version: 1
title: Render tool-call cards with diff and terminal embeds and plan panel
step_id: STEP-23-02
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
status: completed
owner: ''
created: '2026-07-10'
updated: '2026-07-25'
depends_on:
  - STEP-23-01
related_sessions:
  - '[[05_Sessions/2026-07-25-195300-render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel-claude-opus-5-fresh-execution-worker|SESSION-2026-07-25-195300 claude-opus-5 (fresh execution worker) session for Render tool-call cards with diff and terminal embeds and plan panel]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-25-195300
active_session_id: 05_Sessions/2026-07-25-195300-render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel-claude-opus-5-fresh-execution-worker
context_status: completed
context_summary: Advance [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel|STEP-23-02 Render tool-call cards with diff and terminal embeds and plan panel]].
---

# Step 02 - Render tool-call cards with diff and terminal embeds and plan panel

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Render tool-call cards with diff and terminal embeds and plan panel.
- Parent phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]].
- Exact outcome: `tool_call` / `tool_call_update` notifications render as live-updating cards — kind-aware icons/labels, status transitions (pending → in_progress → completed/failed), diff content rendered via CodeMirror, embedded terminal output via the existing ghostty-web stack, and file-location links; agent plan updates render in a SidePanel plan view.
- Starting files: renderer `chat/` (ToolCallCard, DiffView new); `TerminalPanel.tsx` + `packages/desktop/src/main/terminal/` for embed reuse; `sidepanels/` for the plan panel; CodeMirror deps already in package.json.
- Validate: component tests over scripted tool-call sequences (incl. out-of-order updates and failures); manual check of a real Pi edit + command execution rendering.

## Why This Step Exists

- For Pi, `tool_call`/`tool_call_update` content is the ONLY window into agent activity — spike probe 4 measured zero client `fs`/`terminal` delegation (pi executes tools in-process). Faithful card rendering is the honesty guarantee.
- Also lands client `fs`/`terminal` services v1 (phase scope): the mock agent's `use_terminal`/`read_file` directives call them, and terminal embeds need a client-created terminal to be end-to-end testable. Recorded scope decision — these services live in this step, with `fs/write_text_file` gated behind STEP-23-03's permission engine (see brief's sequencing rule).

## Prerequisites

- STEP-23-01 merged (reducer, controller, ChatView shell).
- Spike report probe 4 + ACP protocol-v1 tool-call content model (`content` | `diff` | `terminal` blocks; `kind`, `status`, `locations`, `rawInput`/`rawOutput`).
- Gotcha: `@codemirror/merge` is not yet a dependency of `@srgnt/desktop` — diffs need it added.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/chat/ToolCallCard.tsx`, `DiffView.tsx` (new); reducer upsert semantics in `transcriptReducer.ts` (unknown-id updates create placeholder cards).
- `packages/desktop/src/renderer/components/TerminalPanel.tsx` — extract a reusable ghostty-web surface for terminal embeds; Pi-path fallback renders `rawOutput`/text content as a monospace block.
- `packages/desktop/src/main/chat/client-services.ts` (new) — `FileSystemPort` path-guarded to session cwd via canonical containment (realpath-based, symlink-safe — see the brief's guard spec, not just lexical prefix checks) + `TerminalPort` over node-pty (patterns from `packages/desktop/src/main/pty/`); audit events per `fs/*` call.
- `packages/desktop/src/renderer/components/sidepanels/ChatPlanSidePanel.tsx` (new; `NotesSidePanel.tsx` as structure reference) — `plan` updates replace the full entry list.

## Required Reading

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 4: no client fs/terminal delegation for Pi)

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

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: 
- Last touched: 2026-07-25
- Next action: None for this step. Proceed to [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03]], which enables `fs/write_text_file` by passing `authorizeWrite` to `createChatClientServices`.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

Full detail in [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Implementation_Notes|Implementation Notes]]. The load-bearing points:

- `FileSystemPort.writeTextFile` is now **optional** in `@srgnt/harness` and the `fs.writeTextFile` capability is derived from the method's presence. The brief's "omit the write path" was otherwise impossible — both fs flags came from `ports.fs !== undefined`, so a read-only fs would have advertised write and rejected every call.
- The path guard uses canonical (`realpath`) containment with separator-aware prefix matching, canonicalizing the nearest existing ancestor so writes to not-yet-existing files are guarded too.
- The client `TerminalPort` falls back from node-pty to `child_process` pipes: node-pty's `posix_spawnp` fails on some machines (macOS 25 here), and without the fallback one unavailable native addon fails every agent command.
- `knownSessionEventKinds` has no `client/fs_*` entries despite the brief saying so; the service emits them into the open string set (ARCH-0009).
- `AppLayout` gained a `showSidePanel` override — `fullBleed` previously suppressed side panels unconditionally, and chat is full-bleed.
- Plan entries are parsed at the panel (`readPlanEntries`), leaving `transcript.plan` raw so STEP-23-01's reducer contract is untouched.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-25 - [[05_Sessions/2026-07-25-195300-render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel-claude-opus-5-fresh-execution-worker|SESSION-2026-07-25-195300 claude-opus-5 (fresh execution worker) session for Render tool-call cards with diff and terminal embeds and plan panel]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

**Complete.** Tool-call cards render every ACP kind with live status transitions, CodeMirror-based read-only diffs, terminal embeds (both the client-created-terminal path and Pi's rawOutput/text path), and file locations; client `fs`/`terminal` services v1 ship in main with realpath-based containment and an audit stream; the plan side panel renders replacement-semantics plan updates.

Validation (all run, all as stated): `pnpm --filter @srgnt/desktop test` 939 passed (from an 856 baseline), `typecheck` and `build` clean, `pnpm --filter @srgnt/harness test` 113 passed / 2 skipped, `pnpm --filter @srgnt/contracts test` 140 passed, `pnpm -r test` green across all four packages, and `e2e/ui-coverage-matrix.spec.ts` 27 passed. The mock manual run was performed headlessly against the built main with the real spawned mock bin (end_turn, 15 frames, `content`/`diff`/`terminal` blocks, 2 plan updates, terminal output on `chat-term-1`).

Not done: the GUI `pnpm dev` visual pass and a real-Pi turn — both need a human at a display, and the real ghostty render path is therefore unverified (jsdom only ever exercises the ANSI-stripped fallback). One pre-existing, unrelated `e2e/app.spec.ts` failure (`posix_spawnp failed` from node-pty) is documented in [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel/Outcome|Outcome]].

Nothing blocks STEP-23-03.
