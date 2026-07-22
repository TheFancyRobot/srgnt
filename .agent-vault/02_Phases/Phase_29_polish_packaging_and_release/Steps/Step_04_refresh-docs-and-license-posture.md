---
note_type: step
template_version: 2
contract_version: 1
title: Refresh docs and license posture
step_id: STEP-29-04
phase: '[[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-29-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Refresh docs and license posture

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Refresh docs and license posture.
- Parent phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]].
- Exact outcome: README, TESTING.md, and site copy (srgnt.app) describe the shipped ACP command-center product (quick start, harness setup, projects/sessions, groups/pipelines, testing guide); LICENSE.md — which predates the pivot — is reviewed for the new product and the outcome recorded as a decision note.
- Starting files: `README.md`, `TESTING.md`, `AGENTS.md`, LICENSE.md; docs from Phase 26.
- Validate: docs read-through against the actual app (every documented flow works); license decision note exists and is linked from PHASE-29.

## Why This Step Exists

- Docs were rewritten in STEP-21-05 BEFORE the product existed (README still says `@srgnt/harness` is "planned for Phase 22 and does not exist yet"); after phases 22-28 they are materially stale.
- LICENSE.md predates the pivot and is unreviewed; shipping publicly under an unreviewed license is a liability. This step makes docs match reality and records a license decision.

## Prerequisites

- Phases 22-28 feature-complete; STEP-29-01/02/03 merged. Read DEC-0017 (pivot framing) and DEC-0018 (honest-capability copy) so docs describe capabilities without over-claiming.

## Relevant Code Paths

- `README.md` (fix harness "planned/does not exist" + 4→5 package count), `TESTING.md` (commands + coverage matrix, coordinate with STEP-29-05), `AGENTS.md`, site copy at srgnt.app.
- `LICENSE.md` (BSL 1.1, Licensor "The Fancy Robot, LLC", Change Date 2029-03-29 → MPL 2.0) vs `scripts/build-fedora-rpm.sh` rpm spec `License: UNLICENSED` — reconcile via **one canonical SPDX value**. The new decision note (under `04_Decisions/`, linked from PHASE-29) records `canonical_license_id` — a single SPDX id, default `BUSL-1.1` — the human decision confirms or replaces that one value, and the rpm spec is set to `License: <canonical_license_id>`. Validation compares the rpm string to the decision note's field, never to LICENSE.md prose. Owner of the value: the human license decision; owner of propagating it: this step.

## Required Reading

- [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]] (framing the docs must reflect)

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

- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture/Validation_Plan|Validation Plan]].
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
