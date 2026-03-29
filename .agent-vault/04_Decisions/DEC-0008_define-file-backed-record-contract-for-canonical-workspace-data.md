---
note_type: decision
template_version: 2
contract_version: 1
title: Define file-backed record contract for canonical workspace data
decision_id: DEC-0008
status: accepted
decided_on: '2026-03-22'
owner: ''
created: '2026-03-22'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]'
  - '[[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]'
  - '[[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]]'
  - '[[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]'
  - '[[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Dataview over markdown local data layer]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
tags:
  - agent-vault
  - decision
---

# DEC-0008 - Define file-backed record contract for canonical workspace data

Seed the remaining write-contract work implied by [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007]]. Later phases already assume markdown files are the database; this proposal makes the record lifecycle rules explicit before Phase 02 and Phase 03 implementation notes drift.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Phase 00 requires an ADR backlog seed for the file-backed record contract before foundation and runtime work begin.
- [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007]] already settles that canonical product data lives in markdown files with YAML frontmatter and that derived query/index storage is not authoritative.
- What remains open is the record lifecycle contract: which records are append-only, which are replace-in-place current state, how writes stay atomic, and where secrets are explicitly forbidden.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]] and PHASE-03 runtime steps need one durable rule set for workspace writes so a junior implementer does not invent conflicting persistence behavior.
- Sync preparation also depends on this boundary because conflict recovery only works if authoritative records and rebuildable derivatives are clearly separated.

## Decision

- Proposed direction: keep canonical product records file-backed, human-readable, and rebuildable from the workspace alone.
- Canonical records use markdown files with YAML frontmatter when the record is user-visible or queryable by the local data layer. Structured helper files such as app config or lock metadata may use JSON or YAML under `.command-center/` when markdown would be artificial.
- Files fall into two write classes:
  - Append-only records for chronological history such as run logs, audit-like event logs, and crash-safe append journals.
  - Replace-in-place records for current state such as settings, manifests, connector summaries, approval state, and generated "latest" materialized views.
- Replace-in-place writes must be atomic at the file level: write a temp file in the same directory, flush it, then rename it into place so readers never observe a half-written record.
- Derived caches and query indexes remain disposable acceleration layers and must be fully rebuildable from canonical files.
- Raw secrets, OAuth tokens, refresh tokens, and other credential material never live in workspace files; only non-secret references or summaries may be persisted there.
- This proposal does not yet freeze exact schema fields for every record type, sync conflict policy, or concurrency behavior beyond the single-writer main-process assumption.

## Alternatives Considered

- Store everything as replace-in-place files. Rejected because chronological logs and run history need durable append semantics for auditability and recovery.
- Make every record append-only. Rejected because settings, manifests, and current connector state become harder to read, validate, and bootstrap.
- Introduce SQLite or another embedded database for authoritative state. Rejected because it breaks the markdown-as-source-of-truth direction already chosen in [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007]].
- Allow renderer-side writes to canonical files. Rejected because privileged file writes belong in the main-process boundary and would weaken security and recovery guarantees.

## Tradeoffs

- Pro: keeps the workspace inspectable, portable, and aligned with the local-first product story.
- Pro: gives Phase 02 and Phase 03 a simple rule: files are truth, caches are disposable.
- Pro: append-only logs plus atomic replacement protect recovery without introducing a database.
- Con: file lifecycle rules are more nuanced than a blanket "everything is markdown" slogan.
- Con: atomic write helpers and cross-platform file semantics must be implemented carefully in the privileged process.
- Con: future sync and multi-device conflict resolution may still require superseding details once real write frequency is known.

## Consequences

- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03]] should map each planned directory and record type onto one of the two write classes above.
- PHASE-03 runtime work should provide shared write helpers for append-only and atomic replace-in-place behavior instead of ad hoc file I/O.
- Sync-prep notes should classify append-only logs, replace-in-place state, and derived indexes differently because they have different recovery and sync properties.
- If implementation disproves the single-writer assumption or requires transactional multi-file updates, create a superseding ADR rather than bending this proposal silently.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
 - Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
 - Architecture: [[01_Architecture/System_Overview|System Overview]]
 - Related decision: [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Dataview over markdown local data layer]]
 - Downstream step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]]
 - Session: [[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- Created as `proposed`.
- 2026-03-22 - Promoted to `accepted`. Substance (file-backed records, markdown storage, append-only and atomic-replace write classes) is de facto adopted across Phase 02 workspace layout, Phase 03 runtime implementation, and downstream phase step notes.
<!-- AGENT-END:decision-change-log -->
