---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Add capability matrix view and auth error surfacing
session_id: SESSION-2026-08-15-130000
date: '2026-08-15'
status: completed
owner: claude-opus-5
branch: phase/25-step-03-capability-matrix
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
step: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]'
related_bugs: []
related_decisions: []
created: '2026-08-15'
updated: '2026-08-15'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-08-15-130000
  status: completed
  updated_at: '2026-08-15T13:30:00.000Z'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]'
    section: Context Handoff
  context_summary: >-
    STEP-25-03 implemented on branch phase/25-step-03-capability-matrix. Adds the
    read-only `harness:capabilities` IPC channel (rows from the registry, cells
    from STEP-25-01's cache, per-field provenance, normalized auth methods),
    Settings -> Capabilities (`CapabilityMatrix.tsx`) rendering yes / no /
    clamped / forced / not-observed / not-measured plus two quirk-driven
    behavioral columns, and the auth wall as data: `chat:session:new` now answers
    `SChatAuthRequired` instead of throwing a raw JSON-RPC string, and
    `AuthPanel.tsx` renders it. `SAuthMethod` + `normalizeAuthMethod` live in
    contracts and are the only place a method's kind is decided; the pi fixture
    normalizes to `external-command` with the command built from its own args,
    the opencode fixture to `docs-only` because it advertises no command at all.
    The ACP auth-required shape was verified in the SDK source as JSON-RPC
    -32000, and the typed code is captured with `Effect.tapError` because
    `Effect.runPromise` rejects with a FiberFailure that has dropped it. The mock
    agent gained an `authRequired` scenario block so the whole path is testable.
    Pi's definition gained a fourth quirk, `no-client-delegation`, from
    STEP-22-05 probe 4. Validated with contracts 207, harness 148 (+3 skipped),
    runtime 458, desktop 1260, e2e auth/chat/harnesses/sessions 15 passed, plus
    `pnpm -r lint` and `pnpm -r build`. NOT VALIDATED - no manual run against a
    real unauthenticated opencode (the machine's provider is configured and
    un-configuring a developer's credentials was out of scope), and no manual
    GUI pass of the matrix against a live Pi session.
---

# Session — STEP-25-03 capability matrix and auth error surfacing

## Context

- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25]]
- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03]]
- Builds on: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01]] (the cache and `authMethods` this renders) and [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02]] (the harnesses service this extends)
- Evidence read first: [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture]] and [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]]

## What Happened

Executed in a fresh subagent with the orchestrator holding git. Implementation
detail lives in the step's Implementation Notes and Outcome; this note records
the decisions and the deviations.

The brief's corrected auth premise held under test: pi's `pi_terminal_login`
carries `type: 'terminal'` + `args`, opencode's carries neither, and both are
asserted directly against the committed fixtures. Nothing special-cases opencode
to reach a nicer affordance — `docs-only` is a real, shipped, load-bearing kind.

Decisions taken during execution:

- **The auth wall crosses IPC as data, not as an Error.** `ipcMain.handle`
  serializes a rejection to its message only, so the harness's advertised methods
  could never ride on a throw. `chat:session:new` answers a union
  (`SChatSessionNewResult`); fork and reconnect keep the old shape, since neither
  can act on an auth wall.
- **`rpc-authenticate` is retried on a FRESH connection**, not on a parked one.
  The failed connection is torn down at the failure (that teardown is what keeps
  the no-orphans invariant), so `authMethodId` rides on session creation and main
  runs `authenticate` before `session/new`. This avoided a pending-auth session
  registry with its own lifecycle, idle-reap and quit-teardown edges.
- **Pi gained a fourth quirk, `no-client-delegation`**, so the matrix's
  fs/terminal-delegation column has data instead of a permanent blank. It is
  declared from STEP-22-05 probe 4's measurement, the same provenance as pi's
  other three. Absent quirk renders as *not measured*, never as "delegates".
- **Provenance is computed from `SESSION_DISCOVERED_CAPABILITIES`**, newly
  exported next to `mergeSessionCapabilities`, rather than from a second list of
  field names in main or in the renderer.

## Deviations From The Brief

- **`SAuthMethod` has no `instructions` field.** The only prose a method carries
  is `description`; a second field would just be a copy that can disagree with
  it. The panel renders `description` for `docs-only`.
- **The Validation Plan's "a method with no command/type maps to
  `rpc-authenticate`" is superseded** by the brief's 2026-08-14 correction: that
  is exactly opencode's shape and it must map to `docs-only`. The kind ladder is
  now: a runnable command → `external-command`; a declared non-terminal `type`
  srgnt cannot run → `rpc-authenticate`; prose only (or `terminal` with no
  executable to run) → `docs-only`.
