# Implementation Notes

- **The replay could not be drained through the update iterator.** `SessionUpdateHub.updates()` parks its `next()` on an empty buffer, so "consume the replay, then stop" would block on live traffic that may never arrive. Added `takeBuffered(sessionId)` (hub) / `takeBufferedUpdates(sessionId)` (connection): after `load()` resolves, the replayed frames are already queued (notifications precede the response on the wire), so they are taken synchronously and the pump is started afterwards. That ordering is what keeps replayed frames out of the log they were replayed from.
- **`readModes` works unchanged on a `LoadSessionResponse`.** It carries the same `modes: SessionModeState` block `session/new` does, so a resumed Pi-shaped session regains its thinking-level selector with zero bespoke wiring (spike probe 3 confirmed).
- **JSON-RPC codes actually in play** (`@agentclientprotocol/sdk@1.2.1` `RequestError`): `-32601` methodNotFound (the advertise/implement mismatch), `-32002` resourceNotFound. Agents phrase "session not found" in prose more often than they use the reserved code, so classification checks the message too.
- **Unknown failures default to `transient`, not `read_only`.** A wrongly retryable session is recoverable; a wrongly read-only one looks permanent to the user. Only positive evidence (a `-32601`, an explicit session-not-found) moves the classification off that default.
- **`reconcileForkLinks` compares as sets, not positionally.** An order-sensitive comparison rewrote `meta.json` on every list read, bumping `updatedAt` — which the list sorts on. Union only, never subtraction: sessions are not deletable, so a listed child missing from a scan means an incomplete scan.
- **Two idempotency guards are needed, not one.** The durable guard is the key stamped on the child, but that record does not exist until the child's `session/new` returns; two clicks landing inside that window both scan, both miss, and both spawn. An in-flight `Map` in `registerChatHandlers` closes exactly that window — and it must be populated in the same synchronous turn as the lookup (an `await resolveProject` in between reintroduced the race, caught by the concurrent-fork IPC test).
- **The composer draft is shared across sessions**, so a fork's handoff overwrites it deliberately: a fork switches the active session, and whatever is in the box is the prompt the read-only session refused.
- **Deviation (recorded):** no `forks/<key>` index file. `findByKey` scans `listSessions`, the same per-project meta read the list already performs. The brief allowed the index only as a rebuildable cache; building, rebuilding and proving-disposable a cache costs more than the scan it accelerates for a human-paced action. Marked with a `ponytail:` comment in `packages/desktop/src/main/chat/fork.ts`.
- **Perf ceiling honoured, not fixed.** `store.readEvents` reads and parses the whole log; a resume replays the whole history by definition, so no `fromSeq` window would help and no streaming reader was added. Documented on `ChatSessionPersistence.readEvents`.

## Files

- `packages/desktop/src/main/chat/resume.ts` — pure decisions (failure classes, ordered replay reconciliation, fork fingerprint, handoff template).
- `packages/desktop/src/main/chat/fork.ts` — fork service, `ForkKeyConflictError`, `reconcileForkLinks`.
- `packages/desktop/src/main/chat/session-controller.ts` — `openConnection` (extracted, shared by `newSession`/`reconnect`), `startPump`, `reconnect`.
- `packages/desktop/src/renderer/components/chat/ReadOnlyBanner.tsx` — read-only + fork + history-diverged surface.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04 Implement resume flows load resume read-only reopen and fork with handoff]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
