# Outcome

## Result

DONE. The Chat panel is registered in the activity bar's main section (order 0, before Notes) and renders a live ephemeral ACP session end to end: user messages appear on submit, thought chunks accumulate into a collapsible block, agent message chunks accumulate into one GFM-rendered message, and tool calls appear in arrival order between message segments. Built on the existing layout components and semantic tokens — no parallel design system.

Shipped surface:

- `@srgnt/contracts`: `chat:session:*` channels + `SChat*` schemas; the new-session response carries harness `id`/`name`/`quirks` for STEP-23-03's trust badge.
- desktop main: `main/chat/{session-controller,index}.ts` — `ChatSessionController` modeled on `DevSessionController` with the mandatory lazy-ESM harness load, always-registered IPC, lazily constructed controller, app-quit kill-tree teardown.
- preload + `env.d.ts`: `chatSession*` and `onChatSessionUpdate` on `window.srgnt`.
- renderer: `components/chat/{transcriptReducer,Markdown,ChatSessionContext,ChatView,MessageList,ThoughtBlock}` plus panel/icon registration and token-only CSS.

## Validation Performed

- `pnpm --filter @srgnt/contracts test` — 139/139.
- `pnpm --filter @srgnt/desktop test` — 850/850, including 75 new tests for this step (contracts 14, main-process controller/IPC 12, reducer 27, markdown 19, ChatView 17 — 89 counting the contracts package separately).
- `pnpm --filter @srgnt/desktop typecheck` and `pnpm typecheck` (root) — clean.
- `pnpm --filter @srgnt/desktop build` — clean; the CJS/ESM boundary was verified in the emitted output (`dist/main/chat/` has zero `require("@srgnt/harness")`; the `Function('return import(...)')` indirection survived the CommonJS transform).
- `pnpm --filter @srgnt/harness test` — 112 passed / 2 skipped (pi integration, needs the `pi` CLI). No harness changes.
- `pnpm --filter @srgnt/desktop test:e2e` — 70 passed / 2 failed, both on the documented pre-existing baseline (macOS node-pty `posix_spawnp` in `app.spec.ts:129`; `bug-0013-visual` needing a Linux-only binary). The historical baseline was 68 passed / 3 failed, so this run is a strict improvement and the new panel added zero e2e failures.
- Real-path smoke (throwaway Playwright spec, run then deleted — STEP-23-05 owns the committed chat e2e): spawned a real mock-agent process and asserted panel registration, streamed thought/tool/message rendering, exactly 2 agent messages for the scenario's `message -> tool_call -> message` (proving chunks do not merge across a tool call on the real stream), rendered `<h2>` and `<table>`, session survival across a panel switch, and clean dispose. `ps` afterwards showed no orphaned agent process.

## Follow-Up

- **STEP-23-03 must replace** `autoApprovePermission` in `packages/desktop/src/main/chat/session-controller.ts` with the real renderer permission round-trip; it is a deliberate placeholder because this step ships no permission UI. The trust badge can read `session.quirks`, already plumbed through and rendered as a quirk-count chip.
- STEP-23-02 consumes `ToolCallSegment` (carries `toolCallId`/`title`/`status`/`toolKind`/`content`/`rawInput`/`rawOutput`) and `TranscriptState.plan`, replacing the placeholder card in `MessageList.tsx`.
- STEP-23-04 owns the real composer; `TranscriptState.availableCommands` and `currentModeId` are already captured for it.
- STEP-23-05 owns scenario injection; the fixed demo scenario currently lives inline in `mockLaunchSpec()` and should move behind that injection point.
- Not verified on this host: a real `pi`-target session (the `pi` CLI is not installed) and a human light/dark eyeball. Theme correctness is enforced structurally instead — tokens only, with a test asserting the rendered markdown contains no hex or `rgb()` literals.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering|STEP-23-01 Build ChatView streaming surface with message thought and markdown rendering]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
