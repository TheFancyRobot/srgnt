# Outcome

**Status: complete.** Delivered on branch `phase/23-step-02-tool-cards` by [[05_Sessions/2026-07-25-195300-render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel-claude-opus-5-fresh-execution-worker|SESSION-2026-07-25-195300]].

## What shipped

- **Tool-call cards** — `chat/ToolCallCard.tsx`: kind-aware icon and label for all ten ACP kinds (unknown kinds bucket to `other`), a status chip for `pending → in_progress → completed | failed` with a visually distinct failure state, an expandable body whose expansion survives updates, `locations` rendered as plain paths with no navigation promise, and content blocks rendered per type. The card is `React.memo`'d on its segment, so the spike's measured 24-updates-per-write cadence re-renders one card, not the transcript.
- **Diffs** — `chat/DiffView.tsx` over `@codemirror/merge` (added at `^6.12.2`), read-only twice over, unchanged regions collapsed, new-file and emptied-file cases labelled.
- **Terminal embeds, both honest paths** — a `terminal` content block embeds live output of a client-created terminal through a new `chat:terminal:output` IPC channel and a read-only ghostty surface extracted from `TerminalPanel.tsx`; the Pi path (`content` text / `rawOutput`, no client delegation at all) renders as a clamped, scrollable monospace block.
- **Client services v1** — `main/chat/client-services.ts`: `FileSystemPort` path-guarded to the session cwd by canonical (realpath) containment, `TerminalPort` over node-pty with a plain-pipe fallback, and an in-memory audit event per `fs/*` call including refusals.
- **Plan panel** — `sidepanels/ChatPlanSidePanel.tsx`, registered on the chat `PanelDefinition`, replacing the full entry list on every update per spec and clearing on an empty one.
- **Reducer** — `chat/transcriptReducer.ts` now normalizes status and kind, parses content blocks and locations, protects terminal statuses from out-of-order regression, and still creates a placeholder card for an update whose opening frame never arrived.

## Validation evidence

Every command below was run in the foreground and passed as stated.

| Command | Result |
| --- | --- |
| `pnpm --filter @srgnt/desktop test` | PASS — 54 files, 939 tests (baseline 48 / 856) |
| `pnpm --filter @srgnt/desktop typecheck` | PASS — main + preload + renderer |
| `pnpm --filter @srgnt/desktop build` | PASS — CJS main still compiles |
| `pnpm --filter @srgnt/harness test` | PASS — 113 passed, 2 skipped |
| `pnpm --filter @srgnt/contracts test` | PASS — 140 tests |
| `pnpm -r test` | PASS — contracts 140, runtime 287, harness 113, desktop 939 |
| `npx playwright test e2e/ui-coverage-matrix.spec.ts` | PASS — 27 passed (regression guard for the ghostty extraction + side-panel change) |
| `npx playwright test e2e/app.spec.ts` | 14 passed, 1 **pre-existing** failure — see below |

Every acceptance check in the Validation Plan has a test behind it, including the four required path-guard cases and the symlink-escape variants.

**Manual mock run** was performed headlessly against the built `dist/main` driving the real spawned mock bin: `stopReason end_turn`, 15 frames, content block types `["content","diff","terminal"]`, 2 plan updates, and one terminal chunk `"checks passed\n"` on `chat-term-1`.

## Known gaps

- **Not run: the GUI manual passes.** The `pnpm dev` visual check and the real-Pi turn need a human at a display. Everything automated here only ever exercised the ghostty surface's ANSI-stripped **fallback**, because jsdom cannot load the WASM runtime — the real ghostty render path is unverified.
- **Pre-existing environmental failure:** `e2e/app.spec.ts › exercises preload APIs for persistence, PTY launch, and renderer security` fails with `posix_spawnp failed` from `terminal:launch-with-context`. Confirmed unrelated to this step — a bare `node -e "require('node-pty').spawn(...)"` fails identically on this machine, it reproduces with the sandbox disabled, and nothing under `src/main/pty/` or `src/main/terminal/` was touched. It does mean the shipped terminal panel is broken on this machine, which is worth a bug note if it reproduces elsewhere.

## Follow-up

- **STEP-23-03** turns on `fs/write_text_file` by passing `authorizeWrite` to `createChatClientServices` in `ChatSessionController.newSession` — one wiring change; the guard, audit trail, and typed refusal already exist and are tested. It should also decide whether `client/fs_read_text_file` / `client/fs_write_text_file` / `client/fs_denied` join `knownSessionEventKinds`, and it still owns replacing the temporary `autoApprovePermission` placeholder from STEP-23-01.
- **STEP-23-04** consumes `transcript.availableCommands` and `transcript.currentModeId`, which remain stored-but-unrendered by design.
- A human should do the GUI mock pass and a real Pi turn on a machine with working node-pty.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_02_render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel|STEP-23-02 Render tool-call cards with diff and terminal embeds and plan panel]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- Session: [[05_Sessions/2026-07-25-195300-render-tool-call-cards-with-diff-and-terminal-embeds-and-plan-panel-claude-opus-5-fresh-execution-worker|SESSION-2026-07-25-195300]]
