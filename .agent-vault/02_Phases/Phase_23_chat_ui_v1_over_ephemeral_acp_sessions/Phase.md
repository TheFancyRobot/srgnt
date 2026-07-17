---
note_type: phase
template_version: 2
contract_version: 1
title: Chat UI v1 Over Ephemeral ACP Sessions
phase_id: PHASE-23
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
  - '[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy (accepted 2026-07-15: adopt pinned pi-acp@0.0.31 for phases 23-24)]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 23 Chat UI v1 Over Ephemeral ACP Sessions

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Chat UI v1 Over Ephemeral ACP Sessions milestone.
- Ship the core chat surface over a single ephemeral ACP session: streamed markdown, thought blocks, tool-call cards with diff + terminal embeds, and the agent plan panel — all built on the existing shell layout and semantic design tokens (Phase 12 brand work stays canonical).
- Wire `session/request_permission` round-trips into a default-ask permission UI backed by the permission engine evolved from `runtime/approvals` + `policy`.
- Deliver the composer with slash commands (`available_commands_update`), session modes, cancellation, and error/crash surfaces — E2E-tested entirely against the mock agent.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- ChatView in the center panel: streamed agent/user message chunks, collapsible thought blocks, GFM markdown rendering (reuse notes-view markdown machinery where sensible).
- Tool-call cards: kind-aware rendering, status transitions from `tool_call_update`, diff content via CodeMirror, embedded terminal output via the existing terminal stack, location links.
- Plan panel in the side panel fed by agent plan updates; slash-command menu fed by `available_commands_update`; session mode selector (`session/set_mode`).
- Permission prompt UI: modal/banner rendering `session/request_permission` options (allow/reject × once/always), wired to the permission engine (default-ask; decisions audit-logged to the in-memory event stream this phase).
- Composer: multiline input, submit/cancel (`session/cancel`), busy/stop-reason states, agent crash/restart surfaces.
- Main-process client services v1: `fs/read_text_file` + `fs/write_text_file` (path-guarded to cwd), `terminal/*` backed by node-pty.
- Playwright E2E: chat scenarios driven by the mock agent (streaming, tool cards, permission allow/deny, cancel, crash recovery).

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- Persistence, projects, or session lists (Phase 24) — one ephemeral session at a time.
- Multi-harness UI (Phase 25+) — Pi (and the mock agent) only.
- Building a code editor: diffs and terminal output render read-only; edits happen via the agent or the user's editor.
- Image/audio content blocks beyond graceful placeholder rendering (capability-gated later).
- Auto-approval policy configuration UI (engine defaults to ask-everything; policy UI comes with per-project settings in Phase 24/25).

## Dependencies

- Depends on [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]].
- Requires PHASE-22's `@srgnt/harness` (connection, supervisor, registry) and the mock ACP agent for all E2E work.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] A user can run a full Pi conversation: streamed responses, visible thoughts, tool-call cards updating live, diffs and terminal output rendered inline.
- [ ] Permission requests block on user allow/reject (once/always honored for the session) and cancel works mid-turn without orphaning the process.
- [ ] Slash commands and modes render from live agent data (`available_commands_update`, mode state) — nothing hardcoded.
- [ ] Agent crash mid-turn surfaces a recoverable error state (no white screen, no zombie process).
- [ ] `fs/*` reads/writes are path-guarded to the session cwd and audit-logged; `terminal/*` runs through node-pty with output visible in the tool card.
- [ ] Playwright E2E covers the above against the mock agent; all suites green.
- [ ] New UI uses existing semantic tokens/components — no parallel design system.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24 Projects and Session Persistence]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]] (ACCEPTED 2026-07-15: adopt pinned `pi-acp@0.0.31` for phases 23–24) — Pi permission/MCP/fs-terminal constraints this phase's chat UI must honor.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering|STEP-23-01 Build ChatView streaming surface with message thought and markdown rendering]]
- [ ] [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel|STEP-23-02 Render tool-call cards with diff and terminal embeds and plan panel]]
- [ ] [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03 Wire permission engine round-trips into default-ask prompt UI]]
- [ ] [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]]
- [ ] [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Sequencing rationale (decision log D16): UI before persistence de-risks the product's core surface earliest; the raw-ACP event envelope keeps the schema protocol-shaped either way, so storage (Phase 24) won't force UI rework.
- Step order: ChatView streaming (01) → tool-call cards + plan (02) → permissions (03) → composer/modes/slash (04) → E2E (05). Steps 02–04 can interleave once 01's update-stream plumbing exists.
- Reuse map: markdown rendering ← notes-view machinery; diffs ← CodeMirror; terminal embeds ← ghostty-web/pty stack; permission UI patterns ← old approvals UX; layout ← existing three-panel shell and semantic tokens (Phase 12 brand work).
- All E2E in this phase runs against the mock agent — deterministic, no network, no LLM cost; real-Pi checks stay manual until Phase 24 stabilizes lifecycle.
- Validation: `pnpm --filter @srgnt/desktop test`, `test:e2e` chat specs, plus manual real-Pi conversation smoke.
- Pi behavior constraints for the chat UI come from the STEP-22-05 spike: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] + [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (ACCEPTED 2026-07-15). Key UI consequences: Pi self-approves permissions (informational trust badge, not a client gate); MCP injection unavailable for Pi; no client fs/terminal delegation (render tool cards from `tool_call` content); `session/load` works, `session/resume` does not.
- Refinement pass 2026-07-17 (post-DEC-0018 reconciliation) — recorded scope decisions and assumptions, all detailed in the step Execution Briefs:
  - STEP-23-03 re-scoped: real permission round-trips for harnesses that send them (mock agent now; opencode in Phase 25) PLUS a quirk-driven "self-approving" trust badge for Pi; the engine is a NEW `packages/runtime/src/permissions/` module (the aggregator-era `approvals`/`policy` code is concept-reference only).
  - Client `fs`/`terminal` services v1 are assigned to STEP-23-02; `fs/write_text_file` must not be exposed until STEP-23-03's engine gates it.
  - Any new main-process consumer of `@srgnt/harness` must copy the dev-console's lazy-ESM `Function('return import(...)')` pattern (desktop main is CommonJS).
  - Markdown: no standalone MD→HTML renderer exists in the repo; default is a read-only CodeMirror EditorView reusing the notes GFM stack (fallback to a small renderer dep allowed, record in Implementation Notes). `@codemirror/merge` must be added for diffs.
  - E2E needs per-test mock scenarios: `SRGNT_MOCK_SCENARIO` env override on the chat controller's mock launch path; `e2e/chat.spec.ts` must be added to the explicit `test:e2e*` script file lists.
  - Decision needed (non-blocking, default recorded in STEP-23-03 brief): session-scoped `allow_always` memory key — default `(sessionId, toolCall.kind)`.
