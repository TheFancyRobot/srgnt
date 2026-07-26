# Implementation Notes

## Decisions taken during execution

- **"Always" memory key: the brief's default, unchanged.** `(sessionId, kind, normalizedScope)`; `deriveScope` in `packages/runtime/src/permissions/engine.ts` returns `path:<canonical path>` for `read`/`edit`/`delete`/`move`, `cmd:<first argv token>` for `execute`, and `title:<title>` when nothing concrete is derivable. An underivable scope never widens to kind-wide. Kind-wide breadth exists in the API (`remember(request, decision, 'kind')`) but no UI selects it this phase, so it can only ever be an explicit choice.
- **`knownSessionEventKinds` (the open question the step recorded): YES, added.** `client/fs_read_text_file`, `client/fs_write_text_file`, `client/fs_denied` now sit in `packages/contracts/src/session.ts` alongside the permission kinds. STEP-23-02 was already emitting them, Phase 24 persists one stream rather than two, and leaving them out made `isKnownSessionEventKind` untrue about events srgnt itself writes. The set stays open for tolerant reading.
- **Audit emission lives in the controller/host, not the engine.** The engine exposes `resolve` and `scopeOf`; a second emitter inside it would duplicate the record with no second consumer. Every request and every decision — user, remembered, expired, no-renderer, no-options — appends an `SSessionEvent` envelope with a monotonic `seq` (asserted through `readSessionEvent` + `isKnownSessionEventKind` in `permissions.test.ts`).

## Observed behavior

- **The mock's `request_permission` carries only `{toolCallId, title}`** (`packages/harness/src/testing/mock-agent/runner.ts` ~L250) — no `kind`, no `locations`. Mock-driven prompts therefore normalize to `kind: 'other'` and the `title:` scope fallback, so path/command scoping is only covered by the direct host tests. STEP-23-05 should extend the directive with `kind` + `locations`.
- **`defaultChatConnect` cannot run under vitest.** Its `Function('return import("@srgnt/harness")')` CommonJS→ESM workaround throws `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` in vitest's VM. Real spawned-process checks must run against built `dist/`. Relevant to STEP-23-05's E2E plan.
- **Liveness: one `settle()` is the only exit.** User answer, turn cancel, dispose, 10-minute deadline (`unref`'d so it cannot block app quit), and undeliverable push all route through it — entry removed, timer cleared, resolver called once. Late/duplicate/post-expiry responses find nothing and are warned + dropped.
- **Undeliverable prompts fail closed at once.** `push()` in `main/chat/index.ts` now returns whether a live window received the frame; no window means the agent is answered `cancelled` immediately instead of blocking for the full deadline.
- **`fs/write_text_file` is now present** (STEP-23-02 carry-forward discharged): `authorizeWrite` is the permission host, a write prompts as an `edit` on the canonical guarded path, and a refusal yields the existing typed `write_not_authorized` error with no file created.
- **Dev console unchanged** — it keeps its own `autoApprovePermission`; its 5 tests stay green.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03 Wire permission engine round-trips into default-ask prompt UI]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
