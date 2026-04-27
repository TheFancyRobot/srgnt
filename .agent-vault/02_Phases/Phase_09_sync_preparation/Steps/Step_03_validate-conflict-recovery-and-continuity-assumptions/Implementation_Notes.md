# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_09_sync_preparation/Steps/Step_03_validate-conflict-recovery-and-continuity-assumptions|STEP-09-03 Validate Conflict Recovery And Continuity Assumptions]]
- Phase: [[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]
