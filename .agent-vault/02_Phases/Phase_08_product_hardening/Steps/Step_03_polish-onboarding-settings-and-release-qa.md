---
note_type: step
template_version: 2
contract_version: 1
title: Polish Onboarding Settings And Release QA
step_id: STEP-08-03
phase: '[[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]'
status: completed
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

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Make the product understandable to a new user and testable by a release engineer.
- Ensure packaging, crash handling, connector setup, and workflow surfaces work together coherently.

## Required Reading

- [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]]

## Companion Notes

- [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-29
- Next action: Execute the Phase 11 real-machine runbooks on target hosts and record the remaining external sign-off results.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If the first-run story is confusing, treat that as a release blocker rather than a polish backlog item.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-205132-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-205132 opencode session for Polish Onboarding Settings And Release QA]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-212556-polish-onboarding-settings-and-release-qa|SESSION-2026-03-28-212556 Session for Polish Onboarding Settings And Release QA]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-221017-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-28-221017 OpenCode session for Polish Onboarding Settings And Release QA]] - Session created.
- 2026-03-29 - [[05_Sessions/2026-03-29-011244-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-29-011244 OpenCode session for Polish Onboarding Settings And Release QA]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