- **Auth detection covers session creation only.** A token expiring
  mid-conversation still surfaces through the STEP-23-04 prompt-error path, not
  the panel; `chat:session:prompt` answers `{stopReason}` and widening it was not
  worth it for a case neither shipped harness has demonstrated.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/contracts/src/harness.ts` — `SAuthMethod`, `SAuthMethodCommand`, the pure `normalizeAuthMethod`, and the `no-client-delegation` quirk.
- `packages/contracts/src/harness.test.ts`
- `packages/contracts/src/ipc/contracts.ts` — `harness:capabilities` channel, `SHarnessCapabilityRow`, `SHarnessCapabilitiesResponse`, `SChatAuthRequired`, `SChatSessionNewResult`, `authMethodId` on session-new.
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/harness/src/acp/capabilities.ts` — exported `SESSION_DISCOVERED_CAPABILITIES`.
- `packages/harness/src/acp/capabilities.test.ts`
- `packages/harness/src/acp/connection.ts` — `authenticate()`.
- `packages/harness/src/registry/builtins.ts` — pi declares `no-client-delegation` (STEP-22-05 probe 4).
- `packages/harness/src/registry/registry.test.ts`
- `packages/harness/src/testing/mock-agent/scenario.ts` — `authRequired` scenario block.
- `packages/harness/src/testing/mock-agent/runner.ts` — advertises methods verbatim; `session/new` throws `-32000` until `authenticate`.
- `packages/harness/src/testing/mock-agent/mock-agent.test.ts`
- `packages/desktop/src/main/services/harnesses.ts` — `capabilities()` + IPC handler.
- `packages/desktop/src/main/services/harnesses.test.ts`
- `packages/desktop/src/main/chat/session-controller.ts` — `ChatAuthRequiredError`, `-32000` detection via `Effect.tapError`, `newSession(..., authMethodId?)`.
- `packages/desktop/src/main/chat/session-controller.test.ts`
- `packages/desktop/src/main/chat/index.ts` — answers the auth wall as data.
- `packages/desktop/src/main/chat/ipc.test.ts`
- `packages/desktop/src/renderer/components/settings/CapabilityMatrix.tsx` (new)
- `packages/desktop/src/renderer/components/settings/CapabilityMatrix.test.tsx` (new)
- `packages/desktop/src/renderer/components/chat/AuthPanel.tsx` (new)
- `packages/desktop/src/renderer/components/chat/AuthPanel.test.tsx` (new)
- `packages/desktop/src/renderer/components/chat/ChatView.tsx` — auth actions bound to the wall's harness id.
- `packages/desktop/src/renderer/components/chat/ChatView.test.tsx`
- `packages/desktop/src/renderer/components/chat/ChatSessionContext.tsx`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/styles.css`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/e2e/auth.spec.ts` (new; registered in all three `test:e2e*` lists)
- `packages/desktop/package.json`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- `pnpm --filter @srgnt/contracts test` — 207 passed.
- `pnpm --filter @srgnt/harness test` — 148 passed, 3 skipped (gated ITs).
- `pnpm --filter @srgnt/runtime test` — 458 passed.
- `pnpm --filter @srgnt/desktop test` — 1260 passed.
- `playwright test e2e/auth.spec.ts` — 1 passed (real Electron, spawned mock child).
- `playwright test e2e/chat.spec.ts e2e/harnesses.spec.ts e2e/sessions.spec.ts` — 14 passed.
- `pnpm -r lint`, `pnpm -r build` — clean; contracts and harness rebuilt first (stale-`dist` trap).
- **Not run:** any pass against a real *unauthenticated* opencode. This machine's provider is configured, so the `docs-only` rendering is verified from the committed fixture and the mock scenario, never from a live auth failure.
<!-- AGENT-END:session-validation-run -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- STEP-25-04 (next): the lessons-learned note. Evidence from this step — auth metadata is not reliably machine-actionable (opencode advertises no command), `configOptions` is an unmodeled generic surface, `session/close` and `session/fork` are unmodeled, and `no-client-delegation` was needed as a fourth quirk.
- opencode's `configOptions` (mode *and* model) remain invisible: `readModes` reads only a `modes` block, and `session/set_config_option` is the method that applies. Deliberately not chased here — it is a new generic surface and a STEP-25-04 input.
- Mid-conversation auth failure should reach the same panel from the prompt-failure surface; today it uses the STEP-23-04 prompt-error path.
- Drive the in-chat harness picker from the registry rather than `mock`, `pi` and the project default (carried from STEP-25-02).
- Manual verification against a real unauthenticated harness, and the GUI pass carried since Phase 23.

This block is the complete follow-up list; `## Follow-Ups` below restates it in prose.
<!-- AGENT-END:session-follow-up-work -->

## Follow-Ups

- Mid-conversation auth failure → same panel, from the prompt-failure surface.
- opencode's `configOptions` (mode *and* model) are still invisible: `readModes`
  reads only a `modes` block, and `session/set_config_option` is the method that
  applies. Deliberately not chased here — it is a new generic surface, and a
  STEP-25-04 input.
- The in-chat harness picker still lists `mock`, `pi` and the project default
  rather than every configured harness (carried from STEP-25-02).
- Manual verification against a real unauthenticated harness remains owed, as
  does the GUI pass carried since Phase 23.
