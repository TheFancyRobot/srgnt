# Implementation Notes

## The read-only fs capability required a harness change

The brief's rule was "omit the write path from `ClientPorts` until STEP-23-03's engine is merged". That was not expressible as written: `buildClientCapabilities` in `packages/harness/src/acp/connection.ts` derived **both** fs flags from `ports.fs !== undefined`, so any port offering `readTextFile` also advertised `writeTextFile: true`. The only ways to honor the intent were to advertise write and then reject every call — a capability lie, in a phase whose entire premise is honesty — or to make the capability follow the method.

`FileSystemPort.writeTextFile` is therefore optional now, `buildClientCapabilities` reads `ports.fs?.writeTextFile !== undefined`, and `buildClient` only wires `client.writeTextFile` when the method exists. `createChatClientServices` defines that method **only** when an `authorizeWrite` callback is injected, and the controller injects none. Result: `initialize` advertises `fs: { readTextFile: true, writeTextFile: false }` and a spec-compliant agent never asks. STEP-23-03 enables writes by passing `authorizeWrite` — the guard, the audit events, and the typed refusal are already in place and tested.

## Path guard: canonical containment, not a prefix check

`createPathGuard` in `packages/desktop/src/main/chat/client-services.ts` canonicalizes by walking up to the nearest **existing** ancestor, `realpath`-ing that, and re-appending the segments that do not exist yet. That shape is what makes it correct for a write to a file that does not exist: the parent directory is the thing a symlink can lie about, so the parent is what must be resolved. Containment then requires a path separator, so `/tmp/proj` does not contain `/tmp/proj-evil`. I/O runs against the canonical path, not the caller's, so a syscall never re-traverses the symlinks that were just validated.

All four required cases are asserted in `client-services.test.ts`: `../` traversal, absolute-outside, prefix collision, and symlink escape through both the file itself and through a symlinked parent directory (the latter for a target that does not exist, which is the write case). A symlink resolving back *inside* the root is allowed, and every refusal emits an audit event so a denied read is visible rather than silent.

## The client terminal falls back from node-pty to plain pipes

node-pty's `posix_spawnp` fails outright on some machines — observed here on macOS 25 with node-pty 1.1.0, reproducible from a bare `node` script and outside any sandbox, and it also breaks the pre-existing `e2e/app.spec.ts` PTY-launch case. Before the fallback existed, the mock demo scenario's `use_terminal` directive failed the entire prompt turn with `ACP request session/prompt failed: Internal error`.

`nodePtyTerminalSpawn` now tries a real pty and falls back to `child_process.spawn` when it cannot get one. The command still runs and its output is still captured; only tty-ness (colours, window size, interactive prompts) is lost. The choice is made per spawn, not cached, so a transient failure cannot permanently downgrade a session. One unavailable native addon turning every agent command into a failed turn is a far worse outcome than a command running without a tty.

## fs audit event kinds did not already exist

The brief says the event kinds "already exist in `packages/contracts/src/session.ts`". They do not — `knownSessionEventKinds` has no `client/fs_*` entries. Because `kind` is deliberately an open string set (tolerant reader, ARCH-0009), the service emits `client/fs_read_text_file`, `client/fs_write_text_file`, and `client/fs_denied` without widening the contract. STEP-23-03 owns the audit surface and should decide whether to add them to the known list.

## Ports are built by the controller, before connect

`ChatConnectFn` now takes `(target, ports)`. The session cwd has to be known *before* `AcpAgentConnection.connect`, because client services are scoped to it and their presence is what `initialize` advertises — so `newSession` resolves the cwd, builds the services, and hands the ports in. `dispose` also calls `services.disposeAll()`: client terminals are children of the Electron main process, not of the agent, so the supervisor's kill-tree cannot reach them.

## Terminal output rides its own IPC channel and its own context

`chat:terminal:output` (`SChatTerminalOutputEvent`: `sessionId`, `terminalId`, `chunk`) carries output of terminals the *agent* created. In the renderer it lands in `ChatTerminalProvider`, nested **inside** `ChatSessionProvider` rather than merged into it: a chatty command emits far more chunks than the transcript does, and folding them into the session value would re-render every transcript consumer for output only one card is looking at. Chunks accumulate append-only per terminal id, so a card that only learns its terminal id from a later `tool_call_update` still sees everything from the beginning (asserted).

`GhosttySurface` writes only the new tail of the buffer, and clears + rewrites if the buffer ever shrinks (the client truncated it to its byte cap) — the only honest response to a buffer that lost data.

## `fullBleed` and side panels were mutually exclusive

`AppLayout` suppressed side panels whenever `fullBleed` was set, and chat is full-bleed — so registering `sidePanelContent` on the chat `PanelDefinition` alone would have rendered nothing at all. Rather than redefine `fullBleed`, it gained an optional `showSidePanel` override that chat passes. The existing "does not render side panel when fullBleed is true" test stays true and meaningful.

## Plan entries are parsed at the panel, not in the reducer

`transcript.plan` stays the raw `entries` payload, so STEP-23-01's reducer contract and its test are untouched. `readPlanEntries` in `ChatPlanSidePanel.tsx` is the tolerant parse: spec defaults for missing `priority`/`status`, malformed entries skipped rather than throwing the panel away. Replacement semantics were already correct in the reducer — a `plan` update overwrites, and an empty list clears the panel.

## Reducer: terminal status wins

Once a call reaches `completed`/`failed`, a later `pending`/`in_progress` is ignored; terminal → terminal (`completed` → `failed`) still applies, because that is new information. Both out-of-order frames and late post-turn updates were observed shapes in the STEP-22-05 spike, and walking a finished call backwards into a spinner that never resolves is the visible failure mode. Content blocks are parsed into `text` | `diff` | `terminal` | `unsupported`; unrenderable blocks are kept and shown, because for Pi the tool-call payload is the *only* evidence of agent activity and silently dropping it is how a UI starts lying.

## Diff view

`@codemirror/merge@^6.12.2` was genuinely missing, exactly as the brief's gotcha said. It mounts and diffs correctly under jsdom, so `DiffView.test.tsx` asserts the real editor rather than a stub. Read-only is enforced twice — `EditorView.editable.of(false)` removes the contenteditable surface and `EditorState.readOnly.of(true)` blocks programmatic edits — plus `mergeControls: false`, so there are no accept/reject buttons: srgnt shows what the agent did, it does not offer to re-apply it.

## The mock demo scenario is now a fixture with a test

`MOCK_DEMO_SCENARIO` is exported from `session-controller.ts` and validated against the mock agent's own scenario schema in a test — a typo in a directive would otherwise only surface as a chat session that dies the moment a user clicks Start. It scripts a plan (twice, to show replacement), a diff-bearing tool call, and a `use_terminal` terminal embed, so one manual `pnpm dev` run covers every card variant. It can reference `chat-term-1` in a `terminal` content block *before* the terminal exists because the port assigns ids deterministically per session; real agents learn the id from `terminal/create`, so this is a fixture convenience only.

## Gotcha for the next agent

Still true from STEP-23-01, and it bit again: `@srgnt/desktop` typechecks against the **built** `dist/` of `@srgnt/contracts` and `@srgnt/harness`. After changing a schema or a port interface, run `pnpm --filter @srgnt/contracts build` and `pnpm --filter @srgnt/harness build` or the desktop typecheck reports errors about the old shapes. The preload also keeps its own inlined copy of `ipcChannels` (it runs sandboxed and cannot import runtime values), so a new channel must be added in **both** places.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel|STEP-23-02 Render tool-call cards with diff and terminal embeds and plan panel]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
