# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Create or extract a single bundled connector catalog record that can describe `jira`, `outlook`, and `teams` without looking at workspace settings.
2. Reuse existing manifest concepts where practical instead of inventing a second incompatible metadata model.
3. Make `listConnectors()` capable of enumerating all bundled connectors even when the workspace has never installed any of them.
4. Preserve the current `installed` / `available` fields on connector list responses, but ensure they are now derived from **catalog + install state**, not from ad hoc duplication.
5. Do **not** add install/uninstall APIs yet and do **not** change the persisted settings shape in this step.
6. Validate the catalog contract with targeted contract and desktop tests, then record any gaps for Step 02.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01 Introduce discoverable connector catalog with explicit installable manifest records]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
