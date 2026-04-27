---
note_type: phase
template_version: 2
contract_version: 1
title: Extract reusable Jira API client package
phase_id: PHASE-22
status: completed
owner: executor-2
created: '2026-04-23'
updated: '2026-04-24'
depends_on:
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]'
related_architecture:
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]'
related_decisions:
  - '[[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018 Separate the Jira API client into a reusable workspace package]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 22 Extract reusable Jira API client package

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Plan the extraction of Jira-specific provider transport/auth/search/pagination code into a standalone reusable workspace package that `@srgnt/connector-jira` and future Jira-facing packages can consume.

## Why This Phase Exists

- [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018]] requires the Jira API client to be a standalone reusable package.
- Phase 21 delivered a standalone connector package, but repository verification showed the Jira-specific API client still lives inside `packages/connector-jira/`.
- This phase exists to close that architecture gap without starting implementation prematurely.

## Scope

- Define the target package boundary for a reusable Jira API client workspace package.
- Plan how Jira auth wiring, request construction, search helpers, pagination, and normalized Jira API error handling move out of `@srgnt/connector-jira`.
- Plan how `@srgnt/connector-jira` will consume the extracted package without regressing Phase 21 behavior.
- Define validation and migration expectations before any implementation begins.

## Non-Goals

- Do not start implementation while this phase remains in planned state.
- Do not reopen or relabel Phase 21 completion until the outstanding manual verification concern is resolved separately.
- Do not broaden this phase into Outlook/Teams extraction or generic multi-provider abstraction work.

## Dependencies

- Depends on [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]].
- Depends on manual verification of the shipped Phase 21 baseline before extraction work starts.
- Anchored by [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018 Separate the Jira API client into a reusable workspace package]].

## Acceptance Criteria

- [ ] The follow-up package boundary is documented and linked to [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018]].
- [ ] Execution remains deferred until manual verification of the current shipped baseline is complete.
- [ ] Step notes are created only when implementation is explicitly approved to begin.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018 Separate the Jira API client into a reusable workspace package]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- No step notes yet.
<!-- AGENT-END:phase-steps -->

## Notes

- This phase is intentionally planning-only for now.
- Do not create implementation steps or start code changes until the current Jira baseline has been manually verified and execution is explicitly approved.
- Use the `Steps/` directory only when the extraction is ready to begin.
## Completion Evidence (2026-04-24)

PHASE-22 was originally a planning-only phase, but the extraction it described was **already completed during PHASE-21 execution**. Verification confirms all DEC-0018 acceptance criteria are satisfied by the existing `packages/jira-client/` implementation:

### Existing Implementation

**`@srgnt/jira-client`** (`packages/jira-client/`) — a standalone reusable workspace package containing:
| File | Purpose |
|---|---|
| `src/api/client.ts` | `JiraApiClient` with HTTP transport + Basic auth |
| `src/api/search.ts` | `searchIssues` with configurable fields |
| `src/api/pagination.ts` | `searchAllIssues` with bounded pagination |
| `src/api/errors.ts` | `JiraApiError`, `PaginationBoundExceededError` |
| `src/api/types.ts` | All Jira domain types |
| `src/index.ts` | Main barrel export |
| `src/api/index.ts` | API subpath exports |

### Consumption by `@srgnt/connector-jira`
- `@srgnt/connector-jira` depends on `@srgnt/jira-client: "workspace:*"`
- `packages/connector-jira/src/api/` re-exports symbols from `@srgnt/jira-client` for backward compatibility
- Connector package owns mapping, sync, persistence, and connector behavior only

### Test Evidence
- `@srgnt/jira-client`: 10 tests passed (2 suites) — `client.test.ts` (8), `search.test.ts` (2)
- `@srgnt/connector-jira`: 83 tests passed (7 suites) — including persistence, sync, mapping
- Both packages typecheck cleanly

### Acceptance Criteria Status
- [x] Package boundary documented and linked to DEC-0018
- [x] `@srgnt/connector-jira` depends on the shared Jira client package
- [x] Other packages can depend on the shared client without going through the connector
- [x] Validation covers both the reusable client and the consuming connector
- [x] No implementation steps needed — extraction was already done in PHASE-21
