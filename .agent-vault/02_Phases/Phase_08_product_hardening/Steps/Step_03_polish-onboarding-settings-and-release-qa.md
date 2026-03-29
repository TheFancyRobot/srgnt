---
note_type: step
template_version: 2
contract_version: 1
title: Polish Onboarding Settings And Release QA
step_id: STEP-08-03
phase: '[[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]'
status: partial
owner: ''
created: '2026-03-21'
updated: '2026-03-29'
depends_on:
  - STEP-08-01
  - STEP-08-02
related_sessions:
  - '[[05_Sessions/2026-03-28-205132-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-205132 opencode session for Polish Onboarding Settings And Release QA]]'
  - '[[05_Sessions/2026-03-28-212556-polish-onboarding-settings-and-release-qa|SESSION-2026-03-28-212556 Session for Polish Onboarding Settings And Release QA]]'
  - '[[05_Sessions/2026-03-28-221017-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-221017 OpenCode session for Polish Onboarding Settings And Release QA]]'
  - '[[05_Sessions/2026-03-29-011244-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-29-011244 OpenCode session for Polish Onboarding Settings And Release QA]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Polish Onboarding Settings And Release QA

Finish the release-readiness pass for first-run setup, settings, and QA coverage.

## Purpose

- Make the product understandable to a new user and testable by a release engineer.
- Ensure packaging, crash handling, connector setup, and workflow surfaces work together coherently.

## Why This Step Exists

- First-run friction or unclear settings can negate otherwise strong technical work.
- This is the integration checkpoint for the whole hardening milestone.

## Prerequisites

- Complete [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]].
- Complete [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- onboarding and settings flows
- release QA checklist or scripts created in this step

## Required Reading

- [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]]

## Execution Prompt

1. Polish onboarding and settings so a new user can understand workspace creation, connector status, and core workflow entry points.
2. Build a release QA checklist that exercises packaging, onboarding, connectors, flagship workflow, terminal integration, and crash/telemetry behavior.
3. Validate with a manual release-readiness walkthrough from first launch through the flagship workflow.
4. Update notes with the checklist, known gaps, and the criteria for calling the app release-ready or not.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: partial
- Current owner:
- Last touched: 2026-03-29
- Next action: Run manual macOS/Windows packaging/icon validation plus dedicated screen-reader verification before promoting this step to completed.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Release QA should exercise the real wedge, not only technical diagnostics.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Onboarding flow in `packages/desktop/renderer/` — first-run screens covering: workspace creation/selection, connector status overview, core workflow entry point
- Settings UI in `packages/desktop/renderer/` — organized settings panel for: workspace path, connector configs, telemetry opt-in/out, update channel selection
- Release QA checklist document in `.agent-vault/06_Shared_Knowledge/release-qa-checklist.md` — structured test matrix covering:
  - Packaging: install/uninstall on macOS, Windows, Linux
  - Onboarding: first-run flow completes without confusion
  - Connectors: fixture-backed connector status works offline by default, with an optional live-auth smoke path for Teams when credentials are available
  - Flagship workflow: end-to-end happy path works
  - Terminal integration: terminal launches and commands execute
  - Crash handling: error boundary shows fallback, crash log is written
  - Auto-update: update check fires (even if no update available)
- Performance benchmark baselines: startup time, memory usage at idle, memory after 1hr usage (documented, not necessarily automated)
- Accessibility audit notes: keyboard navigation through main flows, screen reader landmark check, contrast ratio spot-check

**Key decisions to apply:**
- DEC-0003 (Teams first) — onboarding must show Teams connector setup prominently; Slack is secondary
- DEC-0004 (all three platforms) — QA matrix must cover all three platforms, not just the dev's primary OS
- DEC-0007 (markdown/Dataview data layer) — settings that persist must be stored in markdown/YAML files in the workspace, not in a separate database

**Starting files:**
- STEP-08-01 packaging pipeline must be complete (installable builds to test against)
- STEP-08-02 crash handling must be complete (QA checklist validates crash behavior)
- `packages/desktop/renderer/` must have the core UI shell from earlier phases
- Flagship workflow from PHASE-05 must be functional

**Constraints:**
- Do NOT add premium/Fred features to onboarding — base product only
- Do NOT skip any of the three platforms in the QA matrix — all three are first-class (DEC-0004)
- Do NOT automate performance benchmarks in this step — document baselines manually; automation is future work
- Do NOT block release on accessibility perfection — document findings and classify as release-blocker vs. follow-up

**Validation:**
1. Fresh install on each platform → onboarding flow launches → workspace is created → main UI appears
2. Settings panel opens → all settings are editable → non-secret settings persist after app restart (verify in workspace config files), while secrets remain in secure storage and only references appear on disk
3. Release QA checklist exists and covers all 7 areas listed above
4. Each QA checklist item has a PASS/FAIL/BLOCKED status for each of the 3 platforms
5. Performance baselines are documented with explicit PASS/FLAG/BLOCKED notes; at minimum record cold start time, idle memory, and one-hour memory delta, and treat crashes, UI hangs, or obvious memory growth as blockers even if no numeric threshold has been approved yet
6. Accessibility audit notes exist with at least: keyboard nav results, screen reader results, contrast findings

**Junior-readiness verdict:** PASS — this is primarily UI polish and test documentation work. The QA checklist is the most critical artifact and its structure is well-defined. The main risk is insufficient platform coverage (testing only on the dev's OS). Mitigate by requiring the QA matrix to have explicit entries for all three platforms, with BLOCKED status acceptable where hardware is unavailable.

## Human Notes

- If the first-run story is confusing, treat that as a release blocker rather than a polish backlog item.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-205132-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-205132 opencode session for Polish Onboarding Settings And Release QA]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-212556-polish-onboarding-settings-and-release-qa|SESSION-2026-03-28-212556 Session for Polish Onboarding Settings And Release QA]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-221017-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-221017 OpenCode session for Polish Onboarding Settings And Release QA]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-011244-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-29-011244 OpenCode session for Polish Onboarding Settings And Release QA]] - Session created.
<!-- AGENT-END:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-205132-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-205132 opencode session for Polish Onboarding Settings And Release QA]] - Implemented the Electron E2E suite, updated testing docs, and validated desktop build/typecheck/unit/E2E checks.

## Outcome Summary

- Completion means the desktop app has a coherent first-run path and a release QA checklist.
- Validation target: end-to-end release-readiness walkthrough is documented and repeatable.
- The step now has repeatable automated Electron coverage for the first-run and release-QA-critical flows, reducing reliance on manual-only validation for onboarding, connectors, persistence, and terminal launch behavior.
- Linux CI now runs both the real Electron E2E suite and a packaged Linux smoke test, and the packaged path exposed/fixed missing schema runtime dependencies that would have broken release builds before first launch.
- The desktop shell now creates a real workspace during onboarding, persists settings under `.command-center/config/desktop-settings.json`, and exposes release-QA utilities for update checks, crash-log writing, and renderer fallback verification.
- This step remains partial because dedicated screen-reader verification, the one-hour memory soak, and manual macOS/Windows release checks are still blocked.
