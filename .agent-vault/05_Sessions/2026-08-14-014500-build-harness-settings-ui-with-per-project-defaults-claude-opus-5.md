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
  current_focus:
    summary: Advance [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]].
    target: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]'
    section: Context Handoff
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
  last_action:
    type: saved
---

# Session — STEP-25-02 harness settings UI with per-project defaults

## Context

- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25]]
- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02]]
- Builds on: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01]] (`detectHarness`, `detectCommand`, the opencode definition this UI lists)

## Objective

Give the shipped `harnesses.json` mechanism a product surface, so a user can see detection state, override a binary path or env, and set a per-project default harness.

## Planned Scope

- A main service owning every write to `harnesses.json`.
- Three `harness:*` IPC channels with boundary hardening.
- A Settings section with per-harness cards and a per-project default selector.

## Execution Log

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

## Findings

### Review Corrections

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

## Context Handoff

STEP-25-03 renders capabilities over the same service. Carried forward: opencode advertises an auth method with no machine-actionable command, so the auth panel needs a real `docs-only` path.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/desktop/src/main/services/harnesses.ts` (new) — registry build, per-definition detection, base-canonicalized saves, abort-on-load-failure, `0600` serialized writes, secret rejection across env and argv.
- `packages/desktop/src/main/services/harnesses.test.ts` (new)
- `packages/contracts/src/ipc/contracts.ts` — `harness:list`, `harness:save-override`, `harness:reset-override`; `SChatTarget` widened to a string.
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/runtime/src/shared/atomic-json.ts` — optional `mode`, applied to the temp file.
- `packages/runtime/src/shared/atomic-json.test.ts` (new)
- `packages/desktop/src/main/chat/index.ts` — async `resolveChatTarget` with an `isConfigured` probe, `resolveForkTarget`, dangling defaults block.
- `packages/desktop/src/main/chat/ipc.test.ts`
- `packages/desktop/src/main/chat/session-controller.ts` — `resolveDefinition`, `resolveConnectDefinition`.
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/components/settings/HarnessSettings.tsx` (new)
- `packages/desktop/src/renderer/components/settings/HarnessSettings.test.tsx` (new)
- `packages/desktop/src/renderer/components/chat/ChatView.tsx` — sends `undefined` until the user picks a target.
- `packages/desktop/src/renderer/components/chat/ChatView.test.tsx`
- `packages/desktop/src/renderer/components/chat/ChatSessionContext.tsx`
- `packages/desktop/src/renderer/main.tsx` — harness section keyed by workspace root.
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/e2e/harnesses.spec.ts` (new; registered in all three `test:e2e*` lists)
- `packages/desktop/package.json`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- contracts 193, harness 139 (+3 skipped), runtime 458, desktop 1222 — all green at merge.
- `pnpm lint`, `pnpm build` — clean.
- `desktop-e2e-linux` on PR #33 — passed, which settled that the two local e2e failures (node-pty `posix_spawnp`, and a spec needing a packaged Linux build) were environmental rather than caused by this diff.
- **Not run:** no manual `pnpm dev` pass — it would write into the developer's real workspace. No fake-binary spawn test: `defaultChatConnect` completes a real ACP handshake, so a stub script cannot substitute for an agent; "takes effect on next spawn" is asserted at the service→connector seam instead.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

None filed. Seven review findings on PR #33 were all real and all fixed in place; see Review Corrections.

## Decisions Made or Updated

`SChatTarget` widened from a literal union to a string: valid targets are registry data, and only the registry can distinguish a configured harness from a dangling one. A dangling project default blocks session creation rather than substituting a harness the user did not choose. Per-harness permission-policy defaults stay deferred to Phase 26.

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- STEP-25-03 (next): capability matrix and auth surfacing. Carries forward that opencode's auth method has no machine-actionable command.
- Drive the in-chat harness picker from the registry rather than a short label list.
- Per-harness permission-policy defaults stay deferred to Phase 26.
- Manual GUI verification remains owed across phases 23-25.
<!-- AGENT-END:session-follow-up-work -->

## Follow-Ups

- The in-chat picker lists `mock`, `pi`, and the active project's default
  (whatever it is) — it does not yet list every configured harness. Driving it
  from the registry belongs with STEP-25-03.
- Per-harness permission-policy defaults stay deferred to Phase 26.
- Manual GUI verification remains owed across phases 23-25.

## Completion Summary

STEP-25-02 complete, merged as 0303c44 (PR #33). Suites, lint and build green; the Linux e2e job passed, settling that the two local e2e failures were environmental. Not verified: no manual `pnpm dev` pass, and no fake-binary spawn test — see Validation Run.
