---
note_type: decision
template_version: 2
contract_version: 1
title: Keep Jira API tokens in the OS keychain behind the main-process settings boundary
decision_id: DEC-0017
status: accepted
decided_on: '2026-04-21'
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
supersedes: []
superseded_by: []
related_notes:
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]'
  - '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]'
  - '[[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]'
tags:
  - agent-vault
  - decision
  - jira
  - security
---

# DEC-0017 - Keep Jira API tokens in the OS keychain behind the main-process settings boundary

## Status

- Accepted.

## Context

- Phase 21 introduces the first live Jira connector package using Jira API token authentication.
- The repo's security model already forbids secrets in renderer code and general workspace storage.
- The Settings screen must expose Jira configuration, but that does not imply the raw token belongs in `desktop-settings.json` or any markdown file.
- Future connector packages will likely need similar split handling between non-secret settings and secret credentials.

## Decision

- Jira API tokens will be stored only behind a credential adapter owned by the Electron main-process boundary.
- The preferred backend is the OS keychain.
- An encrypted local fallback is allowed only when keychain access is unavailable and the implementation still avoids plaintext secret storage.
- The Settings UI may collect non-secret Jira settings such as site URL, email/account label, project/JQL scope, and extraction toggles.
- The renderer may initiate save/connect/test actions through typed IPC but must never receive or persist the raw token after submission.
- Workspace markdown and `desktop-settings.json` may contain non-secret sync/config metadata only.
- Any package-side use of the token must be mediated by a host capability or privileged connector host API; the token should not be casually materialized in untrusted UI state.

## Alternatives Considered

- Store the API token in desktop settings for speed. Rejected because it violates the security model and makes secrets user-visible in local workspace files.
- Defer live authentication entirely to a later phase. Rejected because Phase 21 is explicitly the first live Jira package milestone.
- Put the token directly inside the connector package's own files. Rejected because package artifacts should stay non-secret and replaceable.

## Tradeoffs

- Pro: aligns Jira with the existing privileged-secret boundary direction.
- Pro: keeps workspace markdown safe to inspect, sync, and version without credential leakage.
- Pro: creates a reusable pattern for future API-token connectors.
- Pro: adapter approach gives the implementation room to use OS keychain where available without blocking all platforms on day one.
- Con: requires secret-storage plumbing alongside settings UI work.
- Con: package runtime integration must expose a careful host path for credentials instead of simple flat config.
- Con: fallback behavior must be documented and tested carefully so operators understand the effective storage mode on each platform.

## Consequences

- Phase 21 settings work must explicitly separate non-secret Jira config from secret token handling.
- Tests should prove that `desktop-settings.json` contains no Jira token material.
- Operators need a recoverable flow for reconnect/re-enter-token without manual JSON editing.
- Documentation must state when the OS keychain path is in use versus when the encrypted fallback path is active.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Architecture: [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
 - Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
 - Decision: [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
 - Shared knowledge: [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-21 - Accepted during Phase 21 planning. Jira settings remain user-configurable in the UI, while the API token is stored behind Electron main.
- 2026-04-21 - Refined during `/vault-refine phase-21`: OS keychain is preferred, with encrypted local fallback allowed when keychain access is unavailable.
<!-- AGENT-END:decision-change-log -->
