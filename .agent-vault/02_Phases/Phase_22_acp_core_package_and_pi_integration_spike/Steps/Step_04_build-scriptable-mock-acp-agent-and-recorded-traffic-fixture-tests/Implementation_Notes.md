# Implementation Notes

## Module layout (`packages/harness/src/testing/`)

- `mock-agent/scenario.ts` — Effect `Schema` for the scenario file: a tagged union of 14 directives + init capability knobs + `stopReason`. `readScenario` (tolerant, `onExcessProperty: 'ignore'`) and `parseScenario` (throws; used by the bin). `DIRECTIVE_TYPES` is the exhaustiveness/coverage anchor.
- `mock-agent/runner.ts` — `MockAgent implements Agent` (SDK). The fuller, standalone **superset** of the small inline `MockAgent` in `acp/connection.test.ts`. `prompt()` replays the scenario's directives against the live `AgentSideConnection`. `RunnerHooks` inject the two effects the runner can't do itself: `onCrash(code)` and `rawWrite(raw)` — so one runner behaves identically in-process and as a real subprocess. Collects `assertionErrors` (from `expect_*`) and `executed` (coverage evidence).
- `mock-agent/connect.ts` — `connectMockAgent(scenario, opts)`: in-process **message-level** pair (same pattern as `connection.test.ts`), wraps the mock in `AcpAgentConnection`. Default `onCrash` throws → wrapper `TurnFailed`.
- `mock-agent/bin.ts` — stdio entry. Reads `--scenario <path>` / `--scenario=<path>` / `MOCK_AGENT_SCENARIO`. Builds the transport by hand (a single serialized `WritableStream` over fd 1) so SDK frames and raw `emit_malformed` bytes share one ordered writer. `onCrash = process.exit(code)`, `rawWrite = writeStdout(...)`.
- `mock-agent/index.ts`, `testing/index.ts` — re-exports; new package subpath **`@srgnt/harness/testing`** (added to `package.json` exports) is the substrate entry for phases 23–28.
- `fixtures/recorder.ts` — `redactHomePaths` (real `homedir()` + any `/Users|/home/<user>` → `<HOME>`), `FrameRecorder` (dense `seq`, emits contracts `SessionEvent` envelopes), `recordUpdates(connection, sessionId)` tees a live turn to redacted, decodable envelopes.
- `fixtures/pi/*.jsonl` (+ `README.md`) — committed, redacted corpus: `simple-prompt`, `tool-use` (carries an unknown update variant **and** an unknown extra envelope field), `cancelled-turn`.

## Scenario directive schema (full list)

`emit_chunks` (channel agent|thought|user, chunks, delayMs) · `tool_call` (toolCallId, title, kind, status, content, rawInput) · `tool_call_update` (toolCallId, status, title, content, rawOutput) · `plan` (entries: content/priority/status → full-list `plan` update) · `advertise_commands` (commands → `available_commands_update`) · `set_mode` (modeId → `current_mode_update`) · `request_permission` (toolCallId, options, `expectOutcome`, `expectOptionId`) · `use_terminal` (command, args, `expectOutputContains`) · `read_file` (path, `expectContentContains`) · `sleep` (ms) · `crash` (exitCode) · `emit_malformed` (raw) · `expect_prompt` (contains) · `expect_cancel` (timeoutMs).

## Reuse & key decisions

- Runner is the **superset** of the inline `connection.test.ts` MockAgent (kept — it tests the wrapper's own edge paths); the byte-level `scriptedAgent` there already pins garbage-frame tolerance, so `emit_malformed`/`crash`-as-exit are proven via the real subprocess (the honest path) rather than duplicated in-process. `supervisor/__fixtures__/fake-agent.mjs` stays a pure-process (non-ACP) fixture; this is the ACP-speaking one.
- `Agent` interface requires `authenticate` — added a no-op (`{}`); scenarios never gate on auth.
- Subprocess suite compiles the 3 bin files to `dist/testing/mock-agent/` via `ts.transpileModule` (module **ESNext**, not NodeNext — transpileModule can't detect `"type":"module"` from a bare fileName and would emit CommonJS → `ReferenceError: exports is not defined`). Matches the acceptance-check path `node dist/testing/mock-agent/bin.js`. Launched through a `HarnessRegistry` **custom** definition + `Supervisor.spawnerFor(id)`.
- `readSessionEvent` (contracts) drops unknown envelope fields (Struct ignores excess on decode) but preserves the opaque `payload` verbatim (`Schema.Unknown`) — this is the ARCH-0009 invariant the decode suite asserts explicitly.

## Related Notes

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_04_build-scriptable-mock-acp-agent-and-recorded-traffic-fixture-tests|STEP-22-04 Build scriptable mock ACP agent and recorded-traffic fixture tests]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
