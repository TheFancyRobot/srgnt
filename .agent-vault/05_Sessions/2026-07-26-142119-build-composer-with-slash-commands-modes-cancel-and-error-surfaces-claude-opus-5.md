---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Build composer with slash commands modes cancel and error surfaces
session_id: SESSION-2026-07-26-142119
date: '2026-07-26'
status: complete
owner: claude-opus-5
branch: phase/23-step-04-composer
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
related_bugs: []
related_decisions: []
created: '2026-07-26'
updated: '2026-07-26'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-07-26-142119
  status: complete
  updated_at: '2026-07-26T16:45:00.000Z'
  current_focus:
    summary: 'STEP-23-04 complete: composer with slash commands, session modes, cancel and crash/error surfaces; validation green.'
    target: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]'
    section: Context Handoff
  last_action:
    type: completed
---

# claude-opus-5 session for Build composer with slash commands modes cancel and error surfaces

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 14:21 - Created session note.
- 14:21 - Linked related step [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces|STEP-23-04 Build composer with slash commands modes cancel and error surfaces]].
- Read the step's Execution Brief and Validation Plan, then traced the live surfaces: `ChatView.tsx` (minimal composer from 01), `ChatSessionContext.tsx`, `transcriptReducer.ts` (`availableCommands`/`currentModeId` stored but unrendered), `main/chat/session-controller.ts`, `main/chat/index.ts`, preload, and the mock-agent runner's `advertise_commands` / `set_mode` / `expect_cancel` / `crash` / `initialize.modes` handling.
- Contracts: added `chat:session:set-mode` and `chat:session:status` channels plus typed structs `SChatSessionMode`, `SChatSessionModes`, `SChatSessionSetModeRequest/Response`, `SChatSessionStatus(Event)`; extended `SChatSessionNewResponse` with an optional `modes` block. No `Schema.Unknown` anywhere in the new payloads.
- Controller: `newSession` now reads and mirrors advertised modes (tolerant `readModes` helper), stores the advertised mode-id set, and subscribes to the per-session supervisor via a new optional `ChatConnection.onSupervisorEvent`. Added `ChatSessionController.setMode` (rejects an unadvertised `modeId` before any ACP call) and the exported pure mapper `supervisorEventToStatus`. A death status also releases pending permission prompts; `dispose` unsubscribes first so a reap never pushes status for a forgotten session.
- IPC/preload/env.d.ts: registered the `set-mode` handler with `parseSync`, pushed status frames over `chat:session:status`, and exposed `chatSessionSetMode` / `onChatSessionStatus` on `window.srgnt` using the existing inlined-channel pattern.
- Renderer: new `components/chat/Composer.tsx` (slash popover, mode selector, send/stop, stop-reason notices, crash banner with stderr tail and a "New session" affordance). `ChatView.tsx` now owns only session lifecycle + transcript and renders `<Composer />`; the duplicated header Stop button was removed. `ChatSessionContext` gained `modes` on the session, `setMode`, `agentStatus`, `lastStopReason`, and `sendPrompt` now resolves `boolean` so the composer can restore the draft after a failed turn.
- Styles: added slash-menu, mode-select, stop-notice and agent-down blocks to `renderer/styles.css`.
- `MOCK_DEMO_SCENARIO` now advertises three slash commands and five session modes, so both new controls are reachable in a manual `pnpm dev` run rather than only in tests.
- Wrote 28 Composer component tests, 13 new controller tests, 1 new IPC test, and 15 new contracts tests; ran the full validation plan plus a real-process orphan check.
<!-- AGENT-END:session-execution-log -->

## Findings

