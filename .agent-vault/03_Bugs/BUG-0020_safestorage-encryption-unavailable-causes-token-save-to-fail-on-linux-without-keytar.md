---
note_type: bug
template_version: 2
contract_version: 1
title: safeStorage encryption unavailable causes token save to fail on Linux without keytar
bug_id: BUG-0020
status: fixed
severity: sev-3
category: logic
reported_on: '2026-04-26'
fixed_on: '2026-04-26'
owner: executor-1
created: '2026-04-26'
updated: '2026-04-26'
related_notes:
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]'
tags:
  - agent-vault
  - bug
---

# BUG-0020 - safeStorage encryption unavailable causes token save to fail on Linux without keytar

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- safeStorage encryption unavailable causes token save to fail on Linux without keytar.
- Related notes: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]].

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
## Confirmed Root Cause

**File**: `packages/desktop/src/main/credentials.ts` lines 255-268

When `preferredBackend === 'encrypted-local'`:
1. Code checks `safeStorage.isEncryptionAvailable()` at line 255
2. If false, it still creates the safeStorage adapter but sets `status = 'unavailable'`
3. When `setSecret()` is called → `encryptString()` throws

**Root cause**: The code allows `encrypted-local` preference to be selected even when `safeStorage.isEncryptionAvailable() === false`. There's no guard preventing the selection OR catching the resulting error gracefully.

**Error path**:
```
createCredentialAdapter('encrypted-local')
  → creates safeStorage adapter (status='unavailable')
  → adapter.setSecret()
    → encryptSecret()
      → safeStorage.encryptString() throws
        → "[credentials] Failed to store token: Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available."
```

## Permanent Fix Plan

**Fix Option A** (defensive - preferred):
- In `credentials.ts`: When `preferredBackend === 'encrypted-local'` AND `safeStorage.isEncryptionAvailable() === false`:
  - DO NOT create adapter that will fail
  - Return adapter with status='unavailable' that throws clear error on setSecret
  - OR: Fall back to showing user a clear message BEFORE they try to save

**Fix Option B** (UI guard):
- In `JiraConnectorSettings.tsx`: When `encryptedLocalAvailable === false`:
  - Hide the "Encrypted in-app storage" option entirely
  - OR disable it with clear message "Not available on this system"

**Recommended**: Fix Option A - the backend should be robust and throw clear errors, not rely solely on UI guards.

## Regression Coverage Needed

- Unit test: `encrypted-local` preference + safeStorage unavailable → clear error (not Electron raw error)
- Unit test: verify `hasSecret()` returns false after failed `setSecret()` when safeStorage unavailable
- UI test: when `encryptedLocalAvailable === false`, option is disabled

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Reported.
<!-- AGENT-END:bug-timeline -->
<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Reported.
- 2026-04-26 - Root cause confirmed by researcher. Fix routed to executor-1.
<!-- AGENT-END:bug-timeline -->
- 2026-04-26 - Reviewer rejection: missing IPC regression test for `connectorCredentialSet` handler. Gap routed to executor-1.
- 2026-04-26 - IPC regression tests added by executor-1 (5 new tests in `credentials.test.ts`, 1042 total desktop tests passing). Routed back to reviewer for re-review.
- 2026-04-26 - First full validation by tester: FAILED — IPC test file `connector-credential-ipc.test.ts` has incomplete electron mock (missing `commandLine.appendSwitch`). Fix routed to executor-1. Pre-existing renderer typecheck errors (unrelated to BUG-0020).
- 2026-04-26 - Final validation: **PASS ✅** — 1048 tests passing, lint clean, BUG-0020 paths fully covered. Bug marked `fixed`.
