---
note_type: decision
template_version: 2
contract_version: 1
title: Use Dataview query engine over markdown files as local data layer
decision_id: DEC-0007
status: accepted
decided_on: '2026-03-21'
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
supersedes: []
superseded_by:
  - DEC-0011
related_notes:
  - '[[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]'
tags:
  - agent-vault
  - decision
---

# DEC-0007 - Use Dataview query engine over markdown files as local data layer

Record the default query/index direction while making the standalone feasibility spike a required confirmation step rather than an implicit assumption.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Use Dataview query engine over markdown files as local data layer.
- Related notes: [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]].
PHASE-03 needs a local data layer for the unified workspace model. The framework document states srgnt is "not built on Obsidian" (a standalone Electron app), but the data format is markdown files with YAML frontmatter — the same format as an Obsidian vault. The question is how to query this data.

Traditional options (SQLite, LevelDB) would require maintaining a separate index from the markdown source of truth. The Obsidian Dataview plugin (https://github.com/blacksmithgu/obsidian-dataview) already implements a query engine over markdown frontmatter and inline fields.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
Use the **Dataview query engine** (extracted from the Obsidian Dataview plugin, running standalone without Obsidian) as the default local data layer direction. There is no traditional database.

- Data lives in markdown files with YAML frontmatter (workspace items, entities, connector outputs).
- The Dataview engine indexes these files and provides a query language (DQL) and JavaScript API for querying.
- srgnt embeds Dataview's core engine as a library within the Electron main process.
- The query layer runs against the local file system, not against Obsidian.

This means the **markdown files are the database**. The Dataview engine is the preferred query/index layer on top of them.

This decision is accepted with one explicit gate: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]] must prove the engine can run outside Obsidian with acceptable complexity. If the spike disproves that assumption, create a superseding decision rather than force-fit Dataview into the runtime.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **SQLite (better-sqlite3)**: Proven, fast, SQL-based. Rejected because it creates a separate data store that must be kept in sync with markdown files, adding complexity and potential for drift.
- **LevelDB/RocksDB**: Simple key-value store. Rejected for the same sync-with-markdown issue, plus limited querying capability.
- **Custom indexer**: Build a bespoke markdown-frontmatter indexer. Rejected because Dataview already solves this problem and is battle-tested by millions of Obsidian users.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Pro**: Single source of truth — markdown files ARE the data, no sync layer needed.
- **Pro**: Data is human-readable, version-controllable, and portable.
- **Pro**: Dataview's query language is well-documented and familiar to Obsidian users.
- **Pro**: Users can open their workspace in Obsidian alongside srgnt if desired.
- **Con**: Dataview was designed as an Obsidian plugin, not a standalone library. Extracting the core engine requires understanding its internals and may break on updates.
- **Con**: Query performance on very large workspaces (10K+ files) is untested outside Obsidian.
- **Con**: No ACID transactions, no concurrent write safety. Mitigated by single-process Electron architecture (main process owns all writes).
- **Con**: Complex relational queries are harder in DQL than in SQL. Mitigated by keeping the domain model denormalized (each entity type in its own directory with rich frontmatter).

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- PHASE-03 Step 04 (query/index layer) must extract and embed Dataview's core engine as a standalone library.
- A research spike is needed early in PHASE-03 to validate that Dataview's engine can run outside Obsidian's plugin runtime.
- All entity schemas (PHASE-01) must be designed with YAML frontmatter as the primary storage format.
- Connector output (PHASE-04) must write normalized markdown files, not database records.
- PHASE-09 sync architecture must account for markdown-file-based data when designing conflict resolution.
- Performance benchmarks must be run against realistic workspace sizes (1K, 5K, 10K files) during PHASE-03.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-22 - Accepted during phase-readiness review as the default direction, with STEP-03-04 designated as the required feasibility-confirmation gate.
<!-- AGENT-END:decision-change-log -->
