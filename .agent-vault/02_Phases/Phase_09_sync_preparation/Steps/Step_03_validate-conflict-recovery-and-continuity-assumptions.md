---
note_type: step
template_version: 2
contract_version: 1
title: Validate Conflict Recovery And Continuity Assumptions
step_id: STEP-09-03
phase: '[[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]'
status: scaffolded
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-09-01
  - STEP-09-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Validate Conflict Recovery And Continuity Assumptions

Pressure-test the sync-prep architecture against real failure and recovery cases.

## Purpose

- Verify that the proposed sync model can handle conflicts, recovery, and offline continuity without architectural rewrite.
- Make risky assumptions explicit before any sync implementation begins.

## Why This Step Exists

- Sync problems often hide until multiple devices or interrupted sessions appear.
- This phase is only valuable if it exposes those risks now rather than deferring them into implementation panic.

## Prerequisites

- Complete [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]].
- Complete [[02_Phases/Phase_09_sync_preparation/Steps/Step_02_draft-encrypted-sync-architecture-and-account-model|STEP-09-02 Draft Encrypted Sync Architecture And Account Model]].

## Relevant Code Paths

- sync-prep notes from this phase
- workspace and runtime storage notes from earlier phases

## Required Reading

- [[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Enumerate the critical continuity scenarios: offline edits, reconnect after drift, stale indexes, device loss, and conflict between file-backed truth and derived metadata.
2. Test the drafted sync assumptions against those scenarios and record where the architecture still fails.
3. Add rollback/rebuild expectations for derived metadata and cached state.
4. Validate by producing a pass/fail table for the major conflict and recovery cases.
5. Update notes with blocked scenarios and the follow-up work they imply.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: scaffolded
- Current owner:
- Last touched: 2026-03-22
- Next action: Replace the current scaffolding with the promised implementation and verification path.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Derived metadata should be rebuildable after recovery; if not, the authority boundary is wrong.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/conflict-resolution-design.md` — conflict resolution and recovery design document covering:
  - Enumerated continuity scenarios: offline edits, reconnect-after-drift, stale Dataview indexes, device loss, conflicting YAML frontmatter, conflicting markdown body content, deleted-on-one-device edits, and binary attachment divergence
  - Pass/fail table: each scenario assessed against the STEP-09-02 sync architecture with explicit PASS/FAIL/NEEDS-WORK verdict
  - Merge strategy for markdown files: how YAML frontmatter conflicts are resolved (field-level merge for non-overlapping fields, otherwise manual resolution) and how markdown body conflicts are resolved (manual resolution with conflict artifact or explicit conflict markers)
  - Attachment strategy: binary attachments are never merged field-by-field; the design doc must choose between last-write-wins plus conflict copy or mandatory manual resolution
  - Rollback/rebuild expectations: how derived Dataview indexes are rebuilt after recovery, how cache is invalidated
  - Blocked scenarios: any scenario where the current architecture fails, with explicit follow-up work items

*Production scaffolding code:*
- `packages/sync/src/interfaces/conflict.ts` — TypeScript interfaces:
  - `IConflictResolver` (detect, resolve, markResolved)
  - `ConflictType` enum (frontmatterField, markdownBody, fileDeleted, fileCreatedBoth)
  - `ConflictRecord` (fileId, conflictType, localVersion, remoteVersion, resolution)
  - `MergeStrategy` enum (lastWriteWins, fieldLevelMerge, manualResolution)
- `packages/sync/src/schemas/conflict.ts` — Effect Schema definitions for conflict records
- `packages/sync/src/test-fixtures/` — test fixture directory containing:
  - `conflicting-frontmatter.fixture.ts` — two versions of a YAML frontmatter block with field-level conflicts
  - `conflicting-body.fixture.ts` — two versions of a markdown file body with content conflicts
  - `deleted-vs-modified.fixture.ts` — one device deletes a file, other device modifies it
  - `offline-reconnect.fixture.ts` — simulated edit sequences representing offline divergence and reconnect
  - Each fixture: a pair of file states + expected merge result for the chosen strategy

**Key decisions to apply:**
- DEC-0002 (TypeScript + Effect.Schema) — conflict schemas in Effect Schema, interfaces in TypeScript
- DEC-0006 (docs + scaffolding) — both design doc with pass/fail table AND test fixtures with conflict interfaces
- DEC-0007 (markdown/Dataview) — conflicts are between markdown files with YAML frontmatter; Dataview indexes are derived, never conflict-resolved, only rebuilt

**Starting files:**
- `packages/sync/` from STEP-09-01 and STEP-09-02 with classification schemas and sync interfaces
- Sync architecture doc from STEP-09-02
- Data classification matrix from STEP-09-01

**Constraints:**
- Do NOT implement a working sync engine or conflict resolver — only interfaces, schemas, and test fixtures
- Do NOT assume a specific merge library — the test fixtures should be tool-agnostic (plain data pairs, not bound to a diff library)
- Do NOT smooth away failures — if a scenario fails against the architecture, it must be recorded as FAIL with explicit follow-up work
- Do NOT sync or conflict-resolve Dataview indexes — they are rebuilt, never merged

**Validation:**
1. Conflict resolution design doc exists with a pass/fail table covering at least 6 distinct scenarios
2. At least one scenario is marked FAIL or NEEDS-WORK (if all pass, the scenarios aren't adversarial enough)
3. `IConflictResolver` interface compiles and has detect, resolve, markResolved methods
4. Test fixtures directory contains at least 4 fixture files
5. Each fixture file exports: `localVersion`, `remoteVersion`, and `expectedResult` (or equivalent structure)
6. Effect Schema definitions in `conflict.ts` can decode a valid `ConflictRecord` example
7. `pnpm --filter sync build` succeeds with all new files
8. Design doc explicitly addresses Dataview index rebuild strategy after conflict resolution

**Junior-readiness verdict:** PASS — the deliverables are well-defined (one doc, interfaces, fixtures). The challenge is designing realistic conflict scenarios, which requires understanding the markdown-based data model. Mitigate by providing the junior dev with the classification matrix and sync architecture doc as required reading, and seeding them with the scenario list from the execution prompt.

## Human Notes

- This step should surface uncomfortable edge cases, not smooth them away.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means sync prep includes explicit conflict and recovery analysis rather than only happy-path diagrams.
- Validation target: pass/fail table exists for the main continuity scenarios.
