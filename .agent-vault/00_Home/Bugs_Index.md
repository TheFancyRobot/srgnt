---
note_type: home_index
template_version: 1
contract_version: 1
title: Bugs Index
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - index
  - bugs
---

# Bugs Index

Use this note as the manual table of contents for bug records in \`03_Bugs/\`.

## Triage Rules

- Create one note per bug.
- Give each bug a stable id such as \`BUG-0001\`.
- Link the bug from the active phase, related decision, and session notes when relevant.
- Close the loop by recording root cause and verification steps.

## Status Buckets

<!-- AGENT-START:bugs-index -->
_Last rebuilt: 2026-04-02._

- Notes indexed: 7
- Status summary: new (1), closed (5), open (1)

| Id | Title | Status | Severity | Reported | Fixed | Linear |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-0006 | [Notes view shows markdown syntax on all lines and textarea has visible border on focus](../03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus.md) | new | sev-2 | 2026-04-01 | - | - |
| BUG-0004 | [Notes tree add-item input has white-on-white text (a11y AAA fail)](../03_Bugs/BUG-0004_notes-tree-add-item-input-has-white-on-white-text-a11y-aaa-fail.md) | closed | sev-2 | 2026-04-01 | 2026-04-01 | - |
| BUG-0005 | [Markdown syntax tokens invisible and uneditable in live-preview editor](../03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor.md) | closed | sev-2 | 2026-04-01 | 2026-04-01 | - |
| BUG-0007 | [Source button on note editor does not implement live-preview toggle correctly](../03_Bugs/BUG-0007_source-button-on-note-editor-does-not-implement-live-preview-toggle-correctly.md) | closed | sev-2 | 2026-04-01 | 2026-04-01 | - |
| BUG-0003 | [Today View launch hardcodes intent: readOnly bypassing approval preview](../03_Bugs/BUG-0003_today-view-launch-hardcodes-intent-readonly-bypassing-approval-preview.md) | closed | sev-3 | 2026-03-29 | 2026-04-01 | - |
| BUG-0002 | [Today View launch flow fails in live desktop app](../03_Bugs/BUG-0002_today-view-launch-flow-fails-in-live-desktop-app.md) | closed | sev-3 | 2026-03-28 | 2026-04-01 | - |
| BUG-0001 | [RESEARCH: Query Engine Memory Scaling for Thousands of Documents](../03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents.md) | open | sev-3 | 2026-03-22 | - | - |
<!-- AGENT-END:bugs-index -->

## Useful Links

- Template: [[07_Templates/Bug_Template|Bug Template]]
- Severity reference: [[06_Shared_Knowledge/Bug_Taxonomy|Bug Taxonomy]]
- Current work: [[00_Home/Active_Context|Active Context]]
