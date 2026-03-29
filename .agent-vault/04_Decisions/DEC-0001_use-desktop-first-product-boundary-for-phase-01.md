---
note_type: decision
template_version: 2
contract_version: 1
title: Use Desktop-First Product Boundary For Phase 01
decision_id: DEC-0001
status: accepted
decided_on: '2026-03-21'
owner: ''
created: '2026-03-21'
updated: '2026-03-21'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]'
tags:
  - agent-vault
  - decision
---

# DEC-0001 - Use Desktop-First Product Boundary For Phase 01

Resolve the framework document's Obsidian-first vs desktop-first ambiguity for Phase 01 so the plan has stable boundaries.

## Status

- Current status: accepted.
- This decision applies to Phase 01 planning and the first round of contract work.

## Context

- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` contains two plausible product framings: an early Obsidian-centered framework and a later desktop-first base product architecture.
- Repo evidence in `[[01_Architecture/System_Overview|System Overview]]` and `[[01_Architecture/Code_Map|Code Map]]` shows there is no product code yet, so the first product phase sets long-lived boundaries.
- After repo review and targeted web pressure-testing, the user selected the desktop-first boundary for Phase 01.

## Decision

- Phase 01 will optimize for the later desktop-first product architecture.
- The contract work should assume a desktop client, local core runtime, privileged local services, and optional remote layers as the long-term product shape.
- The earlier Obsidian-centered framing remains useful as inspiration for workspace conventions and examples, but it does not define Phase 01 acceptance criteria or package boundaries.

## Alternatives Considered

- Obsidian-first framework boundary: rejected for Phase 01 because it would narrow the contract surface around a plugin/vault shell that the later product architecture explicitly expands beyond.
- Delay the decision and let Step 01 infer the boundary ad hoc: rejected because repo/package layout, security boundaries, and acceptance criteria would all drift.

## Tradeoffs

- Short-term cost: Phase 01 must carry desktop security and local-service boundary concerns earlier than a pure Obsidian plugin plan would.
- Short-term benefit: repo layout and contracts can be designed once instead of being rewritten when the desktop product arrives.
- Long-term tradeoff: Obsidian-specific UX work may move later, but the shared runtime and contract surface stay aligned with the broader product direction.

## Consequences

- Step 01 should freeze package and contract homes that make sense for a desktop-first product, not just an Obsidian plugin.
- Phase 01 notes should treat Electron security, local-first data boundaries, and approval/audit concerns as first-order constraints.
- Future notes can still use vault-style examples, but they should not let Obsidian-specific assumptions leak into core contracts.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
- Shared knowledge: [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-21 - Accepted after repo review, web pressure-testing, and user confirmation of the desktop-first boundary.
<!-- AGENT-END:decision-change-log -->
