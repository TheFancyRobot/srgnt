# Implementation Notes

## Markdown: rendered from the lezer tree, not a read-only EditorView

The brief's recorded assumption was a read-only CodeMirror `EditorView` per message, with "a small dedicated renderer dependency" as an acceptable fallback. Neither was needed. `@lezer/markdown` is already a direct `@srgnt/desktop` dependency and is the exact parser `@codemirror/lang-markdown` drives, so `packages/desktop/src/renderer/components/chat/Markdown.tsx` renders `parser.configure(GFM)`'s syntax tree straight to React elements. This gives GFM parity with the notes editor by construction, adds no dependency, and avoids instantiating CodeMirror per streamed message — which matters because the spike measured 23 message chunks in one trivial turn, each re-rendering the open message.

Two constraints fell out of it:

- `@lezer/common` is only a *transitive* dependency, so under pnpm's strict layout `import type { SyntaxNode, Tree } from '@lezer/common'` does not resolve. The tree types are derived from the parser instead (`type Tree = ReturnType<typeof gfmParser.parse>`; `type SyntaxNode = Tree['topNode']`), which is exact and declares nothing new.
- Agent output is untrusted, so raw HTML renders as literal text (never `dangerouslySetInnerHTML`), link hrefs are scheme-checked against `https?|mailto` before becoming anchors (and open via `window.srgnt.openExternal`, never navigating the renderer), and images render as their alt text rather than fetching an agent-supplied remote URL from inside the app.

## Reducer: what "arrival order" actually required

`chat/transcriptReducer.ts` is pure and holds the ordering contract every later step depends on. The subtle rule is which updates close an open text run:

- Recognized non-matching kinds (`tool_call`, `tool_call_update`, `plan`, a thought chunk between message chunks) DO close it — so `message -> tool_call -> message` yields two distinct message segments.
- Unknown kinds do NOT. The spike observed `session_info_update` interleaved mid-message; closing on it would shred one agent message into several bubbles for no user-visible reason. Ignored updates are counted in `ignoredUpdateCount` for diagnostics.
- `tool_call_update` mutates its existing call segment in place (id and position preserved so the card cannot jump), but an update for a call whose opening frame was never seen is appended rather than dropped.

Segment ids come from a monotonic counter (`seg-<n>`), never reused or renumbered, so React keys stay stable across appends — asserted directly.

## Session state lives above the panel switch

`renderContent()`'s `switch (activePanel)` in `renderer/main.tsx` unmounts the panel component, so session state held inside `ChatView` would be destroyed by a visit to Notes — dropping the session handle without disposing it and stranding a live agent process in main with nothing left to cancel it by (the trap documented on `DevConsoleGate`). `ChatSessionProvider` therefore wraps the layout in `main.tsx`, and disposal is tied to explicit user action plus app quit only. Streamed frames are buffered and flushed once per animation frame rather than dispatched individually.

## Chat IPC is not flag-gated, but the harness is still lazy

Unlike the dev console, `chat:session:*` channels are always registered — this is the shipped product path. The harness-backed controller is still constructed on first use, so an app whose user never opens a chat session never loads the ESM `@srgnt/harness` and never spawns an agent process; the app-quit teardown is a no-op in that case (covered by a test). The mandatory `Function('return import("@srgnt/harness")')()` indirection was verified in the *emitted* CJS, not just at test time: `dist/main/chat/` contains zero `require("@srgnt/harness")`.

## Temporary permission placeholder (STEP-23-03 must remove it)

`autoApprovePermission` in `packages/desktop/src/main/chat/session-controller.ts` auto-selects the first `allow` option. This step ships no permission UI, so a blocking prompt would hang the turn with nothing on screen to resolve it. It is commented as temporary and must be replaced by STEP-23-03's renderer round-trip honoring default-ask.

## Gotcha for the next agent

`@srgnt/desktop` resolves `@srgnt/contracts` to `dist/`, not source. New schemas are `undefined` at runtime until `pnpm --filter @srgnt/contracts build` runs, and the symptom is a confusing `Cannot read properties of undefined (reading 'ast')` from effect's `decodeUnknownSync`.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering|STEP-23-01 Build ChatView streaming surface with message thought and markdown rendering]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
