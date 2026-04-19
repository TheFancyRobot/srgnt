---
note_type: session
template_version: 2
contract_version: 1
title: executor-1 session for Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults
session_id: SESSION-2026-04-16-231734
date: '2026-04-16'
status: in-progress
owner: executor-1
branch: ''
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
related_bugs: []
related_decisions: []
created: '2026-04-16'
updated: '2026-04-16'
tags:
  - agent-vault
  - session
---

# executor-1 session for Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 23:17 - Created session note.
- 23:17 - Linked related step [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]].
<!-- AGENT-END:session-execution-log -->

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- None yet.
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: not run yet
- Result: not run
- Notes: 
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- None.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Continue [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_06_add-coverage-for-discoverability-install-uninstall-state-transitions-and-onboarding-settings-defaults|STEP-19-06 Add coverage for discoverability, install/uninstall state transitions, and onboarding settings defaults]].
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
## Completed: STEP-19-06 Test Coverage

### Analysis
- All Phase 19 steps 01-05 were already marked complete in vault
- STEP-19-06 (test coverage) was the only remaining step
- Verified existing test coverage identified gaps in E2E tests using old connector model assumptions

### Pre-existing bugs fixed in E2E tests

**Bug 1: `app.spec.ts` connector test used wrong button after fresh onboarding**
- After `completeOnboarding()`, all connectors are uninstalled (Phase 19: `installedConnectorIds: []` by default)
- Old code clicked "Connect Jira" directly — incorrect with install-before-use model
- Fixed: test now follows full lifecycle: Install → Connect → Disconnect → Uninstall
- Added assertions for all four states: fresh (Install), installed (Connect+Uninstall), connected (Disconnect+Uninstall), post-disconnect (Connect+Uninstall), post-uninstall (Install again)

**Bug 2: `ui-coverage-matrix.spec.ts` tested old Settings connector toggles**
- Old test asserted "Jira Integration", "Outlook Integration", "Teams Integration" toggle rows existed in Settings
- Phase 19 removed connector toggles from Settings (managed via ConnectorStatusPanel)
- Fixed: replaced with test verifying Settings has exactly 3 sections (General, Privacy, Advanced) and no connector toggles

**Bug 3: `ui-coverage-matrix.spec.ts` tested wrong button after fresh onboarding**
- Old test asserted "Connect Jira" buttons after onboarding
- Phase 19 model: fresh workspace → all connectors NOT installed → "Install" buttons
- Fixed: updated to assert "Install" buttons visible and "Connect" buttons absent for fresh workspace

### Test Results
- `pnpm --filter @srgnt/contracts test`: 245/245 PASS
- `pnpm --filter @srgnt/desktop test`: 812/812 PASS
- `pnpm --filter @srgnt/desktop typecheck`: PASS
- `pnpm --filter @srgnt/desktop build`: PASS

### Known pre-existing flaky test
- `MarkdownEditor.test.tsx` "decorates GFM task list items" - intermittently fails (unrelated to Phase 19)

### Files Changed
- `packages/desktop/e2e/app.spec.ts`: Updated connector lifecycle test with Install-first flow
- `packages/desktop/e2e/ui-coverage-matrix.spec.ts`: Fixed two connector assertions to match Phase 19 model