- **The brief's "parseSync-on-receive in the preload" is not achievable and not the existing pattern.** The preload runs with `sandbox: true` and therefore cannot import runtime values from `@srgnt/contracts` at all (BUG-0002; guarded by `preload-ipc-sync.test.ts`, which asserts every `@srgnt/*` import is type-only). The real guard the existing push channels use is the *inlined channel-name allowlist* plus `parseSync` at the main-process `ipcMain.handle` boundary. The new channels follow that same pattern exactly; nothing regressed, but the brief's wording overstated what the preload does today.
- **`gave-up` carries no `ExitInfo`.** `SupervisorEvent`'s `gave-up` variant is only `{ kind, id, restarts }`. The stderr tail the brief asked for has to be threaded from the `crashed` event that immediately precedes it (the supervisor emits `crashed` then `gave-up` from the same exit handler). `supervisorEventToStatus` takes that tail as an explicit argument and the controller remembers it per session.
- **`exited` is already the clean-exit-only path.** The supervisor routes reaped exits to `reaped` and crash exits to `crashed`, returning early in each case, so `exited` only ever means "the agent quit on its own with status 0". No extra filtering was needed; only `reaped` is dropped from the pushed union.
- **Cancel → pending-permission dismissal is confirmed end to end through the renderer**, closing STEP-23-03's carry-forward. The chain is Composer Stop → `ChatSessionContext.cancel` → `chat:session:cancel` → `ChatSessionController.cancel` → `permissions.cancelAll('cancelled')` → `chat:permission:close` → `ChatSessionContext` drops the prompt. `Composer.test.tsx` drives the whole path with a stub whose `chatSessionCancel` fires the close frame exactly as desktop-main does, and asserts the prompt visibly disappears. Also newly covered: a *crash* releases pending prompts too (the status handler calls `cancelAll`), which the Validation Plan listed as an edge case.
- **A cancelled turn is still a turn in flight.** Preserved from STEP-23-01 and now asserted in the composer: Stop does not re-enable Send; only the prompt promise settling does. Both buttons stay mounted (exactly one enabled) rather than swapping, so cancel-with-no-turn is a literal disabled no-op — the Validation Plan's "no error toast spam" edge case — and the controls do not jump under the pointer mid-turn.
- **Draft preservation needed a signal, not a guess.** `sendPrompt` now resolves `boolean`; the composer clears the draft optimistically and restores it only if the turn failed *and* the user has not started typing something new. That satisfies "input NOT cleared on error/crash" without leaving the text in place after a successful send.
- **`slashQuery` is caret-based, not value-based.** Triggering off the whole draft would open the menu for `a/b` in prose and would not re-open after the caret moved back into a `/token`. The helper is exported and unit-tested separately from the component.
- **Modes are absent, never empty.** `readModes` returns `undefined` for a missing *or malformed* `modes` block, and the contract makes `modes` optional, so "no selector" and "broken empty dropdown" cannot be confused. `setMode` on a session with no advertised modes is rejected for the same reason a bogus id is.

## Context Handoff

STEP-23-04 is complete on branch `phase/23-step-04-composer`; the orchestrator owns the commit and PR. The frontier moves to STEP-23-05 (mock-agent-driven chat E2E coverage).

What the next agent needs to know:

