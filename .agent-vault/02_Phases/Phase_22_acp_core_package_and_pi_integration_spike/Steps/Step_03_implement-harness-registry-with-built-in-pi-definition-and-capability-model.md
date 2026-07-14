---
note_type: step
template_version: 2
contract_version: 1
title: Implement harness registry with built-in Pi definition and capability model
step_id: STEP-22-03
phase: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]'
status: completed
owner: claude-worker
created: '2026-07-10'
updated: '2026-07-14'
depends_on:
  - STEP-22-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
context_status: completed
context_summary: Advance [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model|STEP-22-03 Implement harness registry with built-in Pi definition and capability model]].
---

# Step 03 - Implement harness registry with built-in Pi definition and capability model

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement harness registry with built-in Pi definition and capability model.
- Parent phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]].
- Exact outcome: `packages/harness/src/registry/` holds the HarnessDefinition model (launch spec, source, capability overrides, quirks, install hints) with a built-in Pi definition launching the pinned `pi-acp` adapter version, Pi binary/version detection, and the capability-merge logic (negotiated capabilities ∩ overrides → effective capabilities the UI consumes).
- Starting files: `packages/harness/src/registry/` (new); HarnessDefinition schema from contracts (STEP-21-04); local reality: pi 0.80.5 on PATH, `pi-acp` ~0.0.31 via npx.
- Validate: unit tests for definition merge/override precedence and version detection; a registry-launched Pi connection completes `initialize` with capabilities captured.

## Why This Step Exists

- Explain why this step matters to the parent phase.
- Call out the risk reduced, capability added, or knowledge gained.

## Prerequisites

- List the notes, approvals, tooling, branch state, or prior steps required before starting.
- Include blocking commands or setup steps if they are easy to forget.

## Relevant Code Paths

- List the most likely files, directories, packages, tests, commands, or docs to inspect.
- Include only the paths that help a new engineer get oriented quickly.

## Required Reading

- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (HarnessDefinition data model + capability-driven UI invariant)

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

- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-worker
- Last touched: 2026-07-14
- Next action: None — registry + built-in Pi definition + detection shipped and validated (harness 73/73 pass + 1 env-gated IT that passes with SRGNT_IT_PI=1; root typecheck + boundary lint clean). Proceed to STEP-22-04 (mock ACP agent + recorded-traffic fixture tests).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### 2026-07-14 — registry + Pi definition + detection (claude-worker)

- New module `packages/harness/src/registry/` (pure Node, boundary-clean), wired into `src/index.ts`:
  - `builtins.ts` — `PI_ACP_VERSION = '0.0.31'` (pinned), `PI_HARNESS_ID = 'pi'`, `piDefinition` (typed `HarnessDefinition` from `@srgnt/contracts`), and `BUILTIN_HARNESSES`. Pi shape: `{ id:'pi', name:'Pi', source:'builtin', launch:{ command:'npx', args:['pi-acp@0.0.31'], env:{} }, quirks:['adapter-mediated','permission-routing-gaps','mcp-passthrough-gaps'], capabilityOverrides:{ mcpServers:false }, docsUrl }`. Note: contracts `SHarnessDefinition` has **no** `installHint` field (the Execution Brief's example listed one) — install guidance went into `description` instead to respect "don't redefine schemas".
  - `detect.ts` — `detectCommand(command, {timeoutMs, probe})` → `DetectionResult` with three mutually exclusive states: `ok` (binary found, `--version` clean), `probe-failed` (`timeout` | `nonzero-exit` | `no-version-output`), `not-installed` (ENOENT). `nodeVersionProbe` is the default `VersionProbe` seam (spawns real process, **SIGKILLs on timeout so a hung PATH shim leaves no orphan**); unit tests inject fake `ProbeOutcome`s. `detectPi()` = `detectCommand('pi')`.
  - `registry.ts` — `HarnessRegistry.create({builtins?, workspace?})`, `list/get/has/require(→UnknownHarness)`, `effectiveCapabilities(id, negotiated)`. `loadWorkspaceHarnesses(raw)` decodes untrusted `harnesses.json` via `Schema.decodeUnknownEither(SHarnessesFile)` → `{ok:true,file} | {ok:false,error}` (typed failure, no throw).
- Merge precedence (low→high): built-ins (declared order) → workspace `harnesses.json` (file order). Same-`id` entry **replaces** the earlier one wholesale (delete-then-set keeps `list()` order stable and "last write wins" observable); workspace can shadow/customize a built-in (e.g. repin Pi), later workspace dup beats earlier.
- Capability merge: `effectiveCapabilities(definition, negotiated)` delegates to the acp-layer `applyCapabilityOverrides` — single-sourced, no second/divergent merge semantics. Pi's only override restricts (`mcpServers:false`); tested both directions (disable a negotiated cap; a def with no overrides is a no-op). Design note: the acp `applyCapabilityOverrides` uses force on/off (booleans win) per contracts `SHarnessCapabilityOverrides`, deliberately so `modes`/`slashCommands` (never advertised at `initialize`) can be *asserted* by a definition; the Validation Plan's "override cannot enable a non-negotiated one" is upheld by built-in **authoring convention** (Pi only clamps), not a hard code clamp. Flag for a future decision note if a hard clamp on initialize-negotiated caps is later wanted.
- Integration test `pi.integration.test.ts` gated behind `SRGNT_IT_PI=1` (`describe.skip` otherwise), 120s timeout for cold `npx` download, auto-denies permissions. **Ran locally 2026-07-14 — passed.** Captured pi-acp `initialize` payload (STEP-22-05 baseline): `protocolVersion:1, agentName:'pi-acp', agentVersion:'0.0.31', loadSession:true, resumeSession:false, modes:false, slashCommands:false, images:true, audio:false, embeddedContext:false, mcpServers:true(negotiated → effective false via override), mcpHttp:false, mcpSse:false`. Local ground truth: `pi --version` → 0.80.6; node v24.15.0.
- Validation: `pnpm --filter @srgnt/harness test` → 73 passed / 1 skipped (registry.test.ts 15, detect.test.ts 9 new). `SRGNT_IT_PI=1 …` → +1 pass. Root `pnpm typecheck` clean (5 projects). `pnpm --filter @srgnt/harness lint` (tsc + boundary) passed.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Result: `packages/harness/src/registry/` ships the `HarnessDefinition`-based registry (merge of built-ins + workspace `harnesses.json`), the built-in Pi definition (`npx pi-acp@0.0.31`, three adapter quirks, `mcpServers:false` override), Pi binary/version detection with three typed outcomes and a no-orphan probe timeout, and `effectiveCapabilities` (negotiated + overrides) reusing the acp-layer merge. Barrel-exported via `src/index.ts`.
- Validation performed: harness unit suite 73 passed / 1 skipped (new: `registry.test.ts` 15, `detect.test.ts` 9); env-gated `pi.integration.test.ts` ran with `SRGNT_IT_PI=1` and passed, capturing the real pi-acp `initialize` capability payload (recorded in Implementation Notes for STEP-22-05). Root `pnpm typecheck` clean; `pnpm --filter @srgnt/harness lint` (tsc + boundary) passed.
- Follow-up: (1) STEP-22-05 spike should confirm/refine the three declared Pi quirks against the captured payload. (2) If a hard clamp preventing definitions from enabling non-negotiated initialize caps is later desired, raise a decision note — current merge follows contracts force-semantics by design (so `modes`/`slashCommands` can be asserted).
