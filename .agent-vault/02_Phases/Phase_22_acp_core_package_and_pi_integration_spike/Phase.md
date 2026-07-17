---
note_type: phase
template_version: 2
contract_version: 1
title: ACP Core Package and Pi Integration Spike
phase_id: PHASE-22
status: completed
owner: ''
created: '2026-07-10'
updated: '2026-07-15'
depends_on:
  - '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
  - '[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy — adopt pinned pi-acp, fork into a shim, or contribute native --mode acp]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 22 ACP Core Package and Pi Integration Spike

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the ACP Core Package and Pi Integration Spike milestone.
- Stand up `packages/harness` (`@srgnt/harness`, pure Node, zero Electron imports): ACP client wrapper over `@agentclientprotocol/sdk`, harness supervisor (lazy spawn, health, kill-trees, idle reaping), and harness registry with the built-in Pi definition.
- Build the scriptable mock ACP agent (`AgentSideConnection`) plus recorded-traffic fixture tests that every later phase tests against.
- Prove `initialize → session/new → session/prompt → session/update → session/cancel` against both the mock agent and real Pi (pinned `pi-acp` adapter) in a hidden dev console; produce the spike report and the adapter decision gate (adopt / fork into `packages/shims/pi-acp` / contribute native `--mode acp` upstream).

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Create `packages/harness` with subpackages: `acp/` (connection lifecycle over `@agentclientprotocol/sdk` `ClientSideConnection`, typed update stream, capability model), `registry/` (HarnessDefinition data model, built-in Pi entry launching pinned `pi-acp`), `supervisor/` (spawn/health/kill-tree/idle-reap), `testing/` (mock agent).
- Boundary rule enforced from day one: `harness` never touches workspace disk layout; `runtime` never speaks ACP.
- Mock ACP agent with scriptable scenarios: streaming chunks, thought blocks, tool calls with updates, permission round-trips, terminal usage, plan updates, crash mid-turn, malformed JSON-RPC.
- Recorded-traffic fixtures from real Pi sessions; Effect Schema tolerant-decode contract tests pinned to fixtures.
- Hidden dev console (renderer, behind a flag): raw prompt → live update stream → cancel, against mock and real Pi.
- Pi spike deliverable: measured findings on pi-acp permission routing, MCP passthrough, loadSession support; decision-gate note choosing adopt / fork into `packages/shims/pi-acp` / contribute native `--mode acp` upstream.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- Any product chat UI (Phase 23) — the dev console is deliberately raw and flag-gated.
- Session persistence (Phase 24) — sessions in this phase are ephemeral.
- Driving `pi --mode rpc` natively — ACP is the only integration surface (see DEC-0017 boundary).
- Implementing the fork/shim or upstream `--mode acp` contribution — this phase only *decides* via the spike gate.
- Groups, bus, or MCP injection beyond confirming passthrough behavior in the spike.

## Dependencies

- Depends on [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] and [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]].
- Requires PHASE-21's contracts v2 skeleton (HarnessDefinition/SessionEvent schemas) and the five-package monorepo shape.

## Acceptance Criteria

- [x] Scope is concrete and linked to the right durable notes.
- [x] Step notes exist for the first executable work units.
- [x] Validation and documentation expectations are explicit.
- [x] `@srgnt/harness` builds standalone with no Electron imports (enforced by lint/dep-cruise check) and passes unit tests.
- [x] Mock ACP agent supports scripted scenarios covering streaming, tool calls + updates, permission round-trips, terminal use, plan updates, crash mid-turn, and malformed JSON-RPC.
- [x] Fixture-based contract tests decode recorded real-Pi traffic; tolerant-reader behavior is pinned.
- [x] Supervisor demonstrates lazy spawn, health detection, kill-tree on stop/quit, and crash surfacing under test.
- [x] Dev console (flag-gated) completes a real Pi round-trip: initialize → session/new → prompt → streamed updates → cancel.
- [x] Spike report exists as a vault note with measured pi-acp findings (permissions, MCP passthrough, loadSession) and the decision gate is recorded as a vault decision (adopt / fork / contribute).

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy — adopt pinned pi-acp, fork into a shim, or contribute native --mode acp]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]
- [x] [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle|STEP-22-02 Implement harness supervisor with lazy spawn health and kill-tree lifecycle]]
- [x] [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model|STEP-22-03 Implement harness registry with built-in Pi definition and capability model]]
- [x] [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_04_build-scriptable-mock-acp-agent-and-recorded-traffic-fixture-tests|STEP-22-04 Build scriptable mock ACP agent and recorded-traffic fixture tests]]
- [x] [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Protocol ground truth (2026-07-10): ACP v1 = JSON-RPC 2.0/stdio; `initialize` → `session/new {cwd, mcpServers}` → `session/prompt` → `session/update` stream → stop reason; `session/request_permission`; client-side `fs/*` + `terminal/*`; `session/load` (replay) / `session/resume` (no replay) / `session/list` / `session/close` recently stabilized; MCP stdio transport mandatory, HTTP optional. TS SDK: `@agentclientprotocol/sdk` (`ClientSideConnection` / `AgentSideConnection`).
- Pi reality: pi 0.80.5 installed locally; no native ACP; community `pi-acp` (~0.0.31, `npx pi-acp`) bridges to `pi --mode rpc` with known gaps — no client fs/terminal delegation, weak permission routing, MCP passthrough issues; native `--mode acp` proposed upstream (undecided). The spike measures these, no assumptions.
- Step order: SDK wrapper (01) → supervisor (02) and registry (03) in parallel → mock agent + fixtures (04) → dev console + spike + gate (05).
- The mock agent is deliberately in-scope here, not with the UI: it is the test substrate for every later phase.
- Validation: `pnpm --filter @srgnt/harness test` + boundary lint (no Electron imports); dev-console round-trip against real Pi recorded in the spike note.
- Post-gate follow-up (2026-07-10): once the STEP-22-05 gate decision lands, run `/vault:refine` across phases 23–29 to fill their Execution Brief / Validation Plan companions. They are deliberately left as placeholders until then so refinement can incorporate the measured pi-acp findings (permission routing, MCP passthrough, loadSession support) instead of assumptions.
- STEP-22-05 spike evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (measured pi-acp@0.0.31 permission/MCP/loadSession/fs-terminal behavior) feeding gate decision [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (status: proposed — awaiting human ratification).
