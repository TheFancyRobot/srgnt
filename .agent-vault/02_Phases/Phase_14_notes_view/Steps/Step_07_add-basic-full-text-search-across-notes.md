---
note_type: step
template_version: 2
contract_version: 1
title: Add whole-workspace markdown search with bounded indexing
step_id: STEP-14-07
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: complete
owner: executor-1
created: '2026-03-31'
updated: '2026-03-31'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03]]'
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
related_decisions:
  - '[[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Define notes workspace boundary and cross-workspace navigation rules]]'
---

# Step 07 - Add whole-workspace markdown search with bounded indexing

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Add basic full-text search across notes.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Consider: Simple client-side search (read all files, filter by content) is sufficient for v1

## Companion Notes

- [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-07.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
