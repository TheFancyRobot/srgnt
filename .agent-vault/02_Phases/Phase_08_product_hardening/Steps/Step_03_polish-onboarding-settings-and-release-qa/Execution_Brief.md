# Execution Brief

## Step Overview

Finish the release-readiness pass for first-run setup, settings, and QA coverage.

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

## Execution Prompt

1. Polish onboarding and settings so a new user can understand workspace creation, connector status, and core workflow entry points.
2. Build a release QA checklist that exercises packaging, onboarding, connectors, flagship workflow, terminal integration, and crash/telemetry behavior.
3. Validate with a manual release-readiness walkthrough from first launch through the flagship workflow.
4. Update notes with the checklist, known gaps, and the criteria for calling the app release-ready or not.

## Related Notes

- Step: [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa|STEP-08-03 Polish Onboarding Settings And Release QA]]
- Phase: [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
