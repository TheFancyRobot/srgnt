---
note_type: phase
template_version: 2
contract_version: 1
title: Real Machine Validation
phase_id: PHASE-11
status: planned
owner: ''
created: '2026-03-29'
updated: '2026-03-29'
depends_on:
  - '[[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/release-process|Release Process]]'
  - '[[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]]'
related_decisions:
  - '[[04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1|DEC-0011 Packaging, updates, and release channels for desktop v1]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 11 Real Machine Validation

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Validate the release candidate on real Windows, macOS, and Linux machines so external installer, trust, and UX checks are recorded before publication.

## Why This Phase Exists

- Repo-side release readiness is now green, but the remaining release risk lives in OS-native install, trust, icon, and accessibility behavior that only real machines can verify.
- This phase isolates external platform sign-off work from the product-hardening implementation phase that produced the candidate build.

## Scope

- Run the real-machine validation checklists for Windows, macOS x86_64, macOS arm64, and Linux `.deb` or the closest available Linux package target.
- Record PASS/FLAG/FAIL/BLOCKED outcomes back into the release QA matrix with evidence.
- Capture installer, update, icon, and accessibility findings that can block release publication.

## Non-Goals

- Building new product features while validating the candidate.
- Replacing repo-side automation that already passed in [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]].
- Automating away SmartScreen, Gatekeeper, or other trust surfaces that require operator review.

## Dependencies

- Depends on [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]].
- Depends on the current release candidate artifacts and the runbooks in [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]].

## Acceptance Criteria

- [ ] Windows real-machine validation is recorded with explicit PASS/FLAG/FAIL/BLOCKED outcomes.
- [ ] macOS x86_64 and macOS arm64 real-machine validation is recorded with explicit PASS/FLAG/FAIL/BLOCKED outcomes.
- [ ] Linux package validation is recorded for the intended release artifact path (`.deb` when available, otherwise the closest releasable Linux package with the gap noted).
- [ ] Release-blocking findings are promoted into bug or decision notes when needed.
- [ ] [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]] reflects the real-machine outcomes and final release recommendation.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1|DEC-0011 Packaging, updates, and release channels for desktop v1]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation|STEP-11-01 Run real machine release validation]]
<!-- AGENT-END:phase-steps -->

## Notes

- This phase exists to finish external sign-off, not to reopen already-passing repo-side release checks.
- If a target artifact is unavailable on a host (for example Linux `.deb`), record the substitute package used and keep the gap explicit.
