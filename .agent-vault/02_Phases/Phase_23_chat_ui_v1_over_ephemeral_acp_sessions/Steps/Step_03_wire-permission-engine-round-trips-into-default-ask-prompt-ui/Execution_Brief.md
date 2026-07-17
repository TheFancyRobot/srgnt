# Execution Brief

## Why

- Permissions-default-ask is an ARCH-0009 invariant and the product's trust story: the user must see and control what an agent is allowed to do — and, just as importantly, must see clearly when a harness does NOT give us that control.
- **Reconciliation with the STEP-22-05 spike (this step was re-scoped after DEC-0018 was ACCEPTED):** the spike measured that for Pi, `session/request_permission` NEVER round-trips — pi-acp self-approves and executed a file-writing tool with 0 permission calls to the client (probe 1). So this step has TWO deliverables, not one:
  1. **Real permission round-trips** for harnesses that send them: the mock agent does (`request_permission` scenario directive), and opencode will in Phase 25. This is the full engine + prompt UI path, E2E-testable today against the mock.
  2. **An honest per-harness "self-approving" trust badge** for harnesses that don't: driven by the `permission-routing-gaps` quirk on the harness definition (`piDefinition.quirks` in `packages/harness/src/registry/builtins.ts`). The badge is *informational* — the copy must say Pi approves its own tool use inside its own process and srgnt cannot gate it. It must NOT imply srgnt is protecting the user for Pi sessions.

## Prerequisites

- STEP-23-01 merged (chat controller, IPC, ChatView). STEP-23-02's client services benefit from this engine (fs-write gating) but are not a blocker in either order — see the sequencing assumption in the 02 brief.
- Read: DEC-0018 (accepted; "Consequences" names this step's honest-UI copy), spike report probe 1, ARCH-0009 permission data flow ("agent request → engine (session-remembered → project policy → default-ask) → renderer prompt if unresolved → decision + audit event").
- Read `packages/harness/src/acp/connection.ts` `PermissionPort` — the engine is simply the chat controller's implementation of this port (the dev console's `autoApprovePermission` in `dev-console/session-controller.ts` is the placeholder being replaced for chat sessions; the dev console itself keeps auto-approve).
- Read the mock `request_permission` directive (`scenario.ts`): options carry ACP kinds `allow_once | allow_always | reject_once | reject_always`; `expectOutcome`/`expectOptionId` let scenarios assert the client's decision.

## Likely Code Paths

- `packages/runtime/src/permissions/` (NEW module) — the permission engine. **Honest reality check (recorded assumption):** the existing `runtime/src/approvals` + `runtime/src/policy` are aggregator-era code (keyed on `LaunchContext` and capability strings like `read:tasks`) and do not model ACP permission requests. "Evolve" means: build a new ACP-shaped engine in `packages/runtime/src/permissions/` that carries forward the *concepts* (pending/approved/denied lifecycle from `approvals/service.ts`; allow/deny/prompt resolution + default-`prompt` from `policy/capability.ts`) — not the code. Leave the old modules untouched this phase; deleting them is later cleanup.
- Engine API (pure, no Electron): `resolve(request) → 'allow' | 'reject' | 'ask'` with resolution order **session-remembered "always" decision → project policy (Phase 24 — a stub hook that always falls through this phase) → default ask**; `remember(sessionId, key, decision)` for `*_always` options; audit-event emission hooks. Boundary rule: `runtime` never speaks ACP — the engine takes a normalized request (tool kind, title, option list), and the chat controller does the ACP↔engine mapping.
- **"Always" memory key (Decision needed — recorded, non-blocking):** ACP defines no rule key for remembering `allow_always`. Default for this phase: key on `(sessionId, toolCall.kind)` — coarse but honest and predictable. Alternative (finer): `(sessionId, toolCall.kind, title-prefix)`. Executor picks the default unless the human overrides; record the choice in Implementation Notes. Memory is per-session and dies with the session (ephemeral phase; Phase 24 revisits persistence + project policy).
- `packages/desktop/src/main/chat/` — implement `PermissionPort.requestPermission` for chat sessions: normalize the ACP request → `engine.resolve` → if `ask`, push to renderer over new IPC and await the decision; map the decision back to `{outcome: {outcome: 'selected', optionId}}` or `{outcome: {outcome: 'cancelled'}}`. Emit `client/permission_request` and `client/permission_decision` events (kinds ALREADY defined in `packages/contracts/src/session.ts` `knownSessionEventKinds`) into the in-memory session event stream.
- `packages/contracts/src/ipc/contracts.ts` — `chat:permission:request` (main→renderer push: requestId, sessionId, tool title/kind, affected paths/commands when derivable from the tool call, options with kinds) and `chat:permission:respond` (renderer→main: requestId, optionId | cancel). Preload additions mirror the existing push-channel pattern.
- `packages/desktop/src/renderer/components/chat/PermissionPrompt.tsx` (new) — banner/modal inside ChatView: tool kind + title, affected paths/commands, one button per option grouped allow/reject × once/always. Blocks the turn visually (the agent is genuinely waiting on the JSON-RPC response). Also `TrustBadge.tsx`: rendered in the session header from the harness `quirks` array (delivered in the `chat:session:new` response per STEP-23-01's contract) — shows "Self-approving — srgnt cannot gate this agent's tool use" when `permission-routing-gaps` is present.
- Turn-cancel interaction: if the user cancels the turn (STEP-23-04) while a permission prompt is pending, the port must resolve with `cancelled` (ACP spec behavior) and the prompt UI must dismiss — wire the controller's cancel path to reject pending prompt futures.

## Key Design Constraints

- Default-ask is absolute this phase: no auto-allow rules, no policy UI (phase non-goal; Phase 24/25). The only automatic answers are session-remembered `*_always` decisions.
- Every decision — automatic or user-made — emits an audit event; the event stream is in-memory this phase (Phase 24 persists it), but the event shapes use the real `SSessionEvent` envelope so persistence is a sink swap.
- The trust badge must appear ONLY from quirk data, never hardcoded per harness id — Phase 25/26 add harnesses whose definitions must light it up (or not) with zero UI changes.
- Dev console keeps auto-approve (it is a raw dev harness, clearly labeled); only chat sessions get the engine.

## Execution Checklist

1. Build the engine in `packages/runtime/src/permissions/` pure, with unit tests for resolution order (remembered-always beats ask; reject_always remembered too; unknown option kinds default to ask) and audit emission.
2. Add the IPC contracts + preload surface.
3. Implement the chat controller's `PermissionPort` with a pending-request map (requestId → resolver), cancel wiring, and audit events; unit-test with the in-process mock (`connectMockAgent` + a `request_permission` scenario, asserting `expectOutcome`/`expectOptionId`).
4. Build `PermissionPrompt` + `TrustBadge` components with component tests (all four option kinds; badge on/off by quirks fixture).
5. Manual: mock scenario with `request_permission` → prompt appears, allow-once proceeds, reject-once refuses, allow-always is not asked twice in the same session. Pi session → NO prompt ever appears, badge visible.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03 Wire permission engine round-trips into default-ask prompt UI]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy (accepted)]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]] (probe 1: 0 permission round-trips for Pi)
