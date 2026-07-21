---
note_type: step
template_version: 2
contract_version: 1
title: Rewrite onboarding with harness detection and first-session walkthrough
step_id: STEP-29-01
phase: '[[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Rewrite onboarding with harness detection and first-session walkthrough

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Rewrite onboarding with harness detection and first-session walkthrough.
- Parent phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]].
- Exact outcome: onboarding reflects the ACP product — detects installed harnesses on PATH (pi, opencode, registry-known agents), offers install hints for missing ones, reuses the improved choose-or-default workspace step (landed pre-pivot), and walks the user into a working first session.
- Starting files: `packages/desktop/src/renderer/components/Onboarding.tsx` (incl. the `secondaryAction` support from STEP-21-01); `packages/desktop/src/renderer/main.tsx` onboarding flow definition; harness detection APIs from `@srgnt/harness`.
- Validate: fresh-profile E2E completes onboarding to a working session with only the mock agent "installed"; detection states render correctly for present/missing harnesses.

## Why This Step Exists

- Onboarding still reflects the retired aggregator (STEP-21-02 slimmed it to two generic steps); a fresh-machine user has no path to the core ACP feature.
- Reduces the risk that release ships an app whose first-run experience never mentions harnesses or opens a session. Full rationale in the Execution Brief.

## Prerequisites

- Blocking (execution, not refinement): Phase 23 chat UI (the "first session") and Phase 25 registry/harness settings must be merged. The vault `depends_on` is empty — confirm both before starting.
- Read DEC-0018 for the honest-capability copy (Pi self-approves permissions badge; MCP unavailable for Pi; no client fs/terminal mediation).

## Relevant Code Paths

- `packages/desktop/src/renderer/main.tsx` — the REAL onboarding flow (`onboardingFlow` useMemo, ~lines 220-253), not `Onboarding.tsx`'s unused `defaultOnboardingSteps`.
- `packages/desktop/src/renderer/components/Onboarding.tsx` (`OnboardingWizard`, `secondaryAction`/`note`/`stepIcons` support); `packages/harness/src/registry/detect.ts` (`detectCommand`/`detectPi`, three-state `DetectionResult`); `packages/desktop/e2e/fixtures.ts` (`completeOnboarding` hard-codes heading strings — update in lockstep).

## Required Reading

- [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
