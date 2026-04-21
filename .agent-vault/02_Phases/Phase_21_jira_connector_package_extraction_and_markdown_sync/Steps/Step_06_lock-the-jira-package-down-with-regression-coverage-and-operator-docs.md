---
note_type: step
template_version: 2
contract_version: 1
title: Lock the Jira package down with regression coverage and operator docs
step_id: STEP-21-06
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-05
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Lock the Jira package down with regression coverage and operator docs

## Purpose

- Outcome: prove the extracted Jira package is safe, documented, and regression-resistant across package, settings, sync, and markdown behavior.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- Jira touches packaging, secrets, network sync, workspace writes, and UI state; without tight coverage this phase will drift or regress quickly.
- Operators need explicit setup and troubleshooting guidance for the first live external connector package.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]].

## Relevant Code Paths

- all touched Jira package tests
- desktop settings/connectors tests
- CLI/package-host tests
- package README or operator documentation paths
- `README.md` and `TESTING.md` if phase-level docs need cross-links

## Concrete Starting Points

- Package tests in `packages/connector-jira/`
- Desktop tests under `packages/desktop/src/main/` and `packages/desktop/src/renderer/components/`
- CLI/package-host tests under `packages/desktop/src/main/cli/` and `packages/desktop/src/main/connectors/`
- Operator docs in the Jira package README or a dedicated connector-ops document linked from root docs

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- all prior Step 21 notes
- `README.md`, `TESTING.md`, and any connector/operator docs touched by the implementation

## Execution Prompt

1. Add regression tests covering package extraction, settings persistence, token non-persistence, live-sync mapping, markdown output, and stale/archive behavior.
2. Run the narrowest useful tests first, then the broader suite needed to make the phase credible.
3. Update operator docs with setup steps, required Jira inputs, sync behavior, file locations, archive/stale semantics, and token rotation guidance.
4. Document the credential adapter behavior honestly: OS keychain preferred, encrypted fallback only where supported by the implementation.
5. Record any deliberately deferred work, for example Atlassian OAuth or dashboards, explicitly instead of letting it hide inside TODOs.
6. Do not mark the phase ready unless the docs and tests reflect the final connector shape.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-06 after STEP-21-05.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Minimum validation map

- extracted Jira package tests and typecheck
- desktop settings tests for Jira config and secret non-persistence
- package-host / integration tests for install-load-connect state
- markdown persistence tests including stale/archive cases
- renderer tests for any Jira-specific settings surface added in Step 02

### Broader validation expected before handoff

- `pnpm --filter @srgnt/connector-jira test`
- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/desktop test`
- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/contracts test`
- `pnpm test` before phase completion unless a still-open blocker makes full-suite execution impossible

### Documentation must answer

- how to install and connect Jira
- what non-secret fields are configurable
- how token entry and rotation work
- where Jira markdown lands
- what “archived/stale” means
- which Jira metadata groups are included by default
- what is explicitly deferred to later phases

### Edge cases and failure modes

- tests cover happy path but miss no-token and invalid-config flows
- docs describe a keychain-only story while code actually uses an adapter with fallback
- package integration works in unit tests but not through desktop install/connect flows
- stale/archive semantics are implemented but undocumented, causing operator confusion

### Security considerations

- Regression coverage must assert non-persistence of token material, not just absence in nominal UI.
- Documentation must avoid encouraging manual secret edits in JSON files.
- Error and inspect outputs must stay redacted.

### Performance considerations

- Include at least one regression check that sync scope and markdown generation stay bounded for moderate fixture sizes.
- Avoid requiring full e2e for every small iteration, but make sure final phase handoff includes enough breadth to be trustworthy.

### Acceptance criteria mapping

- This step closes the remaining phase criterion for automated validation and operator documentation.
- It also verifies the earlier criteria remain true under regression coverage.

### Junior-developer readiness checklist

- Exact outcome and success condition: pass.
- Why the step matters: pass.
- Prerequisites and dependencies: pass.
- Concrete starting files/packages/tests: pass.
- Required reading completeness: pass.
- Constraints and non-goals: pass.
- Validation commands and manual checks: pass.
- Edge cases and recovery expectations: pass.
- Security considerations: pass.
- Performance considerations: pass.
- Integration touchpoints and downstream effects: pass.
- Blockers or unresolved decisions: none blocking.
- Junior readiness verdict: **pass**.

## Human Notes

- Be explicit about what is still future work so dashboard planning later starts from an honest baseline.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the Jira package is covered, documented, and safe to hand to execution without rediscovering setup or lifecycle assumptions.
