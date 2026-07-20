---
note_type: step
template_version: 2
contract_version: 1
title: Build ACP conformance smoke-runner as harness validator
step_id: STEP-26-02
phase: '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-26-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Build ACP conformance smoke-runner as harness validator

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Build ACP conformance smoke-runner as harness validator.
- Parent phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]].
- Exact outcome: a conformance smoke-runner spawns any configured harness and executes a scripted probe (initialize negotiation, session/new, trivial prompt turn, permission behavior, cancel, teardown), producing a readable capability/behavior report with suggested quirk flags — surfaced in Settings as "Test this harness" and exportable as JSON.
- Starting files: `packages/harness/src/testing/` (invert the mock-agent scenario suite); `packages/harness/src/registry/` quirks model; Settings UI hook-in.
- Validate: runner against the mock agent reports full pass; against real Pi reports the known adapter gaps (permissions/MCP) matching the Phase 22 spike findings.

## Why This Step Exists

- A user-provided definition is a claim; the runner turns it into evidence — each check carries one of the canonical statuses `pass | fail | not-supported | skipped` (frozen in the Execution Brief's `SConformanceReport` contract; `not-installed` and `auth-required` are structured `reason` codes on a `skipped` check, never statuses themselves) plus *suggested* quirk flags (never auto-applied). It is the "Test this harness" button STEP-25-03 deliberately deferred, and the trust story that lets arbitrary harnesses into the app.
- Almost every piece exists as prior art: `AcpAgentConnection` is the probe surface, `pi-spike.integration.test.ts` is a hand-rolled one-harness conformance run (probes 1/2/4 = permission round-trip, MCP passthrough via `mcp-echo-server.mjs`, delegation), `detect.ts` types the pre-flight, and the mock agent is the test substrate. The work is composition + a report contract, not invention.
- Behavioral probes matter because `initialize` can lie (Pi advertises MCP + permissions that don't round-trip). Expect REQ-26-xx (lessons note) to pin the exact behavioral-probe designs and report vocabulary — mechanism fixed, parameters flexible.

## Prerequisites

- STEP-26-01 merged (definitions to test; Settings hosts the button). Consumes from PHASE-25: `authMethods`/`sessionList` on `NegotiatedCapabilities`, the *verified* auth-required error shape (STEP-25-03 Implementation Notes — read, don't re-derive), the mock `authRequired` directive.
- Read `pi-spike.integration.test.ts` end to end first — it is the design document. Then the lessons note; freeze the check catalog against REQ-26-xx before coding.

## Relevant Code Paths

- `packages/harness/src/conformance/` (new: `checks.ts`, `runner.ts` — pure, injectable spawner, no disk/Electron); `packages/contracts/src/` — `SConformanceReport` (crosses IPC).
- `packages/harness/src/acp/connection.ts` (probe surface), `src/registry/detect.ts` (pre-flight), `src/testing/mock-agent/` + `src/testing/fixtures/mcp-echo-server.mjs` (test substrate + MCP probe), `src/supervisor/kill-tree.ts` + `registry/__fixtures__/hang-probe.mjs` (no-hang discipline).
- Desktop: `harness:conformance-run` IPC, main service invocation (lazy-ESM), Settings button + report view + JSON export.

## Required Reading

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (mock agent + conformance relationship)

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

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator/Validation_Plan|Validation Plan]].
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
