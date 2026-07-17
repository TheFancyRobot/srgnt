# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — new `chat:*` IPC schemas decode/reject correctly.
- `pnpm --filter @srgnt/desktop test` — controller tests (injected in-process mock via `connectMockAgent`), `transcriptReducer` tests, ChatView component tests (vitest + @testing-library, see `DevConsole.test.tsx` for the window.srgnt-mocking pattern).
- `pnpm --filter @srgnt/desktop typecheck && pnpm --filter @srgnt/desktop build` — proves the CJS main bundle still compiles with the lazy-ESM import pattern (a static `@srgnt/harness` value import fails HERE, not at test time).
- Manual: `pnpm --filter @srgnt/desktop dev` → Chat panel → new mock session → prompt → streamed thought + message chunks render; repeat with target `pi` when the `pi` CLI is installed.

## Acceptance Checks

- ChatView is registered as a main-section panel and renders in the center panel; existing Notes/Terminal/Settings panels are untouched.
- A mock-agent turn streams: user message appears immediately on submit; thought chunks accumulate in a collapsible block; agent message chunks accumulate into one message rendered as GFM markdown (headings, lists, fenced code, links, tables).
- Interleaved sequences (thought → message → tool_call → message, per the spike's measured mix) render in arrival order without dropping or reordering chunks.
- Unknown `sessionUpdate` kinds (e.g. `session_info_update`) are silently ignored — no crash, no console error spam.
- Updates for a different `sessionId` than the active handle are not rendered (the push channel is keyed; see the `sessionIdRef` guard in `DevConsole.tsx`).
- Panel switch away and back does NOT kill the session or lose transcript state; explicit dispose + app quit kill-tree the agent process (verify with `ps` that no `mock-agent`/`npx` child survives quit).
- Light and dark themes both render correctly (tokens only — no hardcoded hex in chat components).

## Edge Cases

- Prompt while a turn is already in flight → composer path is STEP-23-04; this step must at minimum not double-submit (disable send while prompting, dev-console style).
- `session/new` failure (e.g. Pi target with `pi` not installed → `SpawnFailed`) → surfaced as a readable error state in the panel, session handle not leaked (cleanup ran — assert via controller unit test).
- Empty markdown / whitespace-only chunks → no empty bubble artifacts.
- Very long streamed message (thousands of lines) → view stays scrollable and responsive; auto-scroll sticks to bottom only when the user is already at the bottom.
- Connection closes mid-turn → pump loop ends quietly (iterator completes), UI shows the turn as interrupted; full crash UX is STEP-23-04, but nothing may white-screen here (ErrorBoundary stays intact).

## Regression Expectations

- `pnpm --filter @srgnt/desktop test:e2e` (existing app/gfm/ui-coverage specs) stays green — the new panel must not break onboarding, layout persistence, or the `waitForDesktopReady` heuristics in `e2e/fixtures.ts` (it polls for the Notes button; adding a Chat panel must not change those role names).
- Dev console behavior unchanged with and without `SRGNT_DEV_CONSOLE=1`.
- `pnpm --filter @srgnt/harness test` untouched and green (this step adds no harness changes).

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering|STEP-23-01 Build ChatView streaming surface with message thought and markdown rendering]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
