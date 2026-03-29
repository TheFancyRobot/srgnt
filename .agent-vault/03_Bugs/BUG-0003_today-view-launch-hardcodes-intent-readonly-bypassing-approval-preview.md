---
note_type: bug
template_version: 2
contract_version: 1
title: 'Today View launch hardcodes intent: readOnly bypassing approval preview'
bug_id: BUG-0003
status: new
severity: sev-3
category: logic
reported_on: '2026-03-29'
fixed_on: '2026-03-29'
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
related_notes:
  - '[[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622 Session for Harden Previews Approvals And Run Logs]]'
tags:
  - agent-vault
  - bug
---

# BUG-0003 - Today View launch hardcodes intent: readOnly bypassing approval preview

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Today View launch hardcodes intent: readOnly bypassing approval preview.
- **Status:** FIXED - TodayView.tsx:171 changed from `intent: 'readOnly'` to `intent: 'artifactAffecting'`
- Related notes: [[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622 Session for Harden Previews Approvals And Run Logs]].

## Observed Behavior

- Today View "Launch" button immediately switches to terminal view with no approval preview
- Terminal opens directly without asking for user confirmation
- No approval modal appears regardless of intent-type

## Expected Behavior

- Launch with `intent: 'artifactAffecting'` should trigger approval preview showing:
  - Command to execute
  - Target directory
  - Workflow context (Jira task, Calendar event, etc.)
  - Approve/Deny buttons
- Only after approval should terminal open with command pre-filled
- Launch with `intent: 'readOnly'` may bypass approval gate

## Reproduction Steps

1. Open desktop app
2. Navigate to Today View (click "Today" in sidebar)
3. Click "Launch" on any Jira task or Calendar event row
4. Terminal switches to active view
5. Observe: no approval preview appears

## Scope / Blast Radius

- **Affected code:** `packages/desktop/src/renderer/components/TodayView.tsx:171`
- **Impact:** Approval gate completely bypassed for all Today View launches
- **Release impact:** High - this is the intended trust boundary for artifact-affecting operations
- **User impact:** Users cannot see or approve commands before they execute

## Suspected Root Cause

- TodayView.tsx hardcodes `intent: 'readOnly'` at line 171 regardless of actual command type
- No differentiation between read-only and artifact-affecting launches
- Approval logic exists in main/index.ts but never triggers because intent is always 'readOnly'

## Confirmed Root Cause

- Evidence: `TodayView.tsx:171` (before fix) showed `intent: 'readOnly'` hardcoded
- Code path: `TodayView.handleLaunch() → handleLaunchContext() → terminalLaunchWithContext IPC`
- Approval check in `main/index.ts:366-367` only triggers when `intent === 'artifactAffecting'`
- Since intent was always 'readOnly', `requiresApproval` was always false

## Regression Coverage Needed

- Unit test: TodayView launch with 'artifactAffecting' intent triggers approval preview
- E2E test: Full approval flow from Today View → approval modal → approve → terminal opens
- Snapshot test: Approval modal appears with correct command, directory, and workflow context
- Integration test: Verify `terminalLaunchWithContext` IPC sends `launchApprovalRequired` event for artifact-affecting launches


-单元 test: TodayView launch with 'artifactAffecting' intent triggers approval preview
- E2E test: Full approval flow from Today View → approval modal → approve → terminal opens
-Snapshot test: Approval modal appears with correct command, directory, and workflow context

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- Session: [[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622 Session for Harden Previews Approvals And Run Logs]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-03-29 - User reports "Launch" button bypasses approval preview
- 2026-03-29 - Investigation found TodayView.tsx:171 hardcodes `intent: 'readOnly'`
- 2026-03-29 - BUG-0003 created, approval flow works but intent hardcode prevents it from triggering
- 2026-03-29 - FIX: Changed TodayView.tsx:171 from `intent: 'readOnly'` to `intent: 'artifactAffecting'`
- 2026-03-29 - Desktop app rebuilt successfully
<!-- AGENT-END:bug-timeline -->
