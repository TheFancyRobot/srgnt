---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Add opencode harness definition with runtime capability detection
session_id: SESSION-2026-08-13-224500
date: '2026-08-13'
status: completed
owner: claude-opus-5
branch: phase/25-step-01-opencode-harness
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
step: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]'
related_bugs: []
related_decisions:
  - '[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]]'
created: '2026-08-13'
updated: '2026-08-14'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-08-13-224500
  status: completed
  updated_at: '2026-08-14T00:30:00.000Z'
  current_focus:
    summary: Advance [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]].
    target: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]'
    section: Context Handoff
  context_summary: >-
    STEP-25-01 complete and merged as PR #32 (squash a87894e). opencode 1.18.18
    is a built-in HarnessDefinition launching `opencode acp` with zero quirks
    and zero capability overrides; `detectCommand` was added to
    SHarnessDefinition (non-empty) with a definition-driven `detectHarness`;
    `NegotiatedCapabilities` grew `authMethods` (full SDK metadata) and
    `sessionList`; `mergeSessionCapabilities` folds mid-session discoveries into
    the initialize baseline; and a display-only capability cache in
    @srgnt/runtime persists last-negotiated rows to workspace
    `harness-capabilities.json` (last-write-wins behind one write queue, keyed
    by a definition fingerprint). Desktop main writes through on every
    successful connect. Validated with all four unit suites, `pnpm lint`,
    `pnpm build`, and both gated integration tests against the real binaries
    (SRGNT_IT_OPENCODE=1 and SRGNT_IT_PI=1). NOT VALIDATED - no manual GUI
    walkthrough; opencode's permission round-trip, session/load, session/resume,
    MCP passthrough and unauthenticated failure shape were deliberately not
    probed (each needs a tool-invoking, token-spending run) and are recorded as
    unmeasured in the capture note rather than left to look like absences.
  last_action:
    type: saved
---

# Session — STEP-25-01 opencode harness definition with runtime capability detection

Retroactive note: the work was executed and merged before this record was
written. Written 2026-08-14 after review of PR #33 caught that PHASE-25's steps
had stopped producing session notes, which every step through PHASE-24 had.

## Context

- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25]]
- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01]]
- Output note: [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP capture]]

## Objective

Make opencode a built-in harness whose capabilities come from runtime observation rather than per-harness hardcoding, establishing the detection rule for every harness that follows.

## Planned Scope

- opencode HarnessDefinition + `detectCommand` + definition-driven detection.
- `authMethods` and `sessionList` on `NegotiatedCapabilities`; mid-session merge rule.
- Display-only capability cache persisted at the workspace root.
- Gated integration test against the real binary, plus captured fixtures and a capture note.

## Execution Log

- Refined PHASE-25 first (commit 328583f): the install precondition was a month
  stale (opencode had since been installed), and the capability cache's
  generation/reservation spec was cut to last-write-wins as unjustified for a
  display-only file.
- A first execution attempt was interrupted mid-flight and its partial output
  stashed, then dropped once this run superseded it.
- Implementation landed in contracts, harness, runtime and desktop; see the
  step's Implementation Notes and Outcome.

## Findings

- opencode exposes modes **and** model as ACP `configOptions`, not a `modes`
  block, so `readModes` sees nothing and `session/set_mode` does not apply. The
  sharpest code-not-data gap measured so far and a direct STEP-25-04 input.
- It advertises `session/close` and `session/fork`, which srgnt does not model,
  plus `mcpHttp`/`mcpSse` (pi has neither).
- Its sole auth method carries no `type`/`args`: the login command exists only
  as prose, so STEP-25-03's AuthPanel cannot assume pi's machine-actionable
  shape and needs an honest `docs-only` path.
- `available_commands_update` delivers 93 slash commands on the first turn —
  direct evidence that the baseline-plus-observation merge rule is required.

## Review Corrections

Three review rounds on PR #32 each found something real, two of them in fixes
written during the review itself:

1. Mid-session observations were merged into the already-overridden capability
   view, ORing an observed `true` over a deliberate `false` clamp.
2. The fix for (1) merged each call against the immutable initialize baseline,
   so modes and slash commands — which arrive in separate notifications —
   overwrote each other.
3. The fix for (2) accumulated with a spread, letting a later `false`
   un-observe a demonstrated capability, against the one-way contract.

Also: a fresh capability-cache instance per report defeated the write queue and
could drop sibling harness entries; and the committed fixtures held the capture
machine's configured model, model list and local agent descriptions, which are
now positional placeholders with the true counts kept.

