# Implementation Notes

- SDK pinned at exact `@agentclientprotocol/sdk@1.2.1` (no caret) per pin policy; bumps must re-run fixture tests.
- `@srgnt/harness` is ESM (`"type": "module"`, tsconfig `module: NodeNext`) — deliberate deviation from runtime's CommonJS because SDK 1.2.1 is ESM-only; CJS output would `require()` ESM and crash on Node 20. Node ESM imports contracts' CJS dist without issue.
- SDK 1.2.1 deprecates `ClientSideConnection`/`AgentSideConnection` in favor of a new `client()`/`agent()` builder API; the deprecated classes remain fully functional and match this step's spec. Migration candidate at next SDK bump.
- Wrapper surface (`packages/harness/src/acp/`): `AcpAgentConnection.connect(options)` → Effect; typed methods `newSession/load/resume/setMode/prompt/cancel`; `updates(sessionId)` async iterator + `updateStream(sessionId)` Effect Stream; `capabilities` (NegotiatedCapabilities); `close`/`closed`/`isClosed`; `onUpdateWarning`.
- Spawner is injected (`AgentSpawner` → `SpawnedAgent { stream, kill? }`); `childProcessSpawner` is the pure-Node default (stdio via `ndJsonStream`, stderr inherited). Supervisor (STEP-22-02) owns real lifecycle/kill-trees.
- Client-service ports defined as interfaces: `PermissionPort` (required), `FileSystemPort`, `TerminalPort` (optional; client capability flags derive from presence). Electron implementations arrive in Phase 23.
- Error taxonomy (`Schema.TaggedError` in `errors.ts`): `SpawnFailed`, `InitializeFailed`, `TurnFailed` (carries sessionId), `ConnectionLost`, `ProtocolError` (carries JSON-RPC code/method/data); `AcpWrapperError` union; `fromSdkError` maps SDK `RequestError` → ProtocolError and post-close failures → ConnectionLost.
- `SessionUpdateHub` (`stream.ts`): per-session unbounded buffers so `dispatch` never blocks the connection read loop (slow-consumer safe); unknown-session and after-end updates are dropped with a warning event (tolerant reader, ARCH-0009). Single consumer per session by design.
- Pinned SDK wire behavior: `ndJsonStream` skips garbage stdout lines between frames (logs and continues) — tested as tolerance, not ProtocolError. SDK also augments initialize `clientCapabilities` with an `auth` block on the wire (wire assertions use subset matching).
- Capability model (`capabilities.ts`): `loadSession` from agentCapabilities; `resumeSession` from `sessionCapabilities.resume` (`{}` = on, `null`/absent = off); images/audio/embeddedContext from promptCapabilities; mcpHttp/mcpSse from mcpCapabilities; `mcpServers` defaults true (stdio MCP is protocol baseline); `modes`/`slashCommands` default false (session-discovered, override-forceable). `applyCapabilityOverrides` consumes contracts `HarnessCapabilityOverrides`.
- Boundary enforcement: `packages/harness/scripts/check-harness-boundary.mjs` scans src imports (import/export-from/dynamic-import/require) plus package.json dependency fields for `electron`/`@srgnt/runtime`/`@srgnt/desktop`; wired into the package `lint` script, so root `pnpm lint` runs it via `pnpm -r`. Proven to exit 1 on a deliberate `import 'electron'`.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
