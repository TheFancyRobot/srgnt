---
note_type: bug
template_version: 2
contract_version: 1
title: Jira connector does not appear in the connector list
bug_id: BUG-0018
status: fixed
severity: sev-3
category: logic
reported_on: '2026-04-24'
fixed_on: '2026-04-24'
owner: executor-1
created: '2026-04-24'
updated: '2026-04-24'
related_notes:
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]]'
  - '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]'
  - '[[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]'
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]'
  - '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]'
tags:
  - agent-vault
  - bug
---

# BUG-0018 - Jira connector does not appear in the connector list

Use one note per bug in `03_Bugs/`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification.

## Summary

- Jira connector does not appear in the connector list.
- Related notes: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]].

## Observed Behavior

- Jira connector is not visible in the desktop app's connector list/catalog

## Expected Behavior

- Jira connector should appear in the connector list after being wired into the desktop install/connect flow

## Reproduction Steps

1. Start the desktop app with the extracted Jira connector package wired into the install/connect flow.
2. Open the connector list/catalog UI.
3. Observe that Jira is missing when catalog discovery falls back incorrectly.

## Scope / Blast Radius

- Affects: desktop connector discovery and listing.
- Impact: operators cannot install or connect Jira from the UI even though the package exists.
- Release sensitivity: medium because it breaks the visible integration surface.

## Suspected Root Cause

- Catalog discovery may be falling back to built-in manifests after Jira extraction.
- Local/packaged catalog resolution may not be preserving the extracted Jira package path.

## Confirmed Root Cause

- Catalog fallback to built-ins after Jira extraction.
- Local/packaged catalog discovery was not properly hardened.
- Fix: hardened local/packaged catalog discovery and fallback behavior.

## Workaround

- Use a build/environment where the local disk catalog is present and resolves the extracted Jira package correctly.
- Avoid relying on the broken built-in fallback path until the hardened catalog discovery lands.

## Permanent Fix Plan

- Prefer package-local/packaged catalog discovery before falling back to built-ins.
- Ensure disk fallback preserves Jira package metadata and file URL resolution.
- Keep regression tests that prove local catalog preference and safe fallback behavior.

## Regression Coverage Needed

- Local disk catalog present → remote fetch is skipped
- Disk catalog absent → remote fetch is used
- Disk catalog `packagePath` resolves to a file URL under the catalog source path and never to `127.0.0.1`
- Full desktop suite passed after these changes: 60 files, 982 tests

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]]
<!-- AGENT-END:bug-related-notes -->
<!-- AGENT-START:bug-related-notes-context -->
- Architecture: [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- Architecture: [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- Upstream phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- Decision: [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
<!-- AGENT-END:bug-related-notes-context -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-24 - Reported.
- 2026-04-24 - Fixed by executor-1. Root cause was catalog fallback to built-ins after Jira extraction; local/packaged catalog discovery and fallback were hardened.
<!-- AGENT-END:bug-timeline -->
