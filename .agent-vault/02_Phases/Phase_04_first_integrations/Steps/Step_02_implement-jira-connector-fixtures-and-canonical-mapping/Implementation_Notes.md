# Implementation Notes

- This is the canonical task-source validation path for the wedge.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/connectors/jira/` — Jira connector package: manifest, auth adapter (Jira Cloud OAuth2 or API token), sync implementation, canonical task mapper
- `packages/connectors/jira/src/mapping.ts` — canonical task mapping: Jira issue → canonical task entity (title, status, assignee, priority, labels, due date, URL, raw metadata blob)
- `packages/connectors/jira/fixtures/` — replayable fixture data: sample Jira API responses for issues, transitions, sprint data
- `packages/connectors/jira/__tests__/` — connector tests proving: fixture-based sync, canonical mapping correctness, freshness timestamp propagation, unsupported-field handling (e.g., custom fields preserved in raw metadata)
- Updated `packages/contracts/` if canonical task schema needs fields discovered during implementation

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): Jira-specific response shapes validated with Zod; canonical task output must match the PHASE-01 Zod contract exactly
- DEC-0005 (pnpm monorepo): Jira connector is its own workspace package depending on `@srgnt/connector-sdk` and `@srgnt/contracts`
- DEC-0007 (Dataview/markdown local data): Synced Jira data lands as local markdown-compatible files, not in a database

**Starting files (must exist before this step runs):**
- Connector SDK from STEP-04-01 (`packages/connectors/sdk/`)
- Canonical entity Zod schemas from PHASE-01 (`packages/contracts/`)
- Runtime sync primitives from PHASE-03

**Constraints:**
- Do NOT mirror Jira's full schema in the canonical model (per Human Notes) — map only fields the wedge consumes, preserve rest in raw metadata blob
- Do NOT require a live Jira instance for tests — all tests must run against fixtures
- Do NOT add Jira-specific logic to the SDK or runtime packages — Jira-specific code stays in `packages/connectors/jira/`
- Auth for Jira is independent of Azure AD (unlike Outlook/Teams) — do not conflate them

**Validation:**
A junior dev verifies completeness by:
1. Running `pnpm test --filter @srgnt/connector-jira` — all fixture-based tests pass
2. Inspecting a fixture-based sync output and confirming it produces valid canonical task entities (Zod parse succeeds)
3. Checking that raw Jira metadata (custom fields, etc.) is preserved alongside canonical fields
4. Verifying freshness timestamps are set on sync output
5. Confirming no Jira-specific imports exist in `packages/connectors/sdk/` or `packages/runtime/`

**Junior-readiness verdict:** PASS — The step is well-scoped: implement one connector against an existing SDK, using fixtures. The canonical mapping is the main intellectual challenge, but the constraint to map only wedge-consumed fields keeps it bounded. Steps 02-04 can run in parallel after STEP-04-01 completes.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping|STEP-04-02 Implement Jira Connector Fixtures And Canonical Mapping]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
