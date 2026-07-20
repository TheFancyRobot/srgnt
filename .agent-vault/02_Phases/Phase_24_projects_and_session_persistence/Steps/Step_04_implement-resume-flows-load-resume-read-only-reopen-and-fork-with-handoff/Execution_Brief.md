# Execution Brief

## Why

- "Honest resume" is the phase's product stance and an ARCH-0009 data flow: reopen renders instantly from local events; reconnection uses `session/load`/`session/resume` only when the harness advertises it; anything else is read-only + explicit fork. **No silent context re-priming, ever** — a session that claims to continue must actually continue on the harness side.
- **Reconciliation with DEC-0018 / spike probe 3 (measured, not assumed):** for pinned `pi-acp@0.0.31`, `session/load` WORKS (replays history via `session/update` and returns rich `configOptions`/`models`/`modes` — Pi's thinking levels), while `session/resume` returns `-32601` (`resumeSession: false`). So for Pi the ONLY transparent-continue path is **resume-by-replay via `session/load`**. The read-only + fork path is the fallback for harnesses with neither capability — today that means the default mock scenario (`loadSession: false` by default), which is also exactly what makes both branches E2E-testable.

## Prerequisites

- STEP-24-02 and STEP-24-03 merged (projects, session list, per-session service — resume attaches to reopened list entries).
- Read: spike report probe 3 (load response shape), DEC-0018 "Consequences" (`session/load` config + `session/set_mode` cover Pi model/thinking selection), ARCH-0009 "Data Flow — Resume" + the resume honesty invariant.
- Read `packages/harness/src/acp/connection.ts` `load()`/`resume()` (both already exist and register the sessionId with the update hub before calling, so replayed updates flow through the normal `updates(sessionId)` iterator) and `capabilities.ts` — **capability detection comes from `NegotiatedCapabilities` (`loadSession`/`resumeSession`) after connect + `applyCapabilityOverrides`, never from harness id or hardcoded lists** (for pi-acp@0.0.31 this yields `loadSession: true, resumeSession: false`).
- **Mock-agent reality check:** `MockAgent.loadSession` is currently a NO-OP — it accepts the call but replays nothing (`packages/harness/src/testing/mock-agent/runner.ts`). The load-capable E2E variant requires extending the mock: recorded assumption — add an optional scenario field (e.g. `loadReplay: Directive[]`) whose directives are emitted as `session/update` notifications inside `loadSession` before it returns. This is a `@srgnt/harness` testing change with its own unit tests; scenario schema lives in `testing/mock-agent/scenario.ts` (which already models `loadSession`/`resumeSession` capability flags).

## Likely Code Paths

- `packages/desktop/src/main/chat/` — the reconnect flow, triggered on the first prompt of a reopened session (lazy: reopening spawns nothing):
  1. Spawn/connect via the shared Supervisor (handle id = srgnt session id) with the session's harness definition.
  2. Branch on `connection.capabilities`: `resumeSession` → `resume({sessionId: meta.acpSessionId})` (no replay); else `loadSession` → `load({sessionId: meta.acpSessionId})` and consume the replayed updates; else → mark read-only, surface the fork affordance.
  3. Then send the pending prompt. **Distinguish failure classes** — do not treat every load/resume failure as "degrade to read-only + fork": an *unsupported/not-found* failure (harness lacks the capability, or returns session-not-found / `-32601` / gone server-side) is terminal for transparent continue → degrade to read-only + fork with a visible notice. A *transient* failure (spawn error, transport drop, timeout) leaves the original session **retryable** — surface a retryable error (not the read-only fork path), keep the session's status intact, and let the next prompt re-attempt reconnect. Only unsupported/not-found collapses to read-only; never fake a continue, never crash.
- **Replay reconciliation (recorded assumption — keep v1 simple):** the local log REMAINS canonical. Replayed updates during `load` are consumed but NOT re-appended (no duplicate events); the renderer keeps its locally-rendered transcript. Reconciliation v1 = a **full ordered comparison** of the replayed `session/update` frames against the persisted `acp/session_update` events — walk both sequences in order and compare a per-event identity (a stable content digest of each frame, or the frame's own id where present), NOT merely count + last-update (that misses a divergence in the middle where totals still match). On the first ordered mismatch (or a length difference), append a `client/load_reconciliation` event recording the divergence position and both sequence digests, and show a subtle "history may differ on the agent side" notice. Decision needed (non-blocking): whether mismatch should ever *replace* the local render — default is NO (source-of-truth invariant).
- Pi extras on load: the `LoadSessionResponse` carries `modes` (thinking levels) and `configOptions` — feed the existing STEP-23-04 mode selector state from the load response, so a resumed Pi session regains its thinking-level control (spike probe 3; no bespoke wiring).
- Fork with handoff — `packages/desktop/src/main/chat/` + renderer:
  - New srgnt session in the same project (new UUID, chosen/default harness), `parentSessionId` = source session id (already in `SSession`). "Recorded both ways" (recorded assumption): the source session's meta gains an optional `forkedSessionIds: string[]` — a small `SSession` contracts addition — so lineage is navigable from either end without scanning.
  - **Lineage is a two-record write and must commit atomically-or-recoverably:** the child's `parentSessionId` and the parent's `forkedSessionIds` entry live in two `meta.json` files; writing them independently can leave one-way lineage after a crash (child points up but parent doesn't list it, or vice-versa). Guard with a durable ordering + recovery rule: write the child meta first (it carries `parentSessionId`, the authoritative link) as the fork's commit point, then update the parent's `forkedSessionIds`. **On startup, reconcile lineage**: any child whose `parentSessionId` names a parent missing that child in `forkedSessionIds` gets back-filled (parent is derivable from children by scan, so the child record is the source of truth and the parent's list is a rebuildable cache). A crash after child-write but before parent-update therefore self-heals; a retry of the same fork must not create a second child (see idempotency below).
  - Handoff summary is EXPLICIT and deterministic (no LLM): a template quoting the source's title, last user prompt, and final agent message excerpt, pre-filled into the new session's composer for the user to edit/send — never auto-sent, so the user sees exactly what context the new session gets (recorded assumption; the sent prompt lands in the log as an ordinary `client/prompt`).
- `packages/contracts/src/ipc/contracts.ts` — `chat:session:fork` (sourceSessionId, optional include-handoff flag, **required client-generated `idempotencyKey: string`** → returns the new session ref + prefilled text); read-only state surfaced through the existing session-status push. **Idempotent forks:** the service persists the created fork keyed by `idempotencyKey` (e.g. a small `forks/<key> → childSessionId` marker under the source project, or the key stamped on the child meta); a repeated `chat:session:fork` with the same key returns the ORIGINAL child ref + handoff text instead of creating a second session. This closes the double-click/retry window and the crash-retry window from the lineage rule above (a fork retried after a mid-write crash resolves to the same child).
- Renderer — `components/chat/ReadOnlyBanner.tsx` (+ fork button) and fork lineage links in `SessionList` rows ("continues …"/"continued by …" navigation from `parentSessionId`/`forkedSessionIds`).

## Key Design Constraints

- Capability-driven only: the branch order (`resumeSession` → `loadSession` → read-only) is data-driven off `NegotiatedCapabilities`; adding opencode in Phase 25 must require ZERO changes here.
- Reopen is instant and process-free; reconnect is lazy on prompt (UI-open ≠ process-running).
- Read-only means read-only: composer disabled, no hidden re-prompting, the fork affordance is the one and only continue path (phase non-goal: silent re-priming).
- Replayed updates must not corrupt persistence: the persistence tap must distinguish replay-phase updates (during `load`) from live updates (recorded approach: the reconnect flow consumes the replay via the update iterator *before* handing the pump to the persistence tap).
- A fork's parent may still be live — forking must not close or mutate the parent session beyond appending `forkedSessionIds`.

## Execution Checklist

1. Extend the mock agent with `loadReplay` (+ scenario schema + runner unit tests in `@srgnt/harness`).
2. Add `forkedSessionIds` to `SSession` (+ contracts tests).
3. Implement the reconnect flow with the capability branch + full ordered-replay reconciliation + failure-class handling (transient → retryable, unsupported/not-found → read-only+fork); unit tests with in-process mocks in all three capability configurations (`resumeSession: true`, `loadSession: true` with matching, tail-mismatching, and MIDDLE-mismatching replays, neither) plus a transient-failure-stays-retryable case.
4. Implement fork-with-handoff (service + IPC with `idempotencyKey` + two-record lineage write with startup reconciliation + deterministic handoff template, all with unit tests).
5. Renderer: read-only banner, fork flow, lineage navigation; component tests.
6. E2E (two mock variants): (a) load-capable — restart app, reopen, prompt → transparent respawn + load, transcript continues; (b) non-capable — restart, reopen → read-only banner, fork creates a linked session with the prefilled handoff visible in the composer.
7. Manual real-Pi check: create a session, quit, reopen, prompt → Pi continues via `session/load`; thinking-level selector repopulates.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04 Implement resume flows load resume read-only reopen and fork with handoff]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy (accepted)]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 3: load works and is rich; resume is -32601)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (resume data flow + honesty invariant)
