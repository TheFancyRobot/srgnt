# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

### Execution 2026-08-13

**Environment**

- `opencode --version` -> `1.18.18` at `/Users/dino/.nvm/versions/node/v24.15.0/bin/opencode`; recorded as `OPENCODE_TESTED_VERSION` in `packages/harness/src/registry/builtins.ts`.
- `pi --version` -> `0.84.1` (adapter still pinned at `pi-acp@0.0.31`); the gated pi IT is green with the new `detectCommand: 'pi'` field.
- **Trap hit:** `packages/*/dist/` held a stale build from an earlier abandoned attempt at this step (its `SHarnessCapabilityEntry` still carried the removed `generation` counter). runtime/desktop resolve `@srgnt/contracts` and `@srgnt/harness` through `dist`, so new schema code is invisible to them until `pnpm --filter <pkg> build`. Six runtime tests failed misleadingly before rebuilding. Rebuild contracts + harness after touching their schemas, before running runtime/desktop suites.

**What shipped**

- `packages/contracts/src/harness.ts` - optional `detectCommand`; `SHarnessCapabilityEntry` + `SHarnessCapabilitiesFile` (`version: Schema.Literal(1)`, so a bumped file decodes as "no cache"). Capability payloads stay opaque records, matching how the IPC contract already treats them - contracts must not fork the harness-owned model. **No `generation` field** (deliberate, per the refined brief).
- `packages/contracts/src/workspace/layout.ts` - `workspaceFiles.harnessCapabilities = 'harness-capabilities.json'`. Not a seed file: it exists only once something has connected.
- `packages/harness/src/registry/builtins.ts` - `opencodeDefinition` (`opencode acp`, zero quirks, zero overrides), `OPENCODE_HARNESS_ID`, `OPENCODE_TESTED_VERSION`; `piDefinition.detectCommand = 'pi'`; both in `BUILTIN_HARNESSES`.
- `packages/harness/src/registry/detect.ts` - `detectHarness(definition)` resolving `detectCommand ?? launch.command`, plus `detectOpencode`.
- `packages/harness/src/acp/capabilities.ts` - `NegotiatedCapabilities` gains `sessionList` and `authMethods` (the SDK's `AuthMethod[]`, whole - no `{id,name}` projection); new `mergeSessionCapabilities(base, {modes?, slashCommands?})`, one-way and observation-only.
- `packages/harness/src/acp/connection.ts` - `connection.negotiated` (pre-override view) beside `connection.capabilities` (effective), and `withObserved(observed)` returning both merged views.
- `packages/runtime/src/harnesses/capability-cache.ts` (new) - `HarnessCapabilityCache` (tolerant `read`, `get` -> measured/stale/missing, queued `record`) and `harnessDefinitionFingerprint` (sha256 over key-sorted JSON, 16 hex chars). Single in-process write queue, last-write-wins, with the `ponytail:` comment naming the upgrade path.
- `packages/desktop/src/main/chat/` - `ChatConnection.definition`, controller option `onCapabilities`, a `reportCapabilities` closure that accumulates observations, and the `chat/index.ts` wiring that writes through to `harness-capabilities.json` at the current workspace root (fire-and-forget).

**Design calls made during execution**

- `mergeSessionCapabilities` lives in `@srgnt/harness`, but desktop-main reaches it through `connection.withObserved(...)`: a static value import of the ESM-only harness package from CJS desktop-main is `ERR_REQUIRE_ESM` (the standing trap), and duplicating the merge in desktop would fork the rule.
- Write-through fires at most three times per session: baseline at connect, again if `session/new` reports `modes`, again on the first non-empty `available_commands_update`. Without this the first cached opencode row would claim `slashCommands: false` for an agent that has 93 of them.
- The mock target caches nothing - it is not a registry harness and carries no definition, so a mock session leaves no row. The Validation Plan's "start a mock session and inspect the file" manual check therefore does not apply as written; desktop unit tests cover the write-through instead.
- The gated IT *writes* the fixtures rather than a separate capture script: one path, and re-recording is just `SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test opencode`. Catalog arrays are capped at 3 entries in the fixture (the raw lists enumerate the developer's local commands/agents/models - 34 KB and personal).

**Measured findings** - full capture in [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture]]. Headline: opencode exposes modes *and* model as ACP `configOptions`, not a `modes` block, so `readModes` sees nothing and `session/set_mode` is the wrong method (the sharpest code-not-data gap for STEP-25-04). It also advertises `session/close` and `session/fork`, which srgnt does not model at all, and `mcpHttp`/`mcpSse` (pi has neither). Its single auth method carries no `type`/`args` - the login command exists only as prose in `description`.

**Not measured** (recorded so silence is not read as evidence): permission round-trip (the trivial prompt triggered no tool call, so `permissionRequests=0` proves nothing), live `session/load`/`session/resume`, MCP passthrough, and the unauthenticated failure shape.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
