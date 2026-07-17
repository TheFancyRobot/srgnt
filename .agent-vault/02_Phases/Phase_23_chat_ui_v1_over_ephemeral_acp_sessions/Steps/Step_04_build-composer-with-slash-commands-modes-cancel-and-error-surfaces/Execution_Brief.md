# Execution Brief

## Why

- The composer is the user's only input surface; cancel and crash handling are where "no white screens, no zombie processes" (phase acceptance criteria + ARCH-0009 failure modes) become real. Steps 01–03 made the session observable; this step makes it *drivable and recoverable*.
- Slash commands and modes must render from live agent data (`available_commands_update`, session modes) — the spike proved both arrive for real agents (Pi advertises commands mid-session and exposes thinking levels `off…xhigh` as ACP session modes with `currentModeId: high`), so nothing may be hardcoded.

## Prerequisites

- STEP-23-01 merged (update stream + controller); STEP-23-03's cancel-vs-permission interaction is coordinated but not blocking (04 owns the cancel affordance; 03 owns resolving pending prompts on cancel).
- Read the harness error taxonomy: `packages/harness/src/acp/errors.ts` (`TurnFailed`, `ConnectionLost`, `SpawnFailed`) and `supervisor/types.ts` `SupervisorEvent` (`spawning | ready | crashed | gave-up | reaped | exited`) — these are the inputs to the crash surface.
- Read the mock directives that script this step's scenarios: `expect_cancel` (blocks the turn until `session/cancel`, 5s safety timeout), `crash` (process death mid-turn), `advertise_commands`, `set_mode`, plus `initialize.modes` (advertised session modes).
- Stop reasons (`SStopReason`): `end_turn`, `cancelled`, `max_tokens`, `max_turn_requests`, `refusal` — each needs a sensible end-of-turn presentation.

## Likely Code Paths

- `packages/desktop/src/renderer/components/chat/Composer.tsx` (new) — multiline textarea: Enter submits, Shift+Enter newlines; disabled-with-spinner while a turn is in flight; Stop button swaps in during `prompting`. **Assumption recorded:** the composer is a plain `<textarea>` + custom popover for the slash menu — NOT a CodeMirror instance. The notes `SlashCommandsExtension.ts` is CodeMirror-specific; reuse its *interaction patterns* (filtering, keyboard navigation, `/` trigger at line start) but not the code.
- Slash-command menu: state fed by `available_commands_update` from the transcript reducer (list of `{name, description}`). Typing `/` opens the filtered menu; selecting inserts `/name ` into the input. Commands are sent to the agent as ordinary prompt text (ACP has no separate command call — the agent parses its own commands). Empty command list → no menu, no dead UI (capability-driven degradation).
- Mode selector: session modes come from the `session/new`/`session/load` response `modes` field and `current_mode_update` notifications; switching calls `connection.setMode` via a new `chat:session:set-mode` IPC channel (add to contracts + preload + controller). Hidden entirely when the agent advertises no modes. For Pi this selector IS the thinking-level control (`off, minimal, low, medium, high, xhigh`) — measured in spike probe 3.
- Cancel: Stop button → `chat:session:cancel` (controller.cancel already exists from STEP-23-01, mirroring `DevSessionController.cancel`). The in-flight `prompt` then resolves with `stopReason: 'cancelled'` — render the turn as user-stopped, keep the session alive for the next prompt (mid-turn safe: the mock `expect_cancel` scenario proves the sequencing).
- Stop-reason surfaces: `end_turn` quiet; `cancelled` "stopped by you"; `max_tokens`/`max_turn_requests` visible limit notice; `refusal` visible refusal notice. Turn errors (`TurnFailed`) render as an inline error block with the message — never a white screen (the app-level `ErrorBoundary.tsx` is the last resort, not the plan).
- Crash/restart surface: subscribe the chat controller to `supervisor.onEvent` and push `crashed`/`gave-up` (with stderr tail from `SupervisorGaveUp`) to the renderer over a `chat:session:status` push channel. Renderer shows a recoverable error state with a "New session" affordance. **Ephemeral-phase reality (assumption):** restart = dispose + fresh `session/new`; transcript of the dead session stays visible read-only until the user starts the new one. `session/load`-based restore is Phase 24 (even though Pi supports `session/load`, there is no persistence to reload from this phase).
- Dispose/quit hygiene: app quit runs the controller teardown (kill-tree) — already wired in STEP-23-01; this step adds the crash-path assertion that a crashed-and-given-up session leaves no live child processes.

## Key Design Constraints

- Nothing hardcoded: commands, modes, and their visibility all derive from live agent data or its absence (phase acceptance criterion).
- The composer must keep user-typed text through a crash (do not clear input on error).
- Double-submit prevention: submit disabled while `prompting`; cancel is idempotent (a second click is a no-op, mirroring `DevSessionController.cancel`'s error surfacing).
- Busy state must derive from the prompt round-trip, not from update frames (updates can keep arriving briefly after cancel).

## Execution Checklist

1. Build `Composer` with submit/busy/stop wiring against the existing controller IPC; component tests for Enter/Shift+Enter, disabled states, and stop-reason rendering.
2. Add slash-menu popover fed by reducer state; tests for filtering, keyboard nav, insert-on-select, and the empty-list case.
3. Add `chat:session:set-mode` IPC + mode selector; tests for hidden-when-no-modes and `current_mode_update` reflecting an agent-initiated change (mock `set_mode` directive).
4. Wire supervisor events → `chat:session:status` push → crash banner + "New session" recovery; unit-test the controller mapping (`crashed`, `gave-up` with stderr tail).
5. In-process integration tests with mock scenarios: `expect_cancel` (cancel mid-stream → `cancelled` stop reason, session reusable) and `crash` (turn fails → recoverable state, no orphan).
6. Manual: full keyboard-only conversation against the mock; then real Pi — switch thinking level via the mode selector, cancel a long turn, kill the pi-acp process externally and confirm the crash banner + recovery.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]] (probe 3: Pi thinking levels are ACP session modes)
