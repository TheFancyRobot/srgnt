---
note_type: step
template_version: 2
contract_version: 1
title: Write cross-harness lessons-learned note driving generic support requirements
step_id: STEP-25-04
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
status: done
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-08-15'
depends_on:
  - STEP-25-02
  - STEP-25-03
related_sessions:
  - '[[05_Sessions/2026-08-15-193000-write-cross-harness-lessons-learned-note-driving-generic-support-requirements-claude-opus-5|SESSION-2026-08-15-193000 claude-opus-5 session for Write cross-harness lessons-learned note driving generic support requirements]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Write cross-harness lessons-learned note driving generic support requirements

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Write cross-harness lessons-learned note driving generic support requirements.
- Parent phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]].
- Exact outcome: a durable vault note (06_Shared_Knowledge) records the measured integration deltas between Pi (adapter-mediated) and opencode (native ACP) — capability differences, quirk flags actually needed, permission/MCP behavior, auth flows, lifecycle differences — distilled into an explicit requirements list that Phase 26's custom-harness editor and conformance runner must satisfy.
- Starting files: Phase 22 spike report; Phase 25 fixtures and capability matrix data; quirk flags accumulated in the registry.
- Validate: the note exists, is linked from this phase and PHASE-26, and each requirement is traceable to an observed behavior (no speculation).

## Why This Step Exists

- The phase note calls this the phase's real product: two measured integrations (Pi adapter-mediated, opencode native) distilled into traceable requirements — PHASE-26's dependency list names this note as its requirements input, and without it Phase 26 generalizes from one anecdote.
- The bar is "anecdotes → requirements": every REQ-26-xx cites a measured observation (fixture path / capture-note anchor / Implementation Notes entry); unevidenced requirements get cut. Fixed comparison axes for BOTH harnesses: launch+install/detection, auth surfacing, capability gaps, quirks needed, permission behavior, session load/resume, MCP passthrough, update-stream shape.

## Prerequisites

- STEP-25-02 + STEP-25-03 complete (transitively 01's captures). Gather: spike report, `06_Shared_Knowledge/opencode-acp-capture.md`, `fixtures/pi*`/`fixtures/opencode/`, Implementation Notes + Outcomes of steps 01–03, DEC-0018, and the PHASE-26 phase note (deliverables the REQs must map onto).

## Relevant Code Paths

- No product code — docs-only step. New note `06_Shared_Knowledge/cross-harness-lessons-learned.md` (recorded assumption on name) + wikilinks from the PHASE-25 and PHASE-26 phase notes and a backlink from the opencode capture note.

## Required Reading

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (adapter findings to compare against)
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (Phase-27 MCP consequence to restate)
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26]] (the consumer whose deliverables the REQs map onto)

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

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: claude-opus-5
- Last touched: 2026-08-15
- Next action: PHASE-25 is complete. [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26]] starts from [[06_Shared_Knowledge/cross-harness-lessons-learned|Cross-Harness Lessons Learned]]; its REQ→deliverable split is recorded in the PHASE-26 phase note's Notes section.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Full detail in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Implementation_Notes|Implementation Notes]].
- Delivered [[06_Shared_Knowledge/cross-harness-lessons-learned|Cross-Harness Lessons Learned]] at the assumed path: the eight fixed axes for both harnesses, an ARCH-0009 data-model failure section, the restated DEC-0018 PHASE-27 MCP consequence, **REQ-26-01…18** (each with an evidence pointer and a deliverable mapping) and **PROP-A…D** outside the REQ list.
- The fixtures were opened, not trusted from prose: the 93 slash commands are the preserved count `availableCommandsTrimmedFrom: 93` on seq 0 of `packages/harness/src/testing/fixtures/opencode/simple-prompt.jsonl`, and the opencode fixture's config-option values are positional placeholders by design, so it is cited for shape.
- **Both** harnesses return `configOptions` (opencode from `session/new`, pi from `session/load`), which reframes the sharpest finding: srgnt supports the mode surface neither harness treats as primary.
- The `configOptions` finding splits deliberately — the report half is REQ-26-18; the product surface (`session/set_config_option`) is PROP-A, owned by no PHASE-26 deliverable and labelled as such rather than implied into the REQ list.
- Docs-only step: no product code in the diff, so no test suite was run; validation is `vault_validate` plus a `git status` check.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- [[05_Sessions/2026-08-15-193000-write-cross-harness-lessons-learned-note-driving-generic-support-requirements-claude-opus-5|SESSION-2026-08-15-193000]] — claude-opus-5, branch `phase/25-step-04-lessons-learned`: wrote the lessons note and the link edits; docs only.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Done, with the evidence scope stated where each claim is made in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Outcome|Outcome]]. PHASE-25's exit artifact exists and PHASE-26's requirements gate is open.
- Shipped: [[06_Shared_Knowledge/cross-harness-lessons-learned|Cross-Harness Lessons Learned]] plus wikilinks in both directions (PHASE-25 → note, PHASE-26 → note, note → spike report + capture note + DEC-0018, and backlinks from both captures).
- **Validation is documentary only.** `vault_validate` — the lessons note is flagged by nothing; the new session note inherits the same eight `MISSING_REQUIRED_HEADING` and two `INVALID_SESSION_CONTEXT` errors every existing PHASE-25 session note already carries, because house session format diverges from `07_Templates/Session_Template.md`. No test suite was run: the diff contains no product code.
- **Narrower than "requirements are complete" implies:** the REQ list describes two harnesses, one adapter-mediated and one native, and roughly half of opencode's row is an advertisement rather than an exercised behavior — which is exactly what REQ-26-09…12 hand to the PHASE-26 conformance runner.
