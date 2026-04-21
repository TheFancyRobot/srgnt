---
note_type: step
template_version: 2
contract_version: 1
title: Define Jira settings schema and OS-keychain secret boundary
step_id: STEP-21-02
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Define Jira settings schema and OS-keychain secret boundary

## Purpose

- Outcome: add the non-secret Jira settings contract and UI surface while routing the Jira API token through a privileged credential adapter owned by Electron main.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- Live Jira sync needs a durable, user-editable config contract before API work begins.
- This is the step that prevents secrets from leaking into desktop settings or workspace markdown.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]].
- Read [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`
- new privileged desktop-main credential helper module for Jira credentials

## Concrete Starting Points

- Extend the durable non-secret settings schema in:
  - `packages/contracts/src/ipc/contracts.ts`
  - `packages/desktop/src/main/settings.ts`
- Add privileged token actions in Electron main/preload types:
  - `packages/desktop/src/main/index.ts`
  - `packages/desktop/src/preload/index.ts`
  - `packages/desktop/src/renderer/env.d.ts`
- Add settings UI affordances in:
  - `packages/desktop/src/renderer/main.tsx`
  - `packages/desktop/src/renderer/components/Settings.tsx`
- Add a new Jira credential adapter in desktop main, with this planning assumption:
  - preferred backend: true OS keychain
  - fallback backend: encrypted local storage when OS keychain is unavailable

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/renderer/components/Settings.tsx`

## Execution Prompt

1. Extend desktop settings so Jira has a durable non-secret configuration model.
2. Prefer a connector-config structure keyed by connector ID over a Jira-only dead end, but keep the first implementation concrete and shippable.
3. Include at minimum: Jira site URL, account email or label, scope mode, project keys and/or JQL, and extraction toggles/groups.
4. Add a settings UX for entering and updating non-secret Jira config plus a separate token submit or reconnect flow.
5. Implement a main-process credential adapter with this approved planning direction: **OS keychain preferred, encrypted local fallback allowed when the keychain is unavailable**.
6. Keep the raw token out of `desktop-settings.json`, renderer snapshots, markdown, package manifests, and package install metadata.
7. Add tests that prove token non-persistence and safe migration or default behavior.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-02 after STEP-21-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Recommended settings shape

- Model Jira under connector-scoped settings, not top-level one-off fields.
- Minimum non-secret fields:
  - `siteUrl`
  - `accountEmail` or `accountLabel`
  - `scopeMode` (`projects` or `jql`)
  - `projectKeys` and/or `jql`
  - extraction toggles for comments, links/subtasks, sprints, worklog summaries, attachment metadata, changelog summaries
- Token handling should use separate commands such as set/update/clear/status rather than treating the token as part of `settingsSave`.

### Credential backend assumption

- The refined plan assumes a **credential adapter** rather than hard-coding a single library at note time.
- Adapter priority:
  1. OS keychain backend when available
  2. encrypted local fallback under Electron main when keychain access is unavailable
- If the implementation cannot provide a trustworthy encrypted fallback on a target platform, fail closed and surface that limitation instead of silently storing plaintext.

### Validation commands

- `pnpm --filter @srgnt/contracts test`
- `pnpm --filter @srgnt/contracts typecheck`
- `pnpm --filter @srgnt/desktop test`
- `pnpm --filter @srgnt/desktop typecheck`
- Optional narrow target if test names are added: run settings-related and preload-related tests first before full desktop suite.

### Manual checks

- Save Jira non-secret config, then inspect `.command-center/config/desktop-settings.json` and confirm no token material exists.
- Restart the app and confirm non-secret settings persist while token presence is only represented as a safe boolean/status, not raw secret text.
- Verify reconnect/clear-token flow works without hand-editing JSON.

### Edge cases and failure modes

- Existing settings migration drops unknown connector config or rewrites it incorrectly.
- Renderer keeps token state around after submission.
- Credential backend unavailable on a platform and implementation falls back to insecure plaintext.
- Scope mode permits invalid combinations such as both empty `projectKeys` and empty `jql`.

### Security considerations

- This is the most security-sensitive step in the phase.
- The renderer may submit a token but must not retain or rehydrate it.
- Logs, errors, crash reports, and persisted settings must all avoid token leakage.
- Any “credential status” surface sent back to renderer must be boolean/summary only.

### Performance considerations

- Not throughput-sensitive, but settings reads and credential lookups must remain fast enough for app startup and connect actions.
- Avoid repeated blocking credential lookups on every render.

### Acceptance criteria mapping

- Phase criterion “Desktop settings support Jira non-secret configuration” is primarily satisfied here.
- Phase criterion “Jira API token handling uses OS keychain / main-process secret storage only” is defined here and partially implemented here.
- Later steps consume this contract; they should not redesign it.

### Junior-developer readiness checklist

- Exact outcome and success condition: pass.
- Why the step matters: pass.
- Prerequisites and dependencies: pass.
- Concrete starting files/packages/tests: pass.
- Required reading completeness: pass.
- Constraints and non-goals: pass.
- Validation commands and manual checks: pass.
- Edge cases and recovery expectations: pass.
- Security considerations: pass.
- Performance considerations: pass.
- Integration touchpoints and downstream effects: pass.
- Blockers or unresolved decisions: resolved enough for execution via adapter assumption.
- Junior readiness verdict: **pass**.

## Human Notes

- Treat this as a contract-freezing step. Step 03 should consume the agreed settings model, not redesign it mid-implementation.
- If the credential adapter reveals a true cross-platform blocker, record it explicitly and do not silently downgrade the security boundary.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means Jira config is user-editable, secrets stay out of workspace-visible config, and later API work has a stable input contract.
