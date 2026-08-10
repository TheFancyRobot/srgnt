# Outcome

Delivered: honest resume (lazy reconnect on first prompt, capability cascade, load-replay reconciliation) and fork-with-handoff (linked, idempotent, deterministic summary, never auto-sent).

**Validation scope: automated only.** Every path below is verified against the mock agent and the unit/E2E suites. Resume against a real agent (`SRGNT_IT_PI=1`) was NOT performed, so the capability cascade is unverified against anything that lies about its capabilities in the wild.

## What shipped

- `@srgnt/harness` — mock agent gained `loadReplay` (directives emitted as `session/update` from inside `session/load`, before its response) and `unimplementedMethods` (advertise a capability, answer `-32601`), plus `SessionUpdateHub.takeBuffered` / `AcpAgentConnection.takeBufferedUpdates` so a client can lift a replay off the channel without parking on live traffic.
- `@srgnt/contracts` — `SSession.forkedSessionIds` + the child-side fork stamp (`idempotencyKey`, `requestFingerprint`); `chat:session:reconnect` and `chat:session:fork` channels and schemas; `FORK_KEY_CONFLICT`; event kinds `client/capability_mismatch`, `client/load_reconciliation`, `client/reconnected`.
- Desktop main — `ChatSessionController.reconnect` (cascade + failure classes + reconciliation), `chat/resume.ts` (pure decisions: classification, ordered replay digest comparison, fork fingerprint, handoff template), `chat/fork.ts` (fork service + `reconcileForkLinks`), IPC handlers with an in-flight double-click guard and lineage back-fill during `chat:session:list`.
- Renderer — `ReadOnlyBanner.tsx` (reason + "Continue in new session" + the subtle history-diverged notice), reconnect-on-prompt replacing the STEP-24-03 refusal placeholder, composer disabled while read-only, handoff seeded as an editable draft, lineage links ("continues…" / "continued by…") in `SessionList`.

## Validation

| Command | Result |
| --- | --- |
| `pnpm --filter @srgnt/harness test` | 118 passed, 2 skipped |
| `pnpm --filter @srgnt/contracts test` | 179 passed |
| `pnpm --filter @srgnt/runtime test` | 419 passed |
| `pnpm --filter @srgnt/desktop test` | 1149 passed (64 files) |
| `pnpm -r lint` | clean (all 5 packages) |
| `npx playwright test e2e/resume.spec.ts` | 3 passed (all three mock variants) |
| `npx playwright test e2e/chat.spec.ts e2e/sessions.spec.ts e2e/projects.spec.ts` | 13 passed |
| randomized suites x5 (`event-log.property.test.ts`, contracts fast-check) | stable, no seed-dependent failures |

## Explicit follow-up

- Manual real-Pi check (`SRGNT_IT_PI=1`) NOT performed: transparent continue via `session/load` and thinking-level repopulation are proven against the mock only.
- No `forks/<key>` index file was built (recorded deviation, `ponytail:` comment in `fork.ts`). Revisit only if a project ever holds enough sessions for the per-fork `listSessions` scan to be measurable.
- Reconnect does not persist negotiated capabilities, so a first prompt on a non-capable session costs exactly one spawn to learn that. STEP-24-05 may flip this if it caches capabilities.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04 Implement resume flows load resume read-only reopen and fork with handoff]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- Session: [[05_Sessions/2026-08-09-215255-implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff-claude-opus-5|SESSION-2026-08-09-215255]]
