# Validation Plan

## Primary Acceptance Checks

1. **Perf:** a generated 10k-message fixture session scrolls smoothly and its initial
   load time from JSONL is recorded (with a number) in the step Outcome. Maps to the
   phase criterion "10k-message transcript scrolls smoothly (virtualized) and loads in
   acceptable time from JSONL."
2. **Settings:** an E2E covers each relocated section (harnesses, permissions,
   projects, groups/pipelines, appearance) — each renders and its controls persist.

## Commands

- Unit: `pnpm --filter @srgnt/desktop test` (Settings.test.tsx + a virtualization hook
  test; assert only visible rows mount for a large transcript).
- E2E: `pnpm --filter @srgnt/desktop test:e2e`.
- Typecheck: `pnpm --filter @srgnt/desktop typecheck`.
- Perf measurement: launch the app against the 10k fixture (via `SRGNT_USER_DATA_PATH`
  pointing at a prepared workspace, as the e2e fixtures do) and measure with Playwright
  timing / `performance.now()` around initial transcript mount and a scripted scroll.

## How To Measure Perf (concrete)

- Generate the fixture: a script that writes a session JSONL with ~10k events (mix of
  user text, assistant text, `tool_call`/`tool_call_update`, and diffs). Reuse Phase 24
  recorder/fixtures (`packages/harness/src/testing/fixtures/`) if present.
- Record: (a) time from ChatView mount to first paint of the transcript;
  (b) mounted-DOM-node count while scrolled to the middle (should be a small window,
  not ~10k); (c) frame health during a scripted fast scroll (no multi-hundred-ms long
  tasks). Write all three numbers into Outcome.md.

## Manual Checks

- Scroll to the middle of the 10k transcript, then let new messages stream in — the
  viewport must NOT jump (stable anchoring). Scroll to bottom, stream messages — it
  should follow.
- Visit every settings section after consolidation; toggle one control per section and
  confirm it persists to `settings.json` (reopen app / re-read file).
- Theme switching (the special-cased `general` setting) still works.

## Edge Cases / Failure Modes

- Variable row heights (a 200-line diff card next to a one-line message) must not break
  anchoring or cause overlap/gaps — this is the classic virtualization failure. Test
  with a fixture that mixes tall and short rows.
- Empty transcript / single-message transcript must still render (no windowing math
  divide-by-zero).
- Resizing the window mid-scroll must re-measure rows without losing position.
- Corrupt/partial JSONL line: transcript load must be tolerant (open-kind reader per
  Phase 24 convention), skipping bad rows rather than crashing the view.

## Regression Expectations

- Existing ChatView E2E (Phase 23 `chat.spec.ts`) stays green.
- The three known baseline E2E failures (app.spec PTY `posix_spawnp`; gfm ATX
  `.cm-header-*`; bug-0013-visual Linux packaged binary) must not grow — record the
  count.
- No new bundle-size regression that breaks packaging (STEP-29-03 packages this).

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_02_consolidate-settings-and-virtualize-long-transcripts|STEP-29-02 Consolidate settings and virtualize long transcripts]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
