# Outcome

**Done.** Both deliverables shipped.

## What was built

1. **Real permission round-trips.** A pure engine in `packages/runtime/src/permissions/engine.ts` (no ACP, no Electron) resolving `session-remembered → project-policy hook → default ask`. `packages/desktop/src/main/chat/permissions.ts` implements the chat `PermissionPort`: ACP→engine normalization, a pending-request map with one `settle()` exit path, a 10-minute `unref`'d deadline, cancel/dispose release, and `SSessionEvent` audit emission. New IPC (`chat:permission:request|respond|close`) + preload bridge, and renderer `PermissionPrompt.tsx` rendering tool kind, title, affected paths/command, and one button per agent-offered option (unknown kinds included) plus cancel. `autoApprovePermission` is gone from the chat controller; the dev console keeps its own.
2. **Honest self-approving trust badge.** `TrustBadge.tsx` renders from the harness `quirks` array only — `permission-routing-gaps` → "Self-approving — srgnt cannot gate this agent's tool use". Never keyed on harness id, so Phase 25/26 harnesses light it up with zero UI changes.

Carry-forward discharged: `fs/write_text_file` now exists, because `authorizeWrite` is wired to the engine.
Open question answered: `client/fs_read_text_file` / `client/fs_write_text_file` / `client/fs_denied` were added to `knownSessionEventKinds`.

## Validation

- `pnpm --filter @srgnt/runtime test` — PASS (14 files, 300 tests).
- `pnpm --filter @srgnt/contracts test` — PASS (7 files, 148 tests).
- `pnpm --filter @srgnt/desktop test` — PASS (56 files, 989 tests).
- `pnpm --filter @srgnt/harness test` — PASS (13 passed / 2 skipped; no harness changes).
- `pnpm -r lint` — PASS.
- Real spawned mock through Supervisor + wrapper (run against built `dist/`, since `defaultChatConnect` cannot run under vitest): `stopReason: end_turn`, exactly one prompt shown, audit stream contains `client/session_created`, `client/permission_request`, `client/permission_decision` with `{outcome: selected, optionId: allow-once, source: user}`.
- Agent-side proof: mock scenarios with `expectOutcome`/`expectOptionId` pass for both an allow and a reject choice — the user's decision genuinely crosses ACP.

## Explicit follow-up

- Live Pi run (badge visible, zero prompts) not executed — needs `npx pi-acp` + credentials. Backed today by DEC-0018 probe 1 and quirk-fixture tests.
- STEP-23-05 should extend the mock's `request_permission` directive with `kind` + `locations` so path/command scoping is E2E-testable, and must account for `defaultChatConnect` being unrunnable under vitest.
- Phase 24 owns: persisting the audit stream to `events.jsonl` (sink swap only) and implementing the `projectPolicy` hook the engine already calls.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03 Wire permission engine round-trips into default-ask prompt UI]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
