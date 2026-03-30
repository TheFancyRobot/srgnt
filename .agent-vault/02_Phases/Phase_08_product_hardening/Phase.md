---
note_type: phase
template_version: 2
contract_version: 1
title: Product Hardening
phase_id: PHASE-08
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-29'
depends_on:
  - PHASE-07
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
  - '[[04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1|DEC-0011 Packaging, updates, and release channels for desktop v1]]'
  - '[[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 08 Product Hardening

Make the desktop app shippable and supportable with packaging, updates, crash handling, telemetry policy, and onboarding polish.

## Objective

- Turn the working desktop product into a release candidate that can be packaged, updated, debugged, and introduced safely to new users.

## Why This Phase Exists

- The framework explicitly separates product hardening from the initial workflow milestones; shipping quality should not be assumed just because the wedge works locally.
- Crash handling, updater behavior, and redaction-aware telemetry influence user trust and supportability.

## Scope

- Add packaging/distribution and updater pipeline work.
- Add crash handling and a redaction-aware telemetry policy.
- Polish onboarding, settings, and release QA flows.

## Non-Goals

- Building sync or premium services.
- Adding new flagship workflows instead of hardening the existing product.

## Dependencies

- Depends on [[02_Phases/Phase_07_terminal_integration_hardening/Phase|PHASE-07 Terminal Integration Hardening]].
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` calls for packaging, updater pipeline, crash handling, telemetry policy, onboarding, and settings polish as a dedicated milestone.

## Acceptance Criteria

- [x] A release/distribution path exists and is documented. (AppImage packaging, Fedora RPM generation, packaged smoke coverage, release-candidate commands, and cross-platform CI artifact builds exist; final real-machine sign-off is tracked in PHASE-11.)
- [x] Updater and crash-handling behavior are implemented or prototyped with explicit limitations. (Local crash handling is implemented; update checks are wired with explicit provider/configuration limits and a manual publication flow.)
- [x] Telemetry/redaction policy is explicit and aligned with the local-first privacy posture. (Crash payloads are redacted before local persistence and the policy doc now matches the implementation.)
- [x] Onboarding and settings flows are coherent enough for new-user and release QA validation. (Linux automation, accessibility notes, performance baselines, and cross-platform validation runbooks are in place; remaining machine execution is tracked in PHASE-11.)

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|PHASE-07 Terminal Integration Hardening]]
- Current phase status: completed
- Next phase: [[02_Phases/Phase_12_brand_alignment/Phase|PHASE-12 Brand Alignment]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1|DEC-0011 Packaging, updates, and release channels for desktop v1]]
- [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]] - Release commands, CI artifact builds, and publication flow docs are in place.
- [x] [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]] - Local-only crash handling, redaction, and renderer fallback are now implemented.
- [x] [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa|STEP-08-03 Polish Onboarding Settings And Release QA]] - Release QA automation, baselines, and real-machine runbooks are in place.
<!-- AGENT-END:phase-steps -->

## Notes

- Desktop build, pack, and Linux release commands now work as real repo commands, and CI forwards signing/update environment variables when they are present.
- Crash handling now includes redacted local log writing, a renderer fallback screen, and a QA utility path for writing diagnostic crash logs.
- Onboarding now creates a real workspace, settings persist into workspace config, and release QA automation covers the Linux first-run, settings, crash-log, and packaged launch paths.
- This phase is complete as a repo-side hardening milestone. Remaining real-machine installer, trust-surface, and dedicated screen-reader verification work now moves into [[02_Phases/Phase_11_real_machine_validation/Phase|PHASE-11 Real Machine Validation]].
