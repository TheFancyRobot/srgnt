---
note_type: bug
template_version: 2
contract_version: 1
title: Today View launch flow fails in live desktop app
bug_id: BUG-0002
status: fixed
severity: sev-3
category: logic
reported_on: '2026-03-28'
fixed_on: '2026-03-28'
owner: opencode
created: '2026-03-28'
updated: '2026-03-28'
related_notes:
  - '[[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]]'
  - '[[05_Sessions/2026-03-28-200819-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-200819 opencode session for Wire Workflow Launch Actions And Artifact Context]]'
tags:
  - agent-vault
  - bug
---

# BUG-0002 - Today View launch flow fails in live desktop app

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Historical regression: the Today View launch flow failed in the live desktop app until the preload bridge fix landed on 2026-03-28.
- Related notes: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]], [[05_Sessions/2026-03-28-200819-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-200819 opencode session for Wire Workflow Launch Actions And Artifact Context]], [[05_Sessions/2026-03-28-202447-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-202447 opencode session for Wire Workflow Launch Actions And Artifact Context]].

## Observed Behavior

- Historical behavior before the fix:
- After skipping onboarding in the live Electron app, Today and Calendar navigation render normally.
- Pointer clicks on Today View `Launch` buttons are blocked in the live window even though the buttons are visible in the accessibility snapshot.
- Keyboard focus can reach a `Launch` button, but activating it does not navigate into the Terminal view.
- Navigating directly to the Terminal route renders the panel, but it remains `Disconnected` and never establishes a session.

## Expected Behavior

- Clicking or keyboard-activating a Today View `Launch` button should navigate into Terminal and open a connected PTY session with the selected launch context visible.
- Visiting Terminal directly should open a connected default-shell session.
- Current status: this expected behavior is restored in the workspace.

## Reproduction Steps

1. Build `@srgnt/contracts`, `@srgnt/runtime`, and `@srgnt/desktop`, then start the Vite renderer and launch the Electron desktop app with GPU disabled in this Linux environment.
2. Skip onboarding to reach Today View.
3. Attempt to activate a Today View `Launch` button in the live window.
4. Observe that the button is not pointer-clickable and keyboard activation does not transition into a working Terminal session.
5. Navigate directly to `Terminal` and observe that the panel stays `Disconnected`.

## Scope / Blast Radius

- Affects `packages/desktop` live Electron behavior, specifically Today View launch actions and the Terminal panel.
- Blocks manual validation of the implemented Phase 07 desktop launch path.
- Does not affect the Node-level PTY smoke test, so the issue is likely in live Electron wiring rather than raw `node-pty` capability.

## Suspected Root Cause

- Assumption: a live Electron-only wiring issue still exists between renderer, preload, IPC, or the embedded terminal surface.
- Assumption: the pointer-blocked `Launch` buttons and disconnected Terminal route may share the same underlying cause if the live renderer cannot successfully complete the launch/spawn path.

## Confirmed Root Cause

- `packages/desktop/src/preload/index.ts` imported `ipcChannels` from `@srgnt/contracts` at runtime.
- The desktop window runs with `sandbox: true`, so the preload script must remain self-contained; that runtime workspace-package import prevented the preload bridge from exposing `window.srgnt` in the live Electron renderer.
- Without `window.srgnt`, Today View launch handlers threw before routing to Terminal, and `TerminalPanel` could not call `terminalSpawn` or `terminalLaunchWithContext`, leaving the panel disconnected.
- Fix: inline the IPC channel constants inside the preload script so the built preload only requires `electron`, then rebuild and re-run the live smoke path.

## Workaround

- Fixed in the current workspace.
- Before the fix, developers could only validate the raw PTY service with a direct Node-level smoke script, which did not prove the desktop launch flow.

## Permanent Fix Plan

- Keep the preload runtime self-contained while the desktop window stays sandboxed.
- Preserve live Electron smoke validation for Today View -> Terminal as part of Phase 07 verification.

## Regression Coverage Needed

- Add at least one live-ish desktop smoke test that proves Terminal connects in Electron, not just in Node-level PTY unit coverage.
- Add coverage or instrumentation that would catch a Today View launch action failing to transition into a connected Terminal surface.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- Step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]]
- Session: [[05_Sessions/2026-03-28-200819-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-200819 opencode session for Wire Workflow Launch Actions And Artifact Context]]
- Session: [[05_Sessions/2026-03-28-202447-wire-workflow-launch-actions-and-artifact-context-opencode|SESSION-2026-03-28-202447 opencode session for Wire Workflow Launch Actions And Artifact Context]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-03-28 - Reported.
- 2026-03-28 - Reproduced during a live Electron smoke pass after the desktop startup/package-entry issue was fixed.
- 2026-03-28 - Fixed by making the sandboxed preload script self-contained and re-validating the live Today View -> Terminal flow.
<!-- AGENT-END:bug-timeline -->
