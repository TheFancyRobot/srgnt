# Execution Brief

## Why

- `events.jsonl` is the session source of truth (ARCH-0009 invariant); every other step in this phase — projects (02), session lists (03), resume (04), transcripts (05) — reads or writes through the store built here. Building it first, pure and UI-free, means the rest of the phase is wiring, not storage design.
- The schema work is already done and fixture-pinned: `SSessionEvent` (`{seq, ts, protocolVersion, kind, payload}`), `SESSION_EVENT_ENVELOPE_VERSION`, `knownSessionEventKinds`, and the tolerant `readSessionEvent` all live in `packages/contracts/src/session.ts`, and the STEP-22-04 decode suite (`packages/harness/src/testing/fixtures/fixtures.decode.test.ts`) pins them against real Pi traffic. This step adds the *disk* layer only — do not redesign the envelope.

## Prerequisites

- PHASE-23 merged (the chat controller this store will eventually tap exists), or at minimum `main` green — the store itself has no dependency on the UI and can be built against contracts alone.
- Read: `packages/contracts/src/session.ts` fully (envelope + tolerant-reader contract), `packages/harness/src/testing/fixtures/recorder.ts` (`FrameRecorder` — prior art producing the *exact* line shape this store writes), and ARCH-0009 "Invariants" + "Failure Modes" (corrupt-tail rule).
- **Gotcha:** `fast-check` is a devDependency of `contracts`, `harness`, and `desktop` but NOT of `@srgnt/runtime` — add `"fast-check": "^4.6.0"` to `packages/runtime/package.json` devDependencies before writing the property tests.
- `@srgnt/runtime` compiles to CommonJS (no `"type": "module"`). Persistence lives here per ARCH-0009's boundary rule (`harness` never touches disk layout; `runtime` never speaks ACP). Because desktop main is also CJS, it will import this store *directly* — none of the lazy-ESM `Function('return import(...)')` gymnastics `@srgnt/harness` requires.

## Likely Code Paths

- `packages/runtime/src/sessions/` (new module beside `workspace/`):
  - `paths.ts` — path derivation from a workspace root using `workspaceDirectories.projects` from contracts: `projects/<projectId>/sessions/<sessionId>/{events.jsonl, meta.json}` (`transcript.md` arrives in STEP-24-05). The store takes `projectId` as a caller-supplied parameter — project *entities* are STEP-24-02; tests may use a fixed placeholder id.
  - `event-log.ts` — `SessionEventLog`: open/append/read for one session's `events.jsonl`.
  - `meta.ts` — `meta.json` CRUD serializing the contracts `SSession` shape (id, projectId, harnessId, status, title, acpSessionId, parentSessionId, timestamps) via `Schema` encode/decode.
  - `store.ts` + `index.ts` — `SessionStore` facade: `createSession(meta)`, `appendEvent(ref, kind, payload, protocolVersion)`, `readEvents(ref, {fromSeq?})`, `readMeta`/`updateMeta`, `listSessions(projectId)`, `close()`.
- `packages/runtime/src/index.ts` — export the new module (follow how `workspace/` is exported).
- Test fixtures: copy 2–3 committed real-Pi envelope lines from `packages/harness/src/testing/fixtures/pi/*.jsonl` into runtime test fixtures (copy, don't cross-import — `harness` is ESM-only and runtime tests are CJS; recorded assumption).

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- **Crash-safe appends:** open the log with append flag (`'a'`) once per live session; each event is `JSON.stringify(event) + '\n'` issued as a *single* write, and writes per session are serialized through a promise chain so lines can never interleave. No per-line `fsync` (streaming volume: one trivial Pi turn = 85+ updates); durability is "at most the in-flight chunk is lost" per the phase acceptance criterion. `fsync` happens on close/checkpoint (STEP-24-05).
- **seq assignment:** owned by the store, dense and monotonic per session. On opening an existing log, recover the next seq by reading the last valid line (tolerant read), not by counting lines.
- **Tolerant read (ARCH-0009 failure mode):** read line-by-line; a line that fails `JSON.parse` or `readSessionEvent` *at the tail* is dropped and reported (`{events, truncatedTail: true}`) — never a throw. Unknown `kind` values decode fine by design. A structurally-bad line in the *middle* of the file is beyond the crash model — surface a typed error rather than silently skipping (Decision needed only if this ever occurs in practice; recorded).
- **`meta.json` writes are atomic:** write `meta.json.tmp` then `rename` (same pattern discussion as `bootstrapWorkspace`'s `wx` care). Meta is tiny and rewritten whole; events are append-only — never rewrite `events.jsonl`.
- **`protocolVersion`:** stamped per event by the caller (the chat service knows the negotiated version from `NegotiatedCapabilities.protocolVersion`); srgnt client events (`client/*`) use the same session-level negotiated version, or `0` before any connection exists (e.g. a fork's `client/session_created` written pre-spawn). Recorded assumption.
- **No SQLite, no index files** — phase non-goal; full-scan reads are fine at v1 volumes. A rebuildable index cache is the documented escape hatch, not this step's work.
- Pure Node only: no Electron imports, no ACP/SDK imports (boundary rule). The store never interprets `payload` — raw ACP updates stay verbatim.

## Execution Checklist

1. Add `fast-check` to runtime devDeps; create `packages/runtime/src/sessions/` with `paths.ts` + tests (path shapes, weird project/session ids rejected — ids must be safe directory names; constrain to the id alphabet the store itself generates).
2. Implement `meta.ts` (atomic write, Schema round-trip) + tests.
3. Implement `event-log.ts` append/read with serialization + tolerant tail handling; unit tests including the copied real-Pi fixture lines.
4. Implement the `SessionStore` facade + `listSessions`; export from the package index.
5. Property tests (fast-check): arbitrary event sequences round-trip append→read identically (unicode, nested payloads, unknown kinds); arbitrary truncation of the final line still yields all prior events + `truncatedTail: true`; interleaved concurrent appends preserve per-session seq density.
6. Run the full validation plan; record any deviations in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records|STEP-24-01 Implement SessionStore with JSONL event logs and meta records]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (source-of-truth + corrupt-tail invariants)
- Prior art: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22]] STEP-22-04 fixtures/recorder (envelope shape pinned against real Pi)
