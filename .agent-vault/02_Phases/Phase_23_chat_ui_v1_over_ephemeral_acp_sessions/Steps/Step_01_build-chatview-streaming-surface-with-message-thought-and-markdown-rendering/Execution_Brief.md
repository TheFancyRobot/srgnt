# Execution Brief

## Why

- This is the first *product* surface of the ACP pivot (DEC-0017): a chat view over a live ACP session. Every later step hangs off the plumbing built here — tool cards (02), permission prompts (03), and the composer (04) all consume the same update stream and session-controller IPC this step creates. Shipping it first de-risks the product's core surface earliest (phase decision log D16).
- It productizes what STEP-22-05's flag-gated dev console proved end-to-end: desktop-main can drive `@srgnt/harness` (Supervisor + `AcpAgentConnection`) and stream `session/update` frames to the renderer. The dev console stays as-is (dev tool); this step builds the real, styled, always-on chat path next to it.

## Prerequisites

- PHASE-22 merged: `@srgnt/harness` (connection, supervisor, registry, mock agent) and the dev console exist on `main`.
- Read [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (ACCEPTED: pinned `pi-acp@0.0.31` for phases 23–24) and [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] — the "Streamed-update shape" section is this step's ground truth for what a real turn looks like.
- Read `packages/desktop/src/main/dev-console/session-controller.ts` + `index.ts` end to end before writing any main-process code. They are the reference implementation for everything here.
- `pnpm install && pnpm build` green at repo root; app runs via `pnpm --filter @srgnt/desktop dev`.

## Likely Code Paths

- `packages/contracts/src/ipc/contracts.ts` — add product chat channels alongside the `dev:session:*` block: `chat:session:new`, `chat:session:prompt`, `chat:session:cancel`, `chat:session:dispose`, `chat:session:update` (main→renderer push). Follow the existing `SDevSession*` schema pattern (effect/Schema structs, `parseSync` at the IPC boundary). The new-session response must carry, beyond `sessionId` + `capabilities`: the harness `id`/`name` and its `quirks` array from the `HarnessDefinition` — STEP-23-03's trust badge and later capability-driven UI need them in the renderer.
- `packages/desktop/src/main/chat/` (new) — `ChatSessionController` modeled directly on `DevSessionController`: opaque console-local handles, one fresh `Supervisor` per session, `supervisor.register(handleId, launch)` + `AcpAgentConnection.connect({ launch, spawn: supervisor.spawnerFor(handleId), ports, capabilityOverrides })`, an update pump (`for await (const update of connection.updates(acpSessionId))`) fanning out to the push channel, `dispose()` kill-treeing via `supervisor.dispose(handleId)`. Targets: `mock` (scenario-driven, see STEP-23-05 for scenario injection) and `pi` (`piDefinition` from the registry).
- **CRITICAL — CJS/ESM boundary**: desktop main compiles to CommonJS; `@srgnt/harness` is ESM-only. Any new main-process module that imports `@srgnt/harness` values MUST load it via the memoized `Function('return import("@srgnt/harness")')()` indirection (see the comment block at the top of `dev-console/session-controller.ts`) and be reached from `main/index.ts` only through type-only imports + lazy `import()`, exactly like `dev-console/index.ts` does. A static value import will throw `ERR_REQUIRE_ESM` at app startup.
- `packages/desktop/src/main/index.ts` — register the chat IPC handlers next to `registerDevConsoleHandlers` (line ~114); reuse `getCwd: () => workspace.getRoot() || undefined` and hook the returned teardown into app quit so no agent process outlives the app.
- `packages/desktop/src/preload/index.ts` — expose `chatSessionNew/Prompt/Cancel/Dispose` + `onChatSessionUpdate` on `window.srgnt`, mirroring the `devSession*` block (lines ~185–200).
- `packages/desktop/src/renderer/components/chat/` (new) — `ChatView.tsx` (center panel), `MessageList.tsx`, `ThoughtBlock.tsx`, `Markdown.tsx`, plus a pure `transcriptReducer.ts` (see below). Register the panel in `packages/desktop/src/renderer/main.tsx`: add to `defaultPanels` (`id: 'chat'`, `section: 'main'`, order before `notes`) with an icon in `components/icons.tsx` (`navIcons`), and add a `case 'chat'` to the `activePanel` switch (~line 384).
- `transcriptReducer.ts` — a pure reducer folding raw `session/update` notifications into an **ordered segment list** (arrival order is the transcript order — never regroup by kind). The transcript state is an append-ordered array of segments, each with a stable reducer-assigned logical id (e.g. `seg-<n>`; ids are never reused or renumbered so React keys stay stable across appends): `agent_message_chunk` / `agent_thought_chunk` / `user_message_chunk` coalesce into the **current trailing segment only if** that segment is an open segment of the same kind (and, for tool-linked content, same role); any intervening update of a different kind (`tool_call`, `tool_call_update` for a new call, a thought chunk between message chunks, etc.) **closes the trailing segment and starts a new one** — so `message → tool_call → message` MUST yield two distinct message segments with the tool-call segment between them, never one merged message. `tool_call` / `tool_call_update` / `plan` / `available_commands_update` / `current_mode_update` are stored for steps 02–04 (stub segment entries fine this step; `tool_call_update` mutates its existing call segment in place rather than appending). **Tolerant reader rule (ARCH-0009):** unknown update kinds are ignored, never a crash — the spike observed `session_info_update`, which the mock does not even script.
- Styling: semantic tokens only (`--color-surface-*`, `--color-text-*`, `--color-border-*`, `--color-srgnt-*` in `renderer/styles.css`) and existing Tailwind classes (`bg-surface-secondary`, `card`, …). No parallel design system (phase acceptance criterion).

## Key Design Constraints (from the spike + repo reality)

- **Streaming volume:** one trivial real-Pi turn produced 37 thought chunks + 23 message chunks + 24 tool-call updates, interleaved. Do not re-render the whole transcript per chunk — batch reducer dispatches (e.g. rAF/microtask coalescing) and keep message identity stable so React reconciliation is cheap.
- **Markdown:** there is NO standalone markdown→HTML renderer in the repo — the notes "markdown machinery" is a CodeMirror *editing* stack (`codemirror-live-markdown`, `@codemirror/lang-markdown`). Assumption recorded: render agent message bodies with a **read-only CodeMirror `EditorView`** (`EditorState.readOnly` + the notes stack's lang-markdown/live-preview pieces) to get GFM parity without a new dependency; extract shared setup into `chat/Markdown.tsx` rather than importing `MarkdownEditor.tsx` wholesale. If this proves too heavy per-message, adding a small dedicated renderer dependency is an acceptable fallback — record whichever way it goes in Implementation Notes.
- **Thought blocks:** collapsible; assumption — default collapsed once the thought finishes, with a subtle "thinking…" indicator while chunks stream. Copy must not overpromise (thoughts are agent-reported, not verified).
- **Ephemeral only:** one session at a time, no persistence, no session list (Phase 24). Disposing the session on view unmount is NOT desired — the session must survive panel switches (see the DevConsoleGate keep-mounted comment for the trap); tie disposal to explicit user action + app quit.

## Execution Checklist

1. Add the `chat:*` IPC contracts + schemas in `@srgnt/contracts` (tests beside `contracts.test.ts` pattern).
2. Build `ChatSessionController` in `packages/desktop/src/main/chat/` with the lazy-ESM pattern; unit-test with an injected `connect` fn (see `dev-console/session-controller.test.ts` + `ipc.test.ts` for the fixture pattern — in-process `connectMockAgent` from `@srgnt/harness/testing`).
3. Wire preload + `main/index.ts` (handlers + quit teardown).
4. Build `transcriptReducer.ts` pure and test it against scripted update sequences copied from the spike's measured mix (interleaved thought/message/tool frames, unknown kinds).
5. Build ChatView + message/thought/markdown components; register the panel; render from the reducer state.
6. Manual smoke: `SRGNT_DEV_CONSOLE=1` not required — open the Chat panel, new mock session, prompt, watch stream; then a real Pi session if `pi` is installed (`npm i -g @mariozechner/pi`).

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering|STEP-23-01 Build ChatView streaming surface with message thought and markdown rendering]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy (accepted)]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]]
