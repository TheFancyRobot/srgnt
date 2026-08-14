---
note_type: step
template_version: 2
contract_version: 1
title: Build harness settings UI with per-project defaults
step_id: STEP-25-02
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
status: done
owner: ''
created: '2026-07-10'
updated: '2026-08-14'
depends_on:
  - STEP-25-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Build harness settings UI with per-project defaults

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Build harness settings UI with per-project defaults.
- Parent phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]].
- Exact outcome: Settings gains a harness section — list configured harnesses, override binary path and env per harness, choose the per-project default harness — persisted to workspace (`harnesses.json` overrides + `settings.json`/`project.json` defaults) and applied on next spawn. Env values are `${env:NAME}` references or non-sensitive literals; the service refuses to persist secret-shaped literals (brief has the mechanism).
- Starting files: `packages/desktop/src/renderer/components/Settings.tsx`; `packages/harness/src/registry/` (definition merge with user overrides); project defaults from STEP-24-02.
- Validate: settings persistence tests; changing a binary path takes effect on next session spawn (integration test with two fake binaries).

## Why This Step Exists

- `harnesses.json` + registry shadowing (last-write-wins wholesale replace) already exist but are hand-edit-only; this step makes them user-operable and gives detection's `not-installed`/`probe-failed` states their remedy (binary-path override — critical because packaged macOS Electron lacks the login-shell PATH).
- Per-project default harness turns the two-harness reality into a sticky preference: STEP-24-02's `defaultHarnessId` storage + `project:set-defaults` IPC get an editing surface.
- Note the honest consequence of wholesale-shadow overrides: an overridden built-in stops tracking future built-in changes until reset — the UI must badge it (brief has the recorded default + alternative). The same wholesale semantics make a *partial* save destructive: this step edits only binary path and env, but the saved record REPLACES the definition, so anything the editor did not carry (`capabilityOverrides`, `quirks`, `detectCommand`, `source`) would be silently dropped and would change detection and capability-safety behavior. The save must therefore round-trip the FULL definition it was given (or merge field-by-field over it) — see the brief's override semantics and the regression check in the validation plan.

## Prerequisites

- STEP-25-01 merged (`detectHarness`, `detectCommand` field, opencode definition); STEP-24-02 merged (project defaults IPC).
- Read `registry.ts` merge precedence and `services/settings.ts` + `workspace.ts` (`afterRootChanged`) before designing the service.

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts` — `harness:list` / `harness:save-override` / `harness:reset-override` channels (`parseSync` boundary).
- `packages/desktop/src/main/services/harnesses.ts` (new) — registry build + per-definition detection + atomic `harnesses.json` writes, re-rooted via workspace hooks; lazy-ESM import of `@srgnt/harness` (CJS main).
- `packages/desktop/src/renderer/components/Settings.tsx` (`SettingsPanel` section model) + new harness section/`components/settings/HarnessSettings.tsx`: detection chips, binary path + env editor, overridden badge + reset, per-project default harness selector (via `project:set-defaults`).
- Per-harness permission-policy defaults: deferred by default (Decision needed — see brief).

## Required Reading

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02]] (per-project defaults storage + IPC this step builds on)

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

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: 
- Last touched: 2026-08-14
- Next action: None for this step. STEP-25-03 renders the capability matrix beside `settings-section-harnesses` and owns `harness:capabilities` (this step's `harness:list` deliberately carries none).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Full findings live in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Implementation_Notes|Implementation Notes]].
- Sharpest three: `SChatTarget` had to widen from a literal union to `Schema.String` (valid targets are registry data, so only main can tell dangling from unknown); the `Function('return import(...)')` ESM dance is untestable under vitest, so the harnesses service takes an injectable `loadHarness`; a real workspace SEEDS `harnesses.json`, so "file missing" is a unit-test-only state.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Done. Settings → Harnesses lists every registry entry with detection state and edits binary path / detect command / env; overrides land in `harnesses.json` (`0600`, canonicalized against the base, serialized writes) and are what the next spawn launches. Per-project default harness writes through `project:set-defaults`; a dangling default now blocks with an actionable error instead of degrading to the mock.
- Validation and follow-up: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults/Outcome|Outcome]]. Two pre-existing e2e failures on this machine (node-pty `posix_spawnp`, and the Linux-package-only visual spec) are unrelated to the diff.
