# Execution Brief

## Why

- The mock agent is the deterministic test substrate for phases 23–28 (chat E2E, persistence crash tests, group bus scenarios, pipeline runs). Building it now — before any UI — is the plan's core testing bet (decision log D20).

## Prerequisites

- STEP-22-01 (the SDK's `AgentSideConnection` is the implementation base; the wrapper is the thing under test).

## Likely Code Paths

- `packages/harness/src/testing/mock-agent/` — `bin.ts` (stdio entry, reads a scenario file path from argv/env), `scenario.ts` (schema: ordered directives), `runner.ts` (executes directives against `AgentSideConnection`).
- Scenario directives (minimum set): `emit_chunks` (agent/thought message streaming with delays), `tool_call` + `tool_call_update` sequences (incl. diff + terminal content), `request_permission` (with expected-response branching), `use_terminal` (exercise client terminal methods), `plan_update`, `advertise_commands`, `set_mode`, `crash` (exit N mid-turn), `emit_malformed` (raw non-JSON-RPC bytes), `sleep`, `expect_prompt` / `expect_cancel` (assertion directives).
- `packages/harness/src/testing/fixtures/` — recorder utility (tee raw frames from a live wrapper connection to `fixtures/pi/<name>.jsonl`) + committed recordings from real Pi sessions.
- Fixture decode tests: every recorded frame decodes through the contracts' tolerant SessionEvent/update schemas; snapshot the *shape*, not the content.

## Execution Checklist

1. Define the scenario schema in contracts-adjacent test code (not `@srgnt/contracts` — it's test tooling, keep it in `testing/`).
2. Implement the runner against `AgentSideConnection`; run every scenario in-process first (fast unit path).
3. Wire the bin entry and prove the same scenarios pass when spawned as a real subprocess through the supervisor (the slow-but-honest path; a handful of scenarios suffice).
4. Record 2–3 real Pi fixtures with the recorder (simple prompt, tool-using prompt, cancelled turn) and land the decode suite.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_04_build-scriptable-mock-acp-agent-and-recorded-traffic-fixture-tests|STEP-22-04 Build scriptable mock ACP agent and recorded-traffic fixture tests]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
