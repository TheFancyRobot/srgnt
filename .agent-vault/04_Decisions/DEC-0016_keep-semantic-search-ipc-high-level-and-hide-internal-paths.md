---
note_type: decision
template_version: 2
contract_version: 1
title: Keep semantic search IPC high-level and hide internal paths
decision_id: DEC-0016
status: proposed
decided_on: '2026-04-14'
owner: ''
created: '2026-04-14'
updated: '2026-04-14'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]'
tags:
  - agent-vault
  - decision
---

# DEC-0016 - Keep semantic search IPC high-level and hide internal paths

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: proposed.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Keep semantic search IPC high-level and hide internal paths.
- Related notes: [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]].

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- Using workspace-relative paths adds a small translation step in the main process when opening notes.
- The benefit is a cleaner contract boundary with less coupling to local filesystem layout and model packaging details.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-14 - Created as `proposed`.
<!-- AGENT-END:decision-change-log -->
