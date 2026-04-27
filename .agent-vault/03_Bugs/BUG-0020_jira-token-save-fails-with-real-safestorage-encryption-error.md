---
note_type: bug
template_version: 2
contract_version: 1
title: Jira token save fails with real safeStorage encryption error
bug_id: BUG-0020
status: duplicate
severity: sev-2
category: integration
reported_on: '2026-04-26'
fixed_on: '2026-04-26'
owner: coordinator
created: '2026-04-26'
updated: '2026-04-26'
related_notes:
  - '[[03_Bugs/BUG-0020_safestorage-encryption-unavailable-causes-token-save-to-fail-on-linux-without-keytar|BUG-0020 safeStorage encryption unavailable causes token save to fail on Linux without keytar]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]'
tags:
  - agent-vault
  - bug
  - safeStorage
  - credentials
---

# BUG-0020 - Jira token save fails with real safeStorage encryption error

## Summary

- This note is a stale duplicate of the authoritative BUG-0020 note for Linux safeStorage encryption unavailability without keytar.
- The real user-visible symptom was an IPC failure surfacing `safeStorage.encryptString` encryption-unavailable behavior during Jira token save.

## Observed Behavior

- User attempts to save a Jira API token via Settings UI.
- IPC call `connector:credential:set` fails.
- The surfaced error shows the real safeStorage encryption-unavailable failure instead of a clean unavailable-backend product response.

## Expected Behavior

- The app should fail closed when no secure encrypted credential backend is available.
- Renderer UX should present a clear unavailable-storage state without exposing raw Electron encryption internals.

## Reproduction Steps

1. Run the desktop app on an environment where Electron `safeStorage` encryption is unavailable and keytar is also unavailable or not selected.
2. Open Jira settings and attempt to save a token.
3. Observe the real encryption-unavailable failure surfacing through the credential-save IPC path.

## Scope / Blast Radius

- Affects: `packages/desktop` Jira credential save flow.
- Impact: users cannot store Jira API tokens in affected environments.
- Data sensitivity: secrets are involved, but the failure prevented storage rather than leaking tokens.

## Suspected Root Cause

- Credential backend selection still allowed the flow to reach an unavailable encrypted-storage path.
- The UX and IPC behavior did not yet fully normalize this case into a clean unavailable-backend response.

## Confirmed Root Cause

- Confirmed duplicate of the authoritative BUG-0020 note: [[03_Bugs/BUG-0020_safestorage-encryption-unavailable-causes-token-save-to-fail-on-linux-without-keytar|BUG-0020 safeStorage encryption unavailable causes token save to fail on Linux without keytar]].
- The durable fix was implemented there, along with the regression coverage and closure record.

## Workaround

- Use an environment with a working secure credential backend.
- Otherwise rely on the authoritative unavailable-backend handling instead of expecting token save to succeed in this broken environment.

## Permanent Fix Plan

- No separate fix should land from this duplicate note.
- Keep this note only as a duplicate pointer back to the authoritative BUG-0020 record.

## Regression Coverage Needed

- Preserve the regression coverage added by the authoritative BUG-0020 fix:
  - unavailable-backend adapter behavior,
  - renderer disabled-state behavior when token storage is unavailable,
  - IPC credential-save rejection when no secure backend exists.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Authoritative bug: [[03_Bugs/BUG-0020_safestorage-encryption-unavailable-causes-token-save-to-fail-on-linux-without-keytar|BUG-0020 safeStorage encryption unavailable causes token save to fail on Linux without keytar]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Duplicate note created from the real user-visible error.
- 2026-04-26 - Root cause and durable fix were captured in the authoritative BUG-0020 note.
- 2026-04-26 - This note marked as duplicate and retained only as a pointer.
<!-- AGENT-END:bug-timeline -->
