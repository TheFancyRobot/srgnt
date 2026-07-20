---
note_type: step
template_version: 2
contract_version: 1
title: Implement GroupBroker and injected bus MCP server
step_id: STEP-27-02
phase: '[[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-27-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement GroupBroker and injected bus MCP server

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement GroupBroker and injected bus MCP server.
- Parent phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]].
- Exact outcome: a GroupBroker service (main process) owns member registry and message routing over a local socket (unix socket / named pipe, token-authenticated via member env); a bundled stdio MCP server executable is injected into each member's `session/new.mcpServers` exposing `group_send`, `group_inbox`, `group_wait`, `group_status`, and `memory_search` — the MCP child is a thin socket relay with zero business logic.
- Starting files: `packages/harness/src/groups/` (broker, bus-server bin, socket protocol); supervisor env plumbing; electron-builder config to ship the bus-server executable.
- Validate: integration test — mock member session calls `group_send`; broker routes to the second member's `group_inbox`; auth-failure and broker-restart cases covered.

## Why This Step Exists

- Tier 1 of the bus: structured agent-to-agent messaging that Phase-28 pipelines will build on.
- **Spike-shaped**: `pi-acp@0.0.31` never forwards `session/new.mcpServers` (DEC-0018 / probe 2), so this step is built and proven against the mock agent (and opencode), with per-member eligibility read from *effective* capabilities — Pi gets tier 1 only if the entry gate delivered upstream/fork.

## Prerequisites

- STEP-27-01 merged; entry-gate outcome recorded in DEC-0018.
- **Mock-agent prerequisite tasks (real work, first two checklist items):** (a) `MockAgent.newSession` must capture + spawn `mcpServers` (it currently ignores params); (b) new `call_mcp_tool` scenario directive with a minimal MCP client — without both, tier-1 E2E is impossible.
- New dependency: MCP SDK (default `@modelcontextprotocol/sdk`; verify version).

## Relevant Code Paths

- `packages/harness/src/groups/{broker.ts,socket.ts,bus-server/bin.ts}` (new) — broker emits events, never touches disk (ARCH-0009 boundary); bin = thin socket relay, token-auth hello, reconnect backoff.
- `packages/harness/src/acp/connection.ts` (`newSession` passes `mcpServers` verbatim) + `capabilities.ts` (effective `mcpServers` = eligibility signal); `registry/builtins.ts` (Pi's clamp).
- `packages/harness/src/testing/mock-agent/{runner.ts,scenario.ts}` — the prerequisite extensions.
- `GroupSessionController` (desktop main) — injection via the `require.resolve('@srgnt/harness')` bin-path recipe from `dev-console/session-controller.ts`; packaged-app reachability deferred to Phase 29 (note it).

## Required Reading

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (group message data flow, bus tiers)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