## Context Handoff

STEP-25-02 builds the settings UI over `detectHarness` and the definitions listed here. Two measured facts constrain it: opencode is nvm-global, so a GUI-launched Electron build sees neither binary without a login shell (that is what the binary-path override is for), and the schema rejects an empty `detectCommand`, so clearing that field in an editor must round-trip as absent.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/contracts/src/harness.ts` — optional non-empty `detectCommand`; `SHarnessCapabilityEntry`; `SHarnessCapabilitiesFile`.
- `packages/contracts/src/harness.test.ts`
- `packages/contracts/src/workspace/layout.ts` — `workspaceFiles.harnessCapabilities`.
- `packages/harness/src/registry/builtins.ts` — `opencodeDefinition`, `OPENCODE_HARNESS_ID`, `OPENCODE_TESTED_VERSION = '1.18.18'`, `piDefinition.detectCommand = 'pi'`.
- `packages/harness/src/registry/detect.ts` — `detectHarness`, `detectOpencode`.
- `packages/harness/src/registry/detect.test.ts`
- `packages/harness/src/registry/registry.test.ts`
- `packages/harness/src/registry/opencode.integration.test.ts` (new; gated behind `SRGNT_IT_OPENCODE=1`)
- `packages/harness/src/acp/capabilities.ts` — `authMethods`, `sessionList`, `mergeSessionCapabilities`.
- `packages/harness/src/acp/capabilities.test.ts`
- `packages/harness/src/acp/connection.ts` — `negotiated`, `withObserved()` accumulating one-way observations.
- `packages/harness/src/acp/connection.test.ts`
- `packages/harness/src/testing/fixtures/opencode/initialize.json` (new; catalog values are positional placeholders)
- `packages/harness/src/testing/fixtures/opencode/simple-prompt.jsonl` (new)
- `packages/harness/src/testing/fixtures/opencode/README.md` (new)
- `packages/runtime/src/harnesses/capability-cache.ts` (new) — last-write-wins behind one write queue; `harnessDefinitionFingerprint`.
- `packages/runtime/src/harnesses/capability-cache.test.ts` (new)
- `packages/runtime/src/harnesses/index.ts` (new)
- `packages/runtime/src/index.ts`
- `packages/desktop/src/main/chat/index.ts` — one capability cache per workspace root.
- `packages/desktop/src/main/chat/session-controller.ts` — `onCapabilities` write-through on connect.
- `packages/desktop/src/main/chat/session-controller.test.ts`
- `.agent-vault/06_Shared_Knowledge/opencode-acp-capture.md` (new)
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- contracts 187, harness 138 (+3 skipped), runtime 455, desktop 1174 — all green at merge.
- `SRGNT_IT_OPENCODE=1` — real initialize + prompt turn to `end_turn`, `permissionRequests=0`.
- `SRGNT_IT_PI=1` — green; pi surfaces `sessionList: true` and the full `pi_terminal_login` method.
- `pnpm lint`, `pnpm build` — clean.
- **Not run:** opencode's `session/request_permission` round-trip, live `session/load`/`session/resume`, MCP passthrough, and the unauthenticated failure shape. Each needs a tool-invoking, token-spending probe; recorded as unmeasured in the capture note so silence is not read as absence. No manual GUI pass.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

None filed. Three defects were found and fixed during review of PR #32 rather than deferred; see Review Corrections.

## Decisions Made or Updated

The capability cache is last-write-wins behind a single write queue, not a generation-ordered store. It is display-only data no live session reads, so ordering machinery was cut before implementation; the upgrade path is recorded in the source and the step brief.

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- STEP-25-02 (next at the time): the settings UI listing these definitions.
- The `session-lifecycle` transcript-checkpoint test flakes under full-suite parallel load (passes 3/3 in isolation). Pre-existing; worth a bug note if it recurs.
- Manual GUI verification remains owed across phases 23-25.
<!-- AGENT-END:session-follow-up-work -->

## Follow-Ups

- The `session-lifecycle` transcript-checkpoint test flakes under full-suite
  parallel load (passes 3/3 in isolation). Pre-existing; worth a bug note if it
  recurs.
- Manual GUI verification remains owed across phases 23-25.

## Completion Summary

STEP-25-01 complete, merged as a87894e (PR #32). All four unit suites, lint, build, and both gated integration tests green against the real binaries. Not verified: any manual GUI pass, and the four opencode behaviours listed under Validation Run as deliberately unmeasured.
