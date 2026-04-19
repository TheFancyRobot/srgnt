---
note_type: step
template_version: 2
contract_version: 1
title: Introduce discoverable connector catalog with explicit installable manifest records
step_id: STEP-19-01
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: ''
created: '2026-04-16'
updated: '2026-04-16'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Introduce discoverable connector catalog with explicit installable manifest records

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: establish one bundled connector catalog source that describes every discoverable connector independently of workspace installation.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Why This Step Exists

- The repo already exposes `installed` and `available` on connector list payloads, but catalog metadata is still effectively duplicated and main-process-local.
- Discoverability needs a **single source of truth** so later settings, install/uninstall APIs, and renderer UI all talk about the same connectors.
- Without this step, later work risks re-encoding connector metadata in multiple places and accidentally reintroducing “bundled means installed”.

## Prerequisites

- Read the Phase 19 note end to end, especially the state model and acceptance criteria.
- Review the current baseline in `packages/contracts/src/ipc/contracts.ts`, `packages/contracts/src/connectors/manifest.ts`, and `packages/desktop/src/main/index.ts`.
- Confirm the bundled connector set is still exactly `jira`, `outlook`, and `teams` before changing identifiers.
- Work from a clean tree so the catalog extraction is easy to review independently.

## Relevant Code Paths

- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/connectors/index.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/index.ts`

## Execution Prompt

1. Create or extract a single bundled connector catalog record that can describe `jira`, `outlook`, and `teams` without looking at workspace settings.
2. Reuse existing manifest concepts where practical instead of inventing a second incompatible metadata model.
3. Make `listConnectors()` capable of enumerating all bundled connectors even when the workspace has never installed any of them.
4. Preserve the current `installed` / `available` fields on connector list responses, but ensure they are now derived from **catalog + install state**, not from ad hoc duplication.
5. Do **not** add install/uninstall APIs yet and do **not** change the persisted settings shape in this step.
6. Validate the catalog contract with targeted contract and desktop tests, then record any gaps for Step 02.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-04-16
- Next action: Start STEP-19-02 planning and implementation handoff.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- One obvious catalog source exists for bundled connector metadata (`id`, `name`, `description`, `provider`, `version`, and any manifest-derived fields kept in Phase 19).
- Desktop code can derive a connector list from that catalog even when the workspace has installed nothing.
- The install-before-use invariant remains true: catalog presence must never imply `installed = true`.

**Key decisions to apply:**
- Bundled catalog only for v1; no remote lookup and no dynamic downloader.
- Favor a shared manifest-backed or manifest-compatible catalog shape over one-off inline records in `main/index.ts`.
- Keep connector IDs stable (`jira`, `outlook`, `teams`) because later steps, existing tests, and settings migration depend on them.

**Starting files and likely touch points:**
- `packages/contracts/src/connectors/manifest.ts` for manifest-compatible metadata.
- `packages/contracts/src/connectors/index.ts` if a catalog type or helper must be exported.
- `packages/contracts/src/ipc/contracts.ts` if list-entry types should reference catalog-driven fields more directly.
- `packages/desktop/src/main/index.ts` to stop treating inline connector definitions as the only catalog source.

**Constraints and non-goals:**
- Do not change the persisted settings schema yet.
- Do not introduce install/uninstall handlers yet.
- Do not add live provider auth/session data to the catalog.
- Do not default-install connectors for tests, onboarding, or fresh workspaces.

**Edge cases and failure modes:**
- Unknown connector IDs must fail closed instead of inventing placeholder metadata.
- Missing catalog fields should fail tests instead of degrading silently in the renderer.
- Teams and Outlook may share a provider family, but they still need distinct catalog entries and IDs.

**Security:**
- Catalog records are non-secret metadata only.
- No auth tokens, scopes, callback URLs, or provider secrets should move into renderer-visible catalog payloads.

**Performance:**
- This step should stay in-memory and deterministic; no filesystem scan or remote fetch is justified.
- Avoid rebuilding connector metadata in multiple processes if one exported record can be reused.

**Validation:**
1. `pnpm -C packages/contracts test -- --filter ipc`
2. `pnpm -C packages/desktop test -- --filter connector`
3. Manual smoke: fresh app state still lists discoverable connectors with `installed = false`.

**Junior-readiness verdict:** PASS — bounded scope, clear starting files, and explicit non-goals make this safe to execute first.

## Human Notes

- The repo already contains partial Phase 19 groundwork (`installed` / `available` fields). Treat that as a baseline to normalize, not as a reason to skip the catalog cleanup.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the repo has one discoverable connector catalog source that later steps can trust.
- Validation target: a fresh workspace can list all bundled connectors without auto-installing any of them.
- Follow-up moves immediately to [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]] to persist installation explicitly.