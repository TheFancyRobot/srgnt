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

- Outcome: move Jira out of `packages/connectors/src/jira/` into a dedicated workspace package such as `packages/connector-jira/` that exports a Phase 20-compatible connector package shape.
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
- `examples/connectors/jira/`
- `package.json`, workspace filters, tsconfig references, and package manifests

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
2. Move the existing Jira fixture, mapping, and manifest logic into that package as the migration baseline.
3. Remove Jira registration and re-exports from `@srgnt/connectors` so Jira is no longer a built-in connector there.
4. Keep the connector ID stable as `jira`; do not invent a new install-facing identifier.
5. Update examples/tests/import paths so the extracted package becomes the new single source of truth.
6. Document any migration consequences for Step 05 (desktop integration) rather than silently patching around them.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Exact expected output:
  - `packages/connector-jira/` exists as a workspace package.
  - Jira no longer appears in `packages/connectors/src/index.ts` built-in exports or built-in registration.
  - the new package exposes a package-shaped entrypoint compatible with Phase 20.
- Integrity risks:
  - dual registration of `jira` from both built-in and package paths;
  - example package drift;
  - broken imports in tests and desktop manifests.
- Validation target:
  - targeted package tests for the new Jira package;
  - `pnpm --filter @srgnt/connectors test` and typecheck after Jira removal;
  - example package tests/typecheck if still retained.

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