- `components/chat/Composer.tsx` is now the single input surface. `ChatView.tsx` owns only session lifecycle (target select, Start, End session) and the transcript; it no longer holds a draft, a keymap, or a Stop button.
- Two new IPC channels exist and are fully typed: `chat:session:set-mode` (request/response) and `chat:session:status` (main→renderer push). Neither uses `Schema.Unknown`. `SChatSessionNewResponse.modes` is optional and is the only source of the mode selector's existence.
- `ChatConnection.onSupervisorEvent` is the new (optional) seam through which a session's supervisor reaches the controller. In-process test connections omit it; `defaultChatConnect` provides it. `supervisorEventToStatus` is exported and pure — extend the crash surface there, not in the subscription closure.
- `ChatSessionContext.sendPrompt` now resolves `boolean` (turn ran / turn failed). Any new caller must handle that, and the composer relies on it for draft preservation.
- `MOCK_DEMO_SCENARIO` gained `initialize.modes` and an `advertise_commands` directive. STEP-23-05 is expected to replace this fixed script with injectable scenarios; when it does, keep both of those advertised or the manual `pnpm dev` path loses the slash menu and the mode selector.
- Two manual passes remain owed (mock walkthrough, real Pi). They are listed under Follow-Up Work and were not performed in this session.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/contracts/src/ipc/contracts.ts` - `chatSessionSetMode`/`chatSessionStatus` channels, mode + status schemas, optional `modes` on the new-session response.
- `packages/contracts/src/ipc/contracts.test.ts` - set-mode round-trip, status-push, and modes decode/reject coverage.
- `packages/desktop/src/main/chat/session-controller.ts` - advertised-mode mirroring, `setMode`, `supervisorEventToStatus`, supervisor subscription + unsubscribe on dispose, richer `MOCK_DEMO_SCENARIO`.
- `packages/desktop/src/main/chat/session-controller.test.ts` - mode, cancel-mid-stream, crash, status-mapping and unsubscribe tests.
- `packages/desktop/src/main/chat/index.ts` - `chat:session:set-mode` handler, `chat:session:status` push wiring.
- `packages/desktop/src/main/chat/ipc.test.ts` - set-mode routing/rejection and status-push assertions.
- `packages/desktop/src/preload/index.ts` - inlined channels, `chatSessionSetMode`, `onChatSessionStatus`, `modes` in the new-session type.
- `packages/desktop/src/renderer/env.d.ts` - matching `window.srgnt` types.
- `packages/desktop/src/renderer/components/chat/Composer.tsx` - **new**; the composer, slash menu, mode selector, stop-reason and crash surfaces.
- `packages/desktop/src/renderer/components/chat/Composer.test.tsx` - **new**; 28 tests.
- `packages/desktop/src/renderer/components/chat/ChatView.tsx` - delegates the composer, drops the duplicated Stop button.
- `packages/desktop/src/renderer/components/chat/ChatSessionContext.tsx` - session modes, `setMode`, `agentStatus`, `lastStopReason`, boolean-resolving `sendPrompt`.
- `packages/desktop/src/renderer/styles.css` - composer/slash-menu/mode/stop-notice/agent-down styles.
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
All commands run in the foreground on macOS (darwin 25.5.0), 2026-07-26.

- `pnpm --filter @srgnt/desktop test` — **PASS**, 57 files / 1035 tests (was 993 before this step; +42). Includes the 28 new `Composer.test.tsx` tests, the 13 new controller tests, and the new IPC test.
- `pnpm --filter @srgnt/contracts test` — **PASS**, 7 files / 159 tests (was 144; +15 for set-mode, status push, and the modes block).
- `pnpm --filter @srgnt/harness test` — **PASS**, 13 files passed / 2 skipped, 113 tests passed / 2 skipped. No harness changes were needed, as the Validation Plan predicted.
- `pnpm --filter @srgnt/desktop typecheck` — **PASS** (main, preload, renderer projects).
- `pnpm lint` — **PASS** across contracts, harness (incl. the harness boundary check), runtime, desktop.
- `pnpm --filter @srgnt/desktop build` — **PASS**; main, preload and renderer bundles build.
- Real-process crash/orphan check (throwaway script in the scratchpad, run from `packages/harness` against the built mock bin under a real `Supervisor`): spawned pid 31088 → supervisor emitted `spawning, ready, crashed` → the prompt failed `ConnectionLost` → after dispose, `process.kill(pid, 0)` reported the pid **dead**. This is the evidence behind "no orphaned processes" and behind the `supervisorEventToStatus` inputs being the real event shapes.

Not run: the manual `pnpm dev` mock walkthrough and the real-Pi run. See Follow-Up Work.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None. No new bug notes were created; the two brief inaccuracies found (preload `parseSync`, `gave-up` stderr tail) are documentation-level and are recorded under Findings rather than as bugs.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- No new decision notes. Three implementation choices worth naming, all inside the latitude the step's recorded assumptions already granted:
  - The composer is a plain `<textarea>` plus a custom popover, not CodeMirror — the assumption the Execution Brief recorded, now realized. The notes editor's `SlashCommandsExtension.ts` was read for interaction patterns only; no code was shared.
  - Send and Stop stay mounted together (exactly one enabled) instead of swapping, which keeps STEP-23-01's "send disabled while a turn is in flight" behavior literally intact and makes cancel-with-no-turn a disabled no-op.
  - Crash recovery is dispose + fresh `session/new` with the dead transcript left visible until the user acts — the ephemeral-phase behavior the brief recorded; `session/load` restore stays Phase 24.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Continue at [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]].
- [ ] **Manual `pnpm dev` walkthrough against the mock** — a full keyboard-only conversation exercising the slash menu, the mode selector, Stop mid-turn, and the permission prompt. `MOCK_DEMO_SCENARIO` now advertises commands and modes specifically so this is reachable by hand. Not performed in this session (no interactive Electron window available to the executing agent); every listed behavior is covered by automated tests through the real provider, but a human pass is still owed.
- [ ] **Manual real-Pi run** — switch thinking level via the mode selector, cancel a long turn, and kill the `pi-acp` process externally to confirm the crash banner and recovery. Requires Pi installed locally. The `spawning/ready/crashed` event shapes were confirmed with a real spawned process (see Validation Run), so the remaining risk is Pi-adapter-specific, not supervisor-specific.
- [ ] STEP-23-05 (mock-agent-driven chat E2E coverage) should fold the `expect_cancel` and `crash` scenarios exercised here into its scenario-driven suite, replacing the fixed `MOCK_DEMO_SCENARIO` script.
- [ ] The crash banner currently offers only "New session" (dispose + fresh `session/new`), which is the correct ephemeral-phase behavior. `session/load`-based restore of the dead transcript belongs to Phase 24, as the brief recorded.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

STEP-23-04 is **complete**. Every acceptance check in the Validation Plan is implemented and covered by an automated test, and the four validation commands plus a real-process orphan check were run in the foreground and passed (see Validation Run for the exact counts).

Delivered: a real composer (`Composer.tsx`) with the STEP-23-01 keymap preserved (Enter sends, Shift+Enter newlines, IME `isComposing` guard, send disabled while a turn is in flight); a slash-command menu rendered entirely from `available_commands_update` with filtering, keyboard navigation, insert-on-select and empty-list degradation; a session-mode selector that exists only when the agent advertises modes, switches through a new typed `chat:session:set-mode` channel, and follows agent-initiated `current_mode_update`; a distinct rendering for every `StopReason`; and an agent-crash surface fed by supervisor events over a new typed `chat:session:status` channel, with the stderr tail, a preserved read-only transcript, and a working "New session" recovery.

STEP-23-03's carry-forward is closed: the composer's Stop path reaches `ChatSessionController.cancel`, and a pending permission prompt visibly dismisses — asserted through the real provider and `ChatView`, not only at the controller level. A crash now releases pending prompts on the same principle.

Remaining: the two manual passes (mock walkthrough, real Pi) listed under Follow-Up Work. They are verification, not implementation — nothing in the step is left half-built. The session ended in a clean handoff state; the next unit is STEP-23-05.
