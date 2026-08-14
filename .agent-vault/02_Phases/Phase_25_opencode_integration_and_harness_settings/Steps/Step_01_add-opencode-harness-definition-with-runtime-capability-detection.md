---
note_type: step
template_version: 2
contract_version: 1
title: Add opencode harness definition with runtime capability detection
step_id: STEP-25-01
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
status: done
owner: ''
created: '2026-07-10'
updated: '2026-08-13'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-08-13-224500-add-opencode-harness-definition-with-runtime-capability-detection-claude-opus-5|SESSION-2026-08-13-224500]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Add opencode harness definition with runtime capability detection

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add opencode harness definition with runtime capability detection.
- Parent phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]].
- Exact outcome: opencode is a built-in HarnessDefinition (`opencode acp`) with PATH/binary detection and version probing; capabilities come exclusively from runtime observation — the live `initialize` response as baseline, session-discovered fields merged in — and are persisted as last-negotiated for UI display, establishing the runtime-detection rule for all harnesses.
- Starting files: `packages/harness/src/registry/` (beside the Pi definition). Install prerequisite is already satisfied: `opencode 1.18.18` on PATH as of 2026-08-13.
- Validate: with opencode installed, a session completes a real prompt round-trip; capability matrix data matches the `initialize` payload captured in fixtures.

## Why This Step Exists

- opencode is the first **native** ACP harness (`opencode acp`) — the reality check on ARCH-0009's data-not-code invariant after adapter-mediated Pi; every code-not-data delta found here feeds STEP-25-04's Phase-26 requirements.
- Establishes the runtime-detection rule for all harnesses: capabilities exclusively from runtime observation, never hardcoded — the live `initialize` response is the baseline (captured the way STEP-22-03's `SRGNT_IT_PI=1` gated test did for Pi → new `SRGNT_IT_OPENCODE=1`), and session-discovered fields (`modes` via `session/new`, `slashCommands` via `available_commands_update`) merge into that baseline as observed; the merged result is persisted as last-negotiated for UI display (same rule stated in the Execution Brief — keep the two in sync). opencode starts with zero quirks/overrides and earns them only from measured probes.
- Not-installed is a first-class *product* state, not an error: `registry/detect.ts` already types `ok`/`probe-failed`/`not-installed`. On this machine opencode IS installed (`1.18.18`, 2026-08-13), so exercise the not-installed and probe-failed paths with injected probes (`registry/__fixtures__/hang-probe.mjs`) — do not uninstall opencode to test them. srgnt itself never installs (detection + guidance only).

## Prerequisites

- PHASE-24 merged; Phase-22 harness package is the real technical base.
- opencode installed: DONE (`1.18.18`, on PATH 2026-08-13). Record that exact version in Implementation Notes and set `OPENCODE_TESTED_VERSION` to it — all captures are measured against it. Re-run `opencode --version` before capturing in case it moved.
- Read the spike report first: it defines the capture discipline and what a measured capability row looks like.

## Relevant Code Paths

- `packages/harness/src/registry/builtins.ts` — `opencodeDefinition` (launch `opencode acp`, zero quirks/overrides) beside `piDefinition`; `OPENCODE_TESTED_VERSION` doc constant.
- `packages/contracts/src/harness.ts` — new optional `detectCommand` field (Pi launches via `npx` but detects `pi`; today that mapping is hardcoded in `detectPi`).
- `packages/harness/src/acp/capabilities.ts` — extend `NegotiatedCapabilities` with `authMethods` + `sessionList` (spike-observed, currently unmodeled).
- `packages/runtime/src/harnesses/capability-cache.ts` (new) — last-negotiated persistence to workspace `harness-capabilities.json`; desktop main writes through on connect.
- `packages/harness/src/registry/opencode.integration.test.ts` (new, `SRGNT_IT_OPENCODE=1`, cloned from `pi.integration.test.ts`) + `testing/fixtures/opencode/`; output note `06_Shared_Knowledge/opencode-acp-capture.md`.

## Required Reading

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (HarnessDefinition model + capability invariant)
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (capture discipline + measured-row shape to mirror)
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (accepted; the Pi contrast this step measures against)
- opencode ACP docs: opencode.ai/docs/acp (external)

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

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: 
- Last touched: 2026-08-13
- Next action: None for this step. STEP-25-02 consumes `detectHarness(definition)`; STEP-25-03 consumes `HarnessCapabilityCache.get()` (a `stale` result renders "re-connect to refresh"); STEP-25-04's inputs are in [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture]].
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

- **Done (2026-08-13).** opencode is a built-in `HarnessDefinition` (`opencode acp`, zero quirks, zero overrides) beside pi; `detectHarness(definition)` probes `detectCommand ?? launch.command` (pi now declares `detectCommand: 'pi'`); `NegotiatedCapabilities` carries `authMethods` (full SDK metadata) and `sessionList`; `mergeSessionCapabilities` folds session-discovered `modes`/`slashCommands` into the negotiated baseline; and `HarnessCapabilityCache` persists both views to `harness-capabilities.json` at the workspace root, fingerprinted by the effective definition, last-write-wins through one write queue. Desktop main writes through on every connect and on each new observation.
- Validation: contracts 186, harness 136 (+3 skipped ITs), runtime 454, desktop 1174 tests green; `pnpm lint` and `pnpm build` clean; gated `SRGNT_IT_OPENCODE=1` run completed `initialize` + a real prompt turn to `end_turn` against opencode 1.18.18, and the `SRGNT_IT_PI=1` regression still passes with the extended model. Details in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection/Outcome|Outcome]].
- Output note written: [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture (STEP-25-01)]]; fixtures committed under `packages/harness/src/testing/fixtures/opencode/`.
- Deliberately unmeasured (would need a tool-invoking, token-spending probe): opencode's `session/request_permission` round-trip, live `session/load`/`session/resume`, MCP passthrough, and the unauthenticated failure shape.
