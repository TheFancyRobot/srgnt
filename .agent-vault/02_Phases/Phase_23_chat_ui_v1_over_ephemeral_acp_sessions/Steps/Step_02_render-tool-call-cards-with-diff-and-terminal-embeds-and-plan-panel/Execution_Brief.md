# Execution Brief

## Why

- Tool activity is the heart of a coding-agent UI — and for Pi it is the ONLY window into what the agent does: the spike (probe 4) proved Pi never delegates `fs/*` or `terminal/*` to the client and executes tools in-process, so everything the user sees about Pi's file edits and commands comes from `tool_call` / `tool_call_update` content. Rendering those faithfully is what makes srgnt honest.
- The plan panel gives the session a persistent "what is the agent doing" surface, exercising the SidePanel half of the chat layout.
- This step also lands the main-process client `fs`/`terminal` services (phase scope: "client services v1") because the mock agent's `use_terminal`/`read_file` directives — and any spec-compliant harness — call them, and terminal *embed* rendering is only end-to-end testable with a client-created terminal.

## Prerequisites

- STEP-23-01 merged: transcript reducer, chat session controller + IPC, ChatView shell.
- Read the spike report probe 4 + "Streamed-update shape": 1 `tool_call` + 24 `tool_call_update` frames for a single file write is the real cadence.
- Skim the ACP tool-call content model (agentclientprotocol.com, protocol v1): content blocks are `content` (text/resource), `diff` (`path`, `oldText?`, `newText`), `terminal` (`terminalId`); calls carry `kind`, `status`, `locations`, `rawInput`/`rawOutput`.
- Mock scenario schema (`packages/harness/src/testing/mock-agent/scenario.ts`): the `tool_call` / `tool_call_update` directives accept free-form `content` arrays — this is how every card variant is scripted in tests.

## Likely Code Paths

- `packages/desktop/src/renderer/components/chat/ToolCallCard.tsx` (new) — kind-aware icon/label for the ACP kinds (`read`, `edit`, `delete`, `move`, `search`, `execute`, `think`, `fetch`, `switch_mode`, `other` — see `SToolKind` in the scenario schema), status chip for `pending → in_progress → completed | failed`, expandable body rendering content blocks, `locations` rendered as file path + line display (no navigation promise we can't keep this phase).
- Reducer upsert semantics in `transcriptReducer.ts`: `tool_call` creates a card; `tool_call_update` merges fields (`status`, `title`, `content`, `rawOutput`) by `toolCallId`. **An update for an unknown id must create a placeholder card** (adapters can reorder/drop frames); test out-of-order arrivals explicitly.
- `packages/desktop/src/renderer/components/chat/DiffView.tsx` (new) — CodeMirror-based diff. **Gotcha: `@codemirror/merge` is NOT currently a dependency** (`packages/desktop/package.json` has autocomplete/commands/lang-markdown/language/search/state/view only). Add it; render a read-only diff with unchanged regions collapsed (merge view supports this natively).
- Terminal embeds — two honest paths, both required, picked per content block:
  1. `terminal` content block with a `terminalId` → embed live output of a *client-created* terminal via the ghostty-web stack (extract a reusable surface from `TerminalPanel.tsx` rather than importing the whole 583-line panel).
  2. Pi reality: command output arrives only as `content` text / `rawOutput` on the tool call → monospace output block inside the card.
- `packages/desktop/src/main/chat/client-services.ts` (new) — harness `FileSystemPort` (`fs/read_text_file`, `fs/write_text_file`) **path-guarded to the session cwd** (resolve + prefix check; reject traversal/absolute-outside with a typed error) and `TerminalPort` (`terminal/create|output|release|wait_for_exit|kill`) backed by node-pty — reuse patterns from `packages/desktop/src/main/pty/` (session-manager, node-pty-service). Wire into the chat controller's `ClientPorts` (the dev console passes only `permission`; chat passes all three). Every `fs/*` call emits an audit event into the in-memory session event stream (STEP-23-03 formalizes the audit surface; the event kinds already exist in `packages/contracts/src/session.ts`).
- Plan panel: `packages/desktop/src/renderer/components/sidepanels/ChatPlanSidePanel.tsx` (new; follow `NotesSidePanel.tsx` structure) rendering `plan` updates — entries `{content, priority: high|medium|low, status: pending|in_progress|completed}`. Per ACP spec each `plan` update carries the FULL entry list (replace, never merge). Register as `sidePanelContent` on the chat `PanelDefinition` from STEP-23-01.

## Key Design Constraints

- Read-only everywhere: diffs and terminal output render; nothing is editable or re-runnable (phase non-goal: not a code editor).
- 24 updates for one tool call is normal — cards must update in place cheaply (stable identity by `toolCallId`, memoized content rendering; only the changed card re-renders).
- **fs-write safety sequencing (recorded assumption):** client `fs/write_text_file` mutates the user's cwd, so it must not ship before the permission engine gates it. Default: expose `terminal/*` and `fs/read_text_file` in this step, and omit the write path from `ClientPorts` until STEP-23-03's engine is merged, then route write through it. If 03 lands first, wire directly.
- Pi never calls any client service — that is expected, quirk-driven behavior, not a bug; the STEP-23-03 trust badge explains it to users. Card rendering must never depend on client-service availability.

## Execution Checklist

1. Extend `transcriptReducer.ts` with tool-call upsert + plan replacement semantics — pure tests first (scripted sequences incl. out-of-order, unknown-id, and status-regression cases).
2. Build `ToolCallCard` + `DiffView` (add `@codemirror/merge`) + monospace output block; component-test each content-block variant with fixture content arrays.
3. Extract a reusable ghostty surface from `TerminalPanel.tsx`; embed it for `terminal` content blocks.
4. Implement `client-services.ts` with hard path-guard unit tests (`../` traversal, absolute path outside cwd, prefix-collision like `/tmp/proj` vs `/tmp/proj-evil`); wire `ClientPorts` per the fs-write sequencing rule.
5. Build `ChatPlanSidePanel` and register it.
6. Manual: mock scenario with diff + `use_terminal` + `plan` directives; then a real Pi turn ("create a file, then run a command") — cards must update live from `tool_call`/`tool_call_update` frames alone, with zero client-service calls.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel|STEP-23-02 Render tool-call cards with diff and terminal embeds and plan panel]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]] (probe 4: no fs/terminal delegation for Pi)
