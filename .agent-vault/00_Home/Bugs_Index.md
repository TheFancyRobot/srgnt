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
_Last rebuilt: 2026-04-21._

- Notes indexed: 17
- Status summary: closed (11), fixed (4), fixed-verified (2)

| Id | Title | Status | Severity | Reported | Fixed | Linear |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-0008 | [Blockquotes have no visual styling in markdown editor](../03_Bugs/BUG-0008_blockquotes-have-no-visual-styling-in-markdown-editor.md) | closed | sev-2 | 2026-04-03 | 2026-04-03 | - |
| BUG-0009 | [Code blocks (indented and fenced) render as plain text with no styling](../03_Bugs/BUG-0009_code-blocks-indented-and-fenced-render-as-plain-text-with-no-styling.md) | closed | sev-2 | 2026-04-03 | 2026-04-03 | - |
| BUG-0004 | [Notes tree add-item input has white-on-white text (a11y AAA fail)](../03_Bugs/BUG-0004_notes-tree-add-item-input-has-white-on-white-text-a11y-aaa-fail.md) | closed | sev-2 | 2026-04-01 | 2026-04-01 | - |
| BUG-0005 | [Markdown syntax tokens invisible and uneditable in live-preview editor](../03_Bugs/BUG-0005_markdown-syntax-tokens-invisible-and-uneditable-in-live-preview-editor.md) | closed | sev-2 | 2026-04-01 | 2026-04-01 | - |
| BUG-0006 | [Notes view shows markdown syntax on all lines and textarea has visible border on focus](../03_Bugs/BUG-0006_notes-view-shows-markdown-syntax-on-all-lines-and-textarea-has-visible-border-on-focus.md) | closed | sev-2 | 2026-04-01 | 2026-04-02 | - |
| BUG-0007 | [Source button on note editor does not implement live-preview toggle correctly](../03_Bugs/BUG-0007_source-button-on-note-editor-does-not-implement-live-preview-toggle-correctly.md) | closed | sev-2 | 2026-04-01 | 2026-04-01 | - |
| BUG-0015 | [Desktop dev startup is blocked by TypeScript errors in main-process test files](../03_Bugs/BUG-0015_desktop-dev-startup-is-blocked-by-typescript-errors-in-main-process-test-files.md) | closed | sev-3 | 2026-04-13 | 2026-04-13 | - |
| BUG-0011 | [Horizontal rule (----) has no visible rendering](../03_Bugs/BUG-0011_horizontal-rule-has-no-visible-rendering.md) | closed | sev-3 | 2026-04-03 | 2026-04-03 | - |
| BUG-0003 | [Today View launch hardcodes intent: readOnly bypassing approval preview](../03_Bugs/BUG-0003_today-view-launch-hardcodes-intent-readonly-bypassing-approval-preview.md) | closed | sev-3 | 2026-03-29 | 2026-04-01 | - |
| BUG-0002 | [Today View launch flow fails in live desktop app](../03_Bugs/BUG-0002_today-view-launch-flow-fails-in-live-desktop-app.md) | closed | sev-3 | 2026-03-28 | 2026-04-01 | - |
| BUG-0001 | [RESEARCH: Query Engine Memory Scaling for Thousands of Documents](../03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents.md) | closed | sev-3 | 2026-03-22 | 2026-04-02 | - |
| BUG-0010 | [Slash commands trigger logic and indentation preservation issues](../03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues.md) | fixed | sev-1 | 2026-04-06 | 2026-04-06 | - |
| BUG-0016 | [migrateConnectorSettings passes unknown IDs through migration filter](../03_Bugs/BUG-0016_migrateconnectorsettings-passes-unknown-ids-through-migration-filter.md) | fixed | sev-3 | 2026-04-17 | - | - |
| BUG-0013 | [Heading whitespace visual issue - requires verification](../03_Bugs/BUG-0013_heading-whitespace-visual-issue-requires-verification.md) | fixed-verified | sev-3 | 2026-04-12 | 2026-04-13 | - |
| BUG-0014 | [Arrow key navigation stack overflow - requires verification](../03_Bugs/BUG-0014_arrow-key-navigation-stack-overflow-requires-verification.md) | fixed-verified | sev-3 | 2026-04-12 | 2026-04-13 | - |
| BUG-0012 | [Markdown editor shipped CommonMark-only parsing so GFM task lists, tables, strikethrough, and bare autolinks did not render](../03_Bugs/BUG-0012_markdown-editor-shipped-commonmark-only-parsing-so-gfm-task-lists-tables-strikethrough-and-bare-autolinks-did-not-render.md) | fixed | sev-3 | 2026-04-07 | 2026-04-07 | - |
| BUG-0012 | [Wikilink clicks disabled by CSS pointer-events: none](../03_Bugs/BUG-0012_wikilink-clicks-disabled-by-css-pointer-events-none.md) | fixed | high | 2026-04-12 | - | - |
<!-- AGENT-END:bugs-index -->

## Useful Links

- Template: [[07_Templates/Bug_Template|Bug Template]]
- Severity reference: [[06_Shared_Knowledge/Bug_Taxonomy|Bug Taxonomy]]
- Current work: [[00_Home/Active_Context|Active Context]]
