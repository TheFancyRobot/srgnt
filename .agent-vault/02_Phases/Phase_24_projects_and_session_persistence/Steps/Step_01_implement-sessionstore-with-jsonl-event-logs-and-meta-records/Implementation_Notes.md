# Implementation Notes

- Module landed at `packages/runtime/src/sessions/` — `paths.ts`, `meta.ts`, `event-log.ts`, `store.ts`, `index.ts` — and is re-exported from `packages/runtime/src/index.ts`. Note that `workspace/` is *not* exported from the package root (pre-existing gap, left alone); `sessions/` is.
- Layout is exactly `projects/<projectId>/sessions/<sessionId>/{events.jsonl, meta.json}`, derived through `workspaceDirectories.projects` from contracts. `transcript.md` is not created here (STEP-24-05).
- Id safety is a whitelist, not a sanitizer: `/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/`. The alphanumeric first character is what rules out `.`, `..`, and dotfiles in a single rule; `/`, `\`, NUL, and every separator simply are not in the set. `SessionPathError` names the offending field.
- **Corrupt-tail handling has two distinct cases**, discovered while writing the property test, and they need different repairs:
  1. Trailing bytes that will not decode → truncate the file back to `lastValidByteOffset`.
  2. A *valid* final record whose newline never landed → the data is intact, so re-append the newline rather than dropping the record.
  `readEventLog` reports these as `truncatedTail` plus `tailMissingNewline` so `SessionEventLog.open` can pick the right repair. Truncating case 2 would silently lose a complete event.
- Repair-before-append is what keeps the middle-corruption path unreachable. A **negative control was run**: commenting out the truncate in `SessionEventLog.open` made exactly the two repair tests fail, and they failed with `SessionEventLogCorruptionError` thrown from `readEventLog` — the corrupt tail had become an interior line. The tests are not vacuous.
- Interior corruption is a typed throw (`SessionEventLogCorruptionError` with `lineNumber` + `byteOffset`), never a silent skip, and `SessionEventLog.open` does **not** repair it — the file is left byte-for-byte intact so a human can look at it. A test asserts the file is untouched after a refused open.
- Append serialization is a promise chain on the handle, with `this.tail = written.catch(() => undefined)` so one failed write does not poison every later append. `seq` is assigned *synchronously* at call time, so `Promise.all` of N appends yields dense `0..N-1` in call order.
- `SessionStore.readEvents` drains the open log's write queue before reading, otherwise a read racing an in-flight append silently misses events.
- `meta.json` is write-temp-then-`rename`, with `fsync` on the temp handle before the rename. `writeSessionMeta` validates *before* creating the temp file, so an invalid write leaves no `.tmp` litter (asserted).
- `SessionMetaInput` is `Schema.Schema.Encoded<typeof SSession>`, not `Session`. `SSession.kind` is `optionalWith(..., { default })`, so the decoded type requires `kind` while callers should not have to pass it. Taking the encoded type at the boundary and decoding inward is what makes `createSession({ id, projectId, harnessId, status, createdAt })` compile.
- **JSON cannot round-trip `-0`** — the first property-test run found this within 23 cases (`{"": -0}` came back as `{"": 0}`). This is a limitation of the storage format, not the store, so the generator pre-normalizes through one JSON round-trip and the assertion stays strict rather than being loosened.
- No `fsync` per append (deliberate, `ponytail:` comment in `event-log.ts`): one trivial Pi turn is 85+ updates. Durability contract is "at most the in-flight chunk is lost", per the phase acceptance criterion. `close()` syncs.
- Real-Pi fixture lines are **copied verbatim** into `event-log.test.ts` as string constants rather than read from `packages/harness/src/testing/fixtures/pi/*.jsonl` — `@srgnt/harness` is ESM-only and these tests are CJS. The source file names are named in a comment so drift is traceable.
- `fast-check@^4.6.0` added to `packages/runtime/package.json` devDependencies (it was already in contracts/harness/desktop).

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records|STEP-24-01 Implement SessionStore with JSONL event logs and meta records]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
