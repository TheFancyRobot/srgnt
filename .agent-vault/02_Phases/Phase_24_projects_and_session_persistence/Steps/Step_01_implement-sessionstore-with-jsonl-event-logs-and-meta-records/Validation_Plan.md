# Validation Plan

## Commands

- `pnpm --filter @srgnt/runtime test` — the primary gate: all `sessions/` unit + property tests green.
- `pnpm --filter @srgnt/runtime typecheck && pnpm --filter @srgnt/runtime build` — CJS build stays clean (no ESM-only imports crept in).
- `pnpm --filter @srgnt/contracts test` — untouched but must stay green (this step must NOT change the envelope schema; if you believe it needs changing, stop and record a decision instead).
- `pnpm build` at repo root — downstream packages still compile against the new runtime exports.

## Acceptance Checks

- Append→read round-trip: for arbitrary (fast-check) sequences of events with unicode payloads, nested objects, and unknown `kind` strings, `readEvents` returns exactly what was appended, in order, with dense monotonic `seq` starting at 0.
- Re-opening an existing log continues `seq` from the last valid line (write 5, close, reopen, write 1 → seqs 0..5).
- Real-Pi fixture lines (copied from `packages/harness/src/testing/fixtures/pi/*.jsonl`) decode through the store's reader — pins the store against genuine adapter traffic, not just self-generated data.
- Corrupt tail: truncating the final line at *any* byte offset (property test) yields all prior events plus `truncatedTail: true` — never a throw, never a partial event.
- Reopen → repair → append → read: after a corrupt/partial tail, reopening the store truncates the log at the last valid record's byte offset before the next append; a subsequent `appendEvent` then `readEvents` shows the corrupt line gone, the new event present, `seq` continuous across the boundary (no gap or reuse), and a further reopen reads cleanly without ever hitting the middle-corruption error path.
- Unknown envelope kinds and unknown extra envelope fields pass through the reader (tolerant-reader invariant); only structural damage (missing seq/ts/kind, wrong types) is rejected.
- `meta.json` round-trips the contracts `SSession` shape; a crashed write (leftover `meta.json.tmp`) never corrupts the readable `meta.json` (atomic rename).
- Concurrent `appendEvent` calls on one session serialize — no interleaved/torn lines (assert by parsing every line of the resulting file).
- `listSessions(projectId)` returns sessions with readable meta; a session directory with corrupt meta is reported (skipped with a warning result), not fatal to the listing.

## Edge Cases

- Empty `events.jsonl` (created, nothing appended) → `readEvents` returns `[]`, next seq is 0.
- File missing entirely (meta exists, log doesn't) → treated as empty log, not an error (crash between dir creation and first append).
- `fromSeq` beyond the end → `[]`; `fromSeq` mid-log → suffix only.
- Payloads containing newlines-in-strings survive (JSON escaping — the property tests must include `\n` in generated strings to prove one-line-per-event holds).
- Very large single payload (e.g. 1 MB string) round-trips.
- Session/project ids are used as directory names — the store must reject or refuse path-unsafe ids (`..`, `/`, empty); test explicitly.

## Regression Expectations

- No changes under `packages/harness/` or `packages/contracts/` — `pnpm --filter @srgnt/harness test` and the fixtures decode suite stay green untouched.
- Existing runtime suites (`workspace`, `semantic-search`, `approvals`, `policy`, `logs`) unaffected.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records|STEP-24-01 Implement SessionStore with JSONL event logs and meta records]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
