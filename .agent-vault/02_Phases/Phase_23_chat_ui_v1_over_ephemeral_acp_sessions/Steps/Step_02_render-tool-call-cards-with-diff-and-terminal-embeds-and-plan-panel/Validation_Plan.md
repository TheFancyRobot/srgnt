# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop test` — reducer upsert/plan tests, ToolCallCard/DiffView/plan-panel component tests, `client-services` path-guard + pty tests.
- `pnpm --filter @srgnt/desktop typecheck && pnpm --filter @srgnt/desktop build` — CJS main bundle still compiles (client services live in main).
- Manual mock run: scenario with `tool_call`(diff content) → `tool_call_update`(completed), `use_terminal`, `plan` directives.
- Manual Pi run (when `pi` CLI installed): "create a file with some content, then run ls" — observe live card updates.

## Acceptance Checks

- Every `SToolKind` value renders a distinct, labeled card (fixture matrix test); unknown kinds fall back to `other` styling without crashing.
- Status transitions render live: `pending → in_progress → completed` and `→ failed` (failed state visually distinct via `--color-error-*` tokens).
- `tool_call_update` for an unknown `toolCallId` creates a placeholder card (no drop, no throw).
- Diff content renders old/new correctly, read-only, with large unchanged regions collapsed; no editing possible.
- `terminal` content block embeds live output for a client-created terminal (mock `use_terminal` end-to-end through node-pty); plain-text `rawOutput`/content renders as a monospace block (Pi path).
- Plan updates replace the full entry list in the side panel; priorities and statuses render; an empty plan update clears the panel.
- `fs/read_text_file` succeeds inside cwd and is refused outside it (typed error asserted in test); every `fs/*` call appends an audit event to the in-memory event stream.
- `fs/write_text_file` is either absent from `ClientPorts` (pre-STEP-23-03) or routed through the permission engine — it must never silently write.

## Edge Cases

- Out-of-order updates: `completed` before `in_progress`; a late update after turn end (merges quietly, terminal status wins).
- Diff with missing `oldText` (new-file) and empty `newText` (deletion) render sensibly.
- Terminal process that never exits → embed keeps streaming; `terminal/kill` covered by a test; releasing a terminal mid-embed does not crash the card.
- Path guard: `../` traversal, absolute path outside cwd, prefix-collision (`/tmp/proj` vs `/tmp/proj-evil`), and symlink escape (a symlink under the session root resolving outside it — both reading through it and writing through a symlinked parent directory) all rejected; guard tests assert canonical (realpath) containment, not just lexical prefix checks.
- Huge tool output (MBs of text) → card body clamped/scrollable, app stays responsive.
- Card updates arriving while its body is expanded → expansion state survives (stable identity by `toolCallId`).

## Regression Expectations

- STEP-23-01 streaming/message tests stay green (reducer changes are additive).
- Existing TerminalPanel behavior unchanged after the ghostty-surface extraction (its unit tests + the `test:e2e` ui-coverage spec stay green).
- `pnpm --filter @srgnt/harness test` untouched and green.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel|STEP-23-02 Render tool-call cards with diff and terminal embeds and plan panel]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
