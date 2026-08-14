---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Build harness settings UI with per-project defaults
session_id: SESSION-2026-08-14-014500
date: '2026-08-14'
status: completed
owner: claude-opus-5
branch: phase/25-step-02-harness-settings-ui
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
step: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]'
related_bugs: []
related_decisions: []
created: '2026-08-14'
updated: '2026-08-14'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-08-14-014500
  status: completed
  updated_at: '2026-08-14T02:00:00.000Z'
  context_summary: >-
    STEP-25-02 implemented on branch phase/25-step-02-harness-settings-ui and
    open as PR #33. Adds Settings -> Harnesses (per-harness card with detection
    chip, launch command / detectCommand / env editors, overridden badge and
    Reset), a per-project default harness selector writing through the STEP-24-02
    `project:set-defaults` IPC, and a new desktop main service
    (services/harnesses.ts) owning every write to workspace `harnesses.json`.
    Boundary rules built and tested at the service, never through the renderer -
    payloads canonicalized against a base record with only launch.* and
    detectCommand allowlisted; save and reset abort when the file fails to load;
    `${env:NAME}` references resolved at spawn with literal secrets rejected;
    0600 writes including the temp file; writes serialized per workspace.
    SChatTarget was widened from a literal union to a string so the registry,
    not the schema, decides target validity, and a dangling project default now
    blocks session creation instead of degrading to the mock. Validated with
    contracts 193, harness 139 (+3 skipped), runtime 458, desktop 1215, plus
    lint and build. NOT VALIDATED - no manual `pnpm dev` pass (it would write
    into the developer's real workspace) and no fake-binary spawn test, since
    the connector completes a real ACP handshake; "takes effect on next spawn"
    is asserted at the service-to-connector seam instead.
---

# Session — STEP-25-02 harness settings UI with per-project defaults

## Context

- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25]]
- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02]]
- Builds on: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01]] (`detectHarness`, `detectCommand`, the opencode definition this UI lists)

## What Happened

Executed in a fresh subagent with the orchestrator holding git. Implementation
detail lives in the step's Implementation Notes and Outcome; this note records
the decisions and the review corrections.

Two changes went beyond the brief, both kept deliberately:

- **`SChatTarget` widened** from `Literal('mock','pi')` to `Schema.String`. A
  literal union cannot know whether `opencode` is configured; the registry can.
  Validation moved up rather than away — an unknown or dangling id throws before
  any controller is constructed or process spawned.
- **A dangling project default blocks** session creation with an actionable
  error instead of substituting a harness the user did not choose.

## Review Corrections

CodeRabbit raised seven live findings on PR #33; all were real:

- **ChatView defeated this step's own feature.** Its target calculation
  collapsed any default that was not `pi`/`mock` to `mock` and then passed it
  explicitly, so main never resolved the project default — a project set to
  opencode silently started the Mock agent. The Start button now sends
  `undefined` until the user picks.
- **Settings did not reload on workspace switch**, so a card still holding the
  previous workspace's definition could write its command and env into the new
  workspace. The section is now keyed by the workspace root, which also discards
  half-edited cards.
- **Duplicate ids canonicalized from the wrong base.** The registry is
  last-write-wins, but save selected the first matching entry and then rewrote
  every duplicate from it, reverting protected fields a command edit never
  mentioned. Now bases on the last entry and replaces only that occurrence.
- Two `0600` assertions would fail on the `windows-latest` lane in
  `desktop-release.yml`, where `stat().mode` is not POSIX permission bits.
- Save/Reset used non-null assertions on optional preload bridges.
- This step (and STEP-25-01) were marked done with no session note, which every
  step through PHASE-24 had. This note and STEP-25-01's retroactive one close
  that gap.

## Follow-Ups

- The in-chat picker still lists only `mock`/`pi`; opencode is reached via the
  per-project default. Extending it belongs with STEP-25-03.
- Per-harness permission-policy defaults stay deferred to Phase 26.
- Manual GUI verification remains owed across phases 23-25.
