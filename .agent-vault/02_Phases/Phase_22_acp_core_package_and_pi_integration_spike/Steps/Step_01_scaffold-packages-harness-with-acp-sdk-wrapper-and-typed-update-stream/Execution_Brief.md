# Execution Brief

## Why

- `@srgnt/harness` is the foundation every later phase builds on. Getting the wrapper + boundary rules right here (pure Node, typed streams, tagged errors) prevents Electron coupling and protocol sprawl forever after.

## Prerequisites

- PHASE-21 complete (contracts v2 HarnessDefinition/SessionEvent schemas exist; five-package workspace).
- `pnpm add @agentclientprotocol/sdk --filter @srgnt/harness` — pin the exact version in package.json (no caret) and record it in Implementation Notes; SDK bumps re-run fixture tests by policy.

## Likely Code Paths

- New `packages/harness/` mirroring `packages/runtime`'s shape: `package.json` (name `@srgnt/harness`, deps: `@agentclientprotocol/sdk`, `effect`, `@srgnt/contracts`; NO `electron`), `tsconfig.json` extending `@srgnt/tsconfig/base`, `src/index.ts` exports.
- `src/acp/connection.ts` — spawn child via injected spawner (supervisor owns actual spawning later), wire stdio to `ClientSideConnection`, run `initialize` (protocol version + client capabilities: fs/terminal flags injected), expose `newSession/prompt/cancel/load/resume/setMode` typed methods.
- `src/acp/stream.ts` — `session/update` notifications as a typed Effect Stream (or async iterable) keyed by sessionId; backpressure-safe buffering.
- `src/acp/capabilities.ts` — negotiated-capability model consumed by registry overrides later.
- `src/acp/errors.ts` — `Schema.TaggedError` types per effect-best-practices (SpawnFailed, InitializeFailed, TurnFailed, ConnectionLost, ProtocolError).
- Client-service interfaces (`fs`, `terminal`, `permission` callbacks) defined here as ports; Electron implementations arrive in Phase 23.
- Boundary enforcement: lint script or dep-check (`scripts/check-harness-boundary.mjs` or eslint no-restricted-imports) failing on `electron`/`@srgnt/runtime` imports; wire into root `lint`.

## Execution Checklist

1. Scaffold package; add to root typecheck/test/lint scripts (`pnpm -r` picks it up automatically — verify).
2. Implement connection + stream + errors with an in-process `AgentSideConnection` test double (SDK provides both sides — no child process needed for unit tests).
3. Add the boundary check and prove it fails on a deliberate `import 'electron'` (then remove the import).
4. Keep everything protocol-shaped: no srgnt session ids, no persistence, no UI concepts in this package's types (those live in contracts/runtime).

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
