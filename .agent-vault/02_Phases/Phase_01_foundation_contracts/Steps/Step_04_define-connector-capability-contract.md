---
note_type: step
template_version: 2
contract_version: 1
title: Define Connector Capability Contract
step_id: STEP-01-04
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Define Connector Capability Contract

Define the connector manifest and capability contract, plus one sample connector package that proves the model is usable.

## Purpose

- Specify how connectors declare capabilities, auth shape, sync modes, produced entities, and provider metadata retention.
- Produce a sample connector manifest that the daily-briefing wedge could consume later.

## Why This Step Exists

- Connectors need stable capability and mapping contracts so skills depend on behavior, not vendor names.
- This step prevents the skill runtime from inheriting ad hoc provider-specific APIs and makes permission boundaries inspectable.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-004 and the connector sections.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- The example connector location frozen in Step 01, expected to contain a Jira-oriented sample connector.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]

## Execution Prompt

1. Define the connector manifest fields, capability taxonomy, and mapping responsibilities in the shared contract location chosen earlier in the phase.
2. Distinguish read capabilities from write or side-effect capabilities so later approval and trust UX can be explicit.
3. Keep connectors responsible for provider auth, sync strategy, and canonicalization; do not let skills absorb those responsibilities.
4. Create or update one sample connector manifest, preferably aligned with the daily-briefing wedge, that shows produced entities, sync modes, and auth shape without requiring live implementation.
5. Preserve a path for raw provider metadata retention and capability-based dependency resolution.
6. Validate by checking the sample connector can satisfy the planned skill capabilities without skills naming a vendor directly.
7. Update notes with the final capability naming rules, the sample connector path, and any unresolved auth or sync-policy question.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The framework doc already proposes capability strings such as `tasks.read`, `events.read`, and `mail.send`.
- The worked example should demonstrate capability-based portability, not direct coupling to `jira`, `outlook`, or `teams` inside skill contracts.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/connectors/` for:
1. `ConnectorManifest` — name, version, provider, authType, capabilities[], producedEntities[], syncModes[], configSchema
2. `ConnectorCapability` — capability string + read/write flag + entity types produced
3. `AuthType` — enum: `oauth2` | `api-key` | `token` | `none`
4. `SyncMode` — enum: `full` | `incremental` | `webhook`

Plus a worked example at `examples/connectors/jira/`:
- `connector.yaml` — manifest declaring Jira capabilities (tasks.read, tasks.write, projects.read)
- `fixtures/` — sample Jira API responses and their canonical entity mappings
- `README.md` — explains the mapping and how to validate

**Key decisions to apply**:
- DEC-0002: All schemas are Zod.
- DEC-0003: The v1 connectors are Jira, Outlook Calendar, and Microsoft Teams. The Jira sample connector is the worked example here. Teams connector details flow from the same contract.
- DEC-0007: Connectors write canonical entity data as markdown files with YAML frontmatter. The connector contract must specify the output file format.

**Constraints**:
- Capability strings are behavior-based and namespaced: `{entity-type}.{verb}` (e.g., `tasks.read`, `events.read`, `messages.read`).
- Read and write capabilities are always separate declarations.
- Connector manifests must declare which canonical entity types they produce.

**Validation**:
- The `jira/connector.yaml` parses through `ConnectorManifest.parse()`.
- The Jira connector's declared capabilities satisfy the daily-briefing skill's `requiredCapabilities`.
- Fixture data maps from Jira API response to canonical `Task` entity without errors.

**Junior-readiness verdict**: PASS. Connector schema fields explicit, capability taxonomy defined, sample connector named.

## Human Notes

- Integrity risk: if the connector contract hides provider metadata or side-effect boundaries, later skills and approval flows will become unsafe.
- Keep capability names behavior-based and namespaced, with explicit read/write separation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the repo has a connector contract plus a sample connector manifest that can satisfy planned skill capabilities without vendor lock-in.
- Validation target: the sample connector maps cleanly to canonical entities and exposes capabilities that a skill can declare and resolve.
