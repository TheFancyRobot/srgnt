# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop test` — Composer/slash-menu/mode-selector component tests, controller status-mapping tests, in-process mock integration tests (`expect_cancel`, `crash` scenarios).
- `pnpm --filter @srgnt/contracts test` — `chat:session:set-mode` / `chat:session:status` schemas.
- Manual mock + manual Pi runs as described in the brief.

## Acceptance Checks

- Enter submits, Shift+Enter inserts newline; submit disabled while a turn is in flight; input NOT cleared on error/crash.
- Cancel mid-stream: Stop → agent receives `session/cancel`, prompt resolves `stopReason: 'cancelled'`, turn is marked stopped, the SAME session accepts the next prompt (no dispose) — proven with the `expect_cancel` mock scenario.
- Slash menu opens on `/`, filters as typed, keyboard-navigable, inserts the command; renders live from `available_commands_update` (change the scenario's advertised commands → menu changes with zero code edits).
- Mode selector renders only when modes exist; user switch calls `session/set_mode`; agent-driven `current_mode_update` (mock `set_mode` directive) updates the selector without user action.
- IPC payload contracts are typed, not `Schema.Unknown`: `chat:session:set-mode` request `{sessionId, modeId}` and response `{ok, currentModeId}`, and `chat:session:status` push `{sessionId, status, stderrTail?, exitCode?, message?}` each decode a valid payload and REJECT a malformed one (missing `sessionId`, unknown `status`, wrong types) in the contracts test; a `set-mode` with a `modeId` not in the session's advertised modes is rejected before any ACP call. Preload/controller round-trip test asserts the same schemas guard both directions (no raw `ipcRenderer` passthrough).
- Every stop reason has a distinct, sensible rendering (`end_turn`, `cancelled`, `max_tokens`, `max_turn_requests`, `refusal`).
- Crash mid-turn (mock `crash` directive): inline recoverable error with detail (stderr tail when present), transcript preserved read-only, "New session" affordance works — and no white screen (ErrorBoundary NOT triggered).
- After crash + supervisor give-up, `ps` shows no surviving agent child processes; app quit during an active turn leaves no orphans.

## Edge Cases

- Cancel when no turn is in flight → no-op, no error toast spam.
- Cancel racing turn completion (turn ends before cancel lands) → whichever stop reason arrives renders; no stuck busy state.
- Crash while a permission prompt is pending (with STEP-23-03) → prompt dismisses, crash banner shows, agent-side future resolved.
- `available_commands_update` arriving mid-menu-open → list updates without crashing the popover; empty update closes/hides the menu.
- Composer text containing only `/` or an unknown command → sends as plain prompt text (agent decides; srgnt does not validate commands).
- Rapid submit after cancel (`cancelled` turn → immediate new prompt) → controller serializes correctly, no interleaved-turn corruption.

## Regression Expectations

- Steps 01–03 chat suites stay green; dev console unchanged.
- `pnpm --filter @srgnt/harness test` green (supervisor events and cancel are existing APIs — no harness changes expected; if a harness change proves necessary, it must be an additive one with its own tests and be called out in the Outcome note).

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
