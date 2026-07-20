# Validation Plan

## Commands

- `pnpm --filter @srgnt/runtime test` — engine unit tests (resolution order, always-memory, audit emission).
- `pnpm --filter @srgnt/contracts test` — new permission IPC schemas.
- `pnpm --filter @srgnt/desktop test` — controller PermissionPort tests (in-process mock scenarios), PermissionPrompt + TrustBadge component tests.
- Manual mock + manual Pi runs as described in the brief.

## Acceptance Checks

- Resolution order proven by unit test: session-remembered `allow_always`/`reject_always` answers without a prompt; everything else prompts (project policy hook exists but always falls through this phase).
- Mock scenario with `request_permission` + `expectOutcome: 'selected'` + `expectOptionId` passes for both an allow and a reject choice — i.e. the real user decision reaches the agent over ACP.
- Choosing `allow_always` then re-triggering the SAME normalized scope (same path for `edit`, same program token for `execute`) in the same session does NOT prompt again; a DIFFERENT scope of the same kind (different path / different command) DOES prompt again — one `allow_always` must not authorize unrelated later targets. A NEW session prompts again (memory is per-session).
- Broad-scope reuse only via explicit confirmation: a kind-wide "always allow all `<kind>`" is honored only when the user explicitly took that option; absent it, a scoped `allow_always` never suppresses prompts for a different scope.
- Rejecting maps to the reject option (never a silent `cancelled` unless the turn was actually cancelled).
- Turn cancel while a prompt is pending → agent receives `cancelled` outcome, prompt dismisses, no dangling pending-request entry (leak assertion in test).
- Every request and decision (including auto-answered `always` hits) appends `client/permission_request` / `client/permission_decision` events with the `SSessionEvent` envelope to the in-memory stream.
- Pi session: trust badge visible with self-approving copy; no permission prompt ever renders (assert `chat:permission:request` never fires during a real Pi turn — manual check backed by the spike's measured 0 calls).
- Mock session without `permission-routing-gaps` quirk: no badge.
- Dev console still auto-approves (unchanged behavior, its tests green).

## Edge Cases

- Options array with only reject options, or empty (degenerate agent) → prompt renders what exists; empty options → respond `cancelled` (mirrors `autoApprovePermission`'s fallback) and log a warning.
- Unknown option `kind` values → rendered as plain buttons, treated as `once` (never remembered).
- Two concurrent permission requests (agent fires a second before the first is answered) → both queued and answerable in order; responses route by requestId.
- Renderer reload / window destroyed while a prompt is pending → pending futures resolve `cancelled` so the agent is not hung forever.
- Pending-request deadline (fake clock): a prompt left unanswered past the deadline resolves `cancelled`, the `requestId` entry is removed (no leak), the prompt UI dismisses, and a `client/permission_decision` audit event with an `expired` reason is emitted; a renderer response arriving after expiry is ignored with a warning and does not double-resolve or re-open the prompt.
- Malformed IPC respond payload (bad requestId) → ignored with a warning, no crash.

## Regression Expectations

- Steps 01–02 chat suites stay green (the engine only intercepts `session/request_permission`; the update stream is untouched).
- `pnpm --filter @srgnt/harness test` green — no harness changes (the port interface already exists).
- Existing `runtime` approvals/policy tests untouched and green (old modules not modified).

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03 Wire permission engine round-trips into default-ask prompt UI]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
