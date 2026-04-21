---
note_type: step
template_version: 2
contract_version: 1
title: Extract Jira from @srgnt/connectors into its own workspace package
step_id: STEP-21-01
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Extract Jira from @srgnt/connectors into its own workspace package

## Purpose

- Outcome: move Jira out of `packages/connectors/src/jira/` into a dedicated workspace package, recommended as `packages/connector-jira/`, that exports a Phase 20-compatible connector package shape.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- The current Jira implementation still proves the old built-in path instead of the new package runtime.
- This step creates the package boundary that every later Jira step depends on and removes the risk of maintaining Jira in two places.

## Prerequisites

- Read [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]].
- Read [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]] and [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]].
- Review the shipped Phase 20 factory/runtime path before moving files.

## Relevant Code Paths

- `packages/connectors/src/jira/`
- `packages/connectors/src/index.ts`
- `packages/connectors/src/sdk/`
- `packages/connectors/src/sdk/registry.test.ts`
- `examples/connectors/jira/`
- `package.json`, `pnpm-workspace.yaml`, workspace `package.json` manifests, and tsconfig references

## Concrete Starting Points

- Create a new workspace package:
  - `packages/connector-jira/package.json`
  - `packages/connector-jira/tsconfig.json`
  - `packages/connector-jira/src/index.ts`
- Move or split current Jira baseline code from:
  - `packages/connectors/src/jira/index.ts`
  - `packages/connectors/src/jira/connector.ts`
  - `packages/connectors/src/jira/*.test.ts`
- Remove built-in exports and registration from:
  - `packages/connectors/src/index.ts`
  - any built-in registry tests that currently assert Jira is bundled by `@srgnt/connectors`
- Repoint example usage from:
  - `examples/connectors/jira/src/index.ts`
  - `examples/connectors/jira/src/index.test.ts`

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/connectors/src/jira/index.ts`
- `packages/connectors/src/jira/connector.ts`
- `packages/connectors/src/sdk/factory.ts`
- `packages/connectors/src/sdk/registry.ts`

## Execution Prompt

1. Create a dedicated Jira workspace package that exports `{ manifest, runtime, factory }` for the shared package runtime.
2. Use package name `@srgnt/connector-jira` unless codebase constraints force a different workspace name; if they do, document the reason in this step note.
3. Move the existing Jira fixture, mapping, tests, and manifest logic into that package as the extraction baseline.
4. Remove Jira registration and re-exports from `@srgnt/connectors` so Jira is no longer a built-in connector there.
5. Keep the connector ID stable as `jira`; do not invent a new install-facing identifier.
6. Update examples/tests/import paths so the extracted package becomes the new single source of truth.
7. Leave Outlook and Teams untouched in `@srgnt/connectors`; this step is about isolating Jira only.
8. Document any migration consequences for Step 05 (desktop integration) rather than silently patching around them.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Concrete file and package expectations

- `pnpm-workspace.yaml` already includes `packages/*`, so a new `packages/connector-jira/` package should be picked up automatically.
- The new package should mirror the minimal structure already expected by the Phase 20 package runtime:
  - manifest export
  - runtime metadata export
  - factory export
- The extracted package should initially preserve the current fixture-backed behavior so Step 03 can add live API behavior without mixing concerns.
- The old built-in Jira path should either be deleted or reduced to zero Jira exports; do not leave a shadow registration path behind.

### Validation commands

- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/connector-jira test`
- `pnpm --filter @srgnt/connectors typecheck`
- `pnpm --filter @srgnt/connectors test`
- `pnpm --filter @srgnt/example-connectors-jira test`
- If desktop imports break after removal: `pnpm --filter @srgnt/desktop typecheck`

### Edge cases and failure modes

- Dual registration: Jira accidentally remains in the built-in registry and the external package.
- Example drift: `examples/connectors/jira` still imports from `@srgnt/connectors` instead of the new package.
- Package-shape drift: the new package exports fixtures and manifest but not the required `{ manifest, runtime, factory }` entrypoint.
- Test drift: registry tests still assert `jira` is bundled alongside Outlook and Teams.

### Security considerations

- No new secrets should be introduced in this step.
- Preserve the Phase 20 package boundary and do not reintroduce a privileged built-in-only Jira load path.

### Performance considerations

- Not performance-sensitive yet beyond keeping the extraction as a structural move.
- Do not pull live network or markdown-write behavior into this step.

### Acceptance criteria mapping

- Phase criterion “Jira no longer ships as a built-in implementation” is primarily satisfied here.
- This step does **not** satisfy settings, auth, live API, markdown persistence, or desktop integration criteria.

### Junior-developer readiness checklist

- Exact outcome and success condition: pass.
- Why the step matters: pass.
- Prerequisites and dependencies: pass.
- Concrete starting files/packages/tests: pass.
- Required reading completeness: pass.
- Constraints and non-goals: pass.
- Validation commands and acceptance mapping: pass.
- Edge cases and recovery expectations: pass.
- Security considerations: pass.
- Performance considerations: pass.
- Integration touchpoints and downstream effects: pass.
- Blockers or unresolved decisions: none blocking.
- Junior readiness verdict: **pass**.

## Human Notes

- Prefer extracting the existing fixture-backed behavior first, then layering live API work in later steps.
- Do not combine settings/auth or markdown-writing work into this extraction step.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means Jira has one package home, one factory/runtime entrypoint, and no remaining built-in `@srgnt/connectors` copy.
- If blocked, record exactly which imports/runtime assumptions still require the built-in package path.
