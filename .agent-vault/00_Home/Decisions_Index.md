---
note_type: home_index
template_version: 1
contract_version: 1
title: Decisions Index
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - index
  - decisions
---

# Decisions Index

Use this note as the directory for decision records in \`04_Decisions/\`.

## Logging Rules

- Create a new decision note when a choice changes architecture, workflow, ownership, tooling, or long-term maintenance cost.
- Do not hide decisions inside session notes.
- When a decision is superseded, link both the old and new records.

## Starter Decision Candidates

- Record the first decision as soon as the vault operating model changes in a durable way.
- A likely early candidate is the repo rule that Agent Vault lives directly in \`.agent-vault/\` with no nested project folder.

## Decision Log

<!-- AGENT-START:decisions-index -->
_Last rebuilt: 2026-04-13._

- Notes indexed: 16
- Status summary: accepted (14), proposed (2)

| Id | Title | Status | Decided | Updated | Linear |
| --- | --- | --- | --- | --- | --- |
| DEC-0015 | [Use runtime-owned local semantic search with worker-hosted bundled model and workspace-root derived index](../04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index.md) | accepted | 2026-04-02 | 2026-04-02 | - |
| DEC-0014 | [Define notes workspace boundary and cross-workspace navigation rules](../04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules.md) | accepted | 2026-03-31 | 2026-03-31 | - |
| DEC-0013 | [Remove legacy contracts z-star exports and standardize on S-star schemas](../04_Decisions/DEC-0013_preserve-contracts-z-star-compatibility-wrappers-after-removing-zod.md) | accepted | 2026-03-28 | 2026-03-28 | - |
| DEC-0012 | [Default crash reporting to local-only redacted logs](../04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs.md) | accepted | 2026-03-22 | 2026-03-28 | - |
| DEC-0008 | [Define file-backed record contract for canonical workspace data](../04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data.md) | accepted | 2026-03-22 | 2026-03-22 | - |
| DEC-0011 | [DEC-0011 Use SimpleQueryEngine over in-memory CanonicalStore for v1 query/index](../04_Decisions/DEC-0011_dec-0011-use-simplequeryengine-over-in-memory-canonicalstore-for-v1-query-index.md) | accepted | 2026-03-22 | 2026-03-22 | - |
| DEC-0011 | [Standardize packaging, updates, and release channels for desktop v1](../04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1.md) | accepted | 2026-03-22 | 2026-03-22 | - |
| DEC-0002 | [Use TypeScript + Zod for all contracts and schemas](../04_Decisions/DEC-0002_use-typescript-zod-for-all-contracts-and-schemas.md) | accepted | 2026-03-21 | 2026-03-22 | - |
| DEC-0003 | [Teams first, Slack second for messaging connector](../04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector.md) | accepted | 2026-03-21 | 2026-03-22 | - |
| DEC-0004 | [Target macOS + Windows + Linux for desktop v1](../04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1.md) | accepted | 2026-03-21 | 2026-03-22 | - |
| DEC-0005 | [Use pnpm as monorepo package manager](../04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager.md) | accepted | 2026-03-21 | 2026-03-22 | - |
| DEC-0006 | [PHASE-09 and PHASE-10 produce architecture docs plus production scaffolding](../04_Decisions/DEC-0006_phase-08-and-phase-09-produce-architecture-docs-plus-production-scaffolding.md) | accepted | 2026-03-21 | 2026-03-22 | - |
| DEC-0007 | [Use Dataview query engine over markdown files as local data layer](../04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer.md) | accepted | 2026-03-21 | 2026-03-22 | - |
| DEC-0001 | [Use Desktop-First Product Boundary For Phase 01](../04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01.md) | accepted | 2026-03-21 | 2026-03-21 | - |
| DEC-0009 | [Freeze renderer stack and routing contract for desktop v1](../04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1.md) | proposed | 2026-03-22 | 2026-03-22 | - |
| DEC-0010 | [Use shared Microsoft auth boundary with main-process secret storage](../04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage.md) | proposed | 2026-03-22 | 2026-03-22 | - |
<!-- AGENT-END:decisions-index -->

## Useful Links

- Template: [[07_Templates/Decision_Template|Decision Template]]
- Architecture overview: [[01_Architecture/System_Overview|System Overview]]
- Definition of done: [[06_Shared_Knowledge/Definition_Of_Done|Definition Of Done]]
