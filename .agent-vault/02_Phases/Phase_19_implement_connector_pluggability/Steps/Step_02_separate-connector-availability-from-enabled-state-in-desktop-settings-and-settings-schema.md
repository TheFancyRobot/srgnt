---
note_type: step
template_version: 2
contract_version: 1
title: Separate connector availability from enabled state in desktop settings and settings schema
step_id: STEP-19-02
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: done
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Separate connector availability from enabled state in desktop settings and settings schema

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: persist connector installation explicitly in desktop settings while keeping connector availability derived from the bundled catalog.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Why This Step Exists

- Today `SDesktopConnectorPreferences` and `defaultDesktopSettings` still use per-connector booleans, which conflates “installed” with “connected/enabled”.
- The renderer cannot honestly present install/uninstall actions while settings still encode a toggle-first model.
- This step makes fresh-workspace defaults and migration behavior explicit before main-process APIs start mutating install state.

## Prerequisites

- Complete [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01]].
- Review current settings persistence helpers and tests before choosing the final persisted shape.
- Confirm the migration policy before implementation: preserve only explicit legacy opt-ins; never auto-install connectors for missing or fresh settings.

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/src/main/index.ts`

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`

## Execution Prompt

1. Replace the current connector boolean settings model with an explicit `installedConnectorIds: string[]` array containing connector IDs.
2. Keep `available` out of persisted settings; availability must remain derived from the bundled catalog created in Step 01.
3. Make fresh defaults empty: no connector is installed in `defaultDesktopSettings` and no connector becomes installed during onboarding without explicit user action.
4. Add a compatibility path for legacy settings files so previously explicit `true` connector flags are preserved as installed during migration, while missing or `false` values remain uninstalled.
5. Update settings merge/read/write helpers and any parsing tests that assert defaults.
6. Leave connect/disconnect runtime semantics for Step 03; this step ends when persistence tells the truth.

## Migration Contract (must be implemented exactly)

Migration happens once during settings read/merge and is **not** repeated on render.

### Legacy-to-new settings matrix (deterministic)

- **Old shape:** `connectors: Record<string, boolean>`
- **New shape:** `installedConnectorIds: readonly ("jira" | "outlook" | "teams")[]`

| Legacy input state | New-state output | Rationale |
|---|---|---|
| `connectors[id] === true` (ID exists in catalog) | Push `id` to `installedConnectorIds` array | Preserves explicit opt-in |
| `connectors[id] === false` or key absent | Exclude `id` | No consent by default |
| Non-boolean `connectors[id]` | Exclude `id`, treat as malformed; keep startup safe | Schema hardening |
| Unknown connector IDs | Exclude + continue | Ignore stale or future IDs gracefully |
| Legacy shape present + `installedConnectorIds` already present | **New shape wins** | Prevents double-truth and accidental re-application |
| Fresh settings file with no connector section | `installedConnectorIds: []` | Explicit empty install intent |

### Required migration test cases (must be added in settings tests)

1. Fresh settings -> `installedConnectorIds` defaults to `[]` (empty array); no implicit installs.
2. Legacy `jira: true` -> installs only `jira` when catalog includes `jira`.
3. Legacy `jira: false`, `outlook: true` -> installs only `outlook` if in catalog.
4. Malformed legacy map values (string/null/object) -> migration continues and installs nothing extra.
5. Unknown legacy ID present -> ignored without throwing and without installing.
6. Conflicting legacy + new shape -> new shape used exclusively.

### Guardrail

- Persisted schema **must not** store `available` or connector booleans anymore.
- Migrated settings must remain semantically idempotent (running migration twice should not add duplicates).


## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: reviewer
- Last touched: 2026-04-16
- Next action: Route reviewed settings migration work to tester and continue Phase 19 validation.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- Desktop settings persist installation separately from runtime connection state.
- Fresh workspaces serialize an empty install set.
- Legacy settings files with `jira: true` / `outlook: true` / `teams: true` migrate deterministically to the new install-state structure without installing anything else.

**Key decisions to apply:**
- Install state is durable workspace configuration; availability is not.
- Migration should preserve explicit prior intent only; absence is not consent.
- Keep the serialized shape simple and inspectable in `.command-center/config/desktop-settings.json`.

**Starting files and likely touch points:**
- `packages/contracts/src/ipc/contracts.ts` for `SDesktopConnectorPreferences` and `SDesktopSettings`.
- `packages/contracts/src/ipc/contracts.test.ts` for parser/default behavior.
- `packages/desktop/src/main/settings.ts` for defaults, merges, and file read/write behavior.
- `packages/desktop/src/main/settings.test.ts` for migration/default assertions.
- `packages/desktop/src/main/index.ts` only as a consumer of the new settings shape.

**Constraints and non-goals:**
- Do not persist `available` in settings.
- Do not silently install connectors during first run.
- Do not remove legacy compatibility until tests prove the migration path works.
- Do not mix in auth/session secrets; persisted install state stays non-secret.

**Edge cases and failure modes:**
- Missing `connectors` blocks in older settings files must still read safely.
- Unknown connector IDs in a future or hand-edited file should be ignored or normalized safely rather than crashing startup.
- Partial settings writes must still merge layout/theme defaults correctly.

**Security:**
- Workspace settings may store only non-secret installation intent.
- Secret/session state stays outside this file and outside the renderer-visible settings payload.

**Performance:**
- Migration must happen once during read/merge, not on every render loop.
- Avoid expensive deep transforms; the setting is a tiny record.

**Validation:**
1. `pnpm -C packages/contracts test -- --filter ipc`
2. `pnpm -C packages/desktop test -- --filter settings`
3. Manual smoke: delete desktop settings, relaunch, and confirm the written default file still contains zero installed connectors.
4. Manual smoke: create a legacy-style settings fixture with one `true` connector flag and confirm only that connector migrates to installed.

**Junior-readiness verdict:** PASS — this step is implementation-ready as long as the migration rule above is followed literally.

## Human Notes

- If the implementation is tempted to keep both the old booleans and the new install record indefinitely, stop and document why; Phase 19 needs one honest persisted model.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means `desktop-settings.json` tells the truth about installation and nothing else.
- Validation target: fresh settings install nothing by default, while legacy explicit opt-ins survive migration cleanly.
- Follow-up moves to [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]].