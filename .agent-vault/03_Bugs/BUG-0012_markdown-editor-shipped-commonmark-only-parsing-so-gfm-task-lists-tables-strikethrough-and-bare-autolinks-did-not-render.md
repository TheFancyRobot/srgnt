---
note_type: bug
template_version: 2
contract_version: 1
title: Markdown editor shipped CommonMark-only parsing so GFM task lists, tables, strikethrough, and bare autolinks did not render
bug_id: BUG-0012
status: fixed
severity: sev-3
category: logic
reported_on: '2026-04-07'
fixed_on: '2026-04-07'
owner: ''
created: '2026-04-07'
updated: '2026-04-07'
related_notes:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]'
  - '[[05_Sessions/2026-04-07-225700-implement-markdown-slash-commands-on-top-of-live-preview-reviewer|SESSION-2026-04-07-225700 reviewer session for Implement markdown slash commands on top of live preview]]'
tags:
  - agent-vault
  - bug
---

# BUG-0012 - Markdown editor shipped CommonMark-only parsing so GFM task lists, tables, strikethrough, and bare autolinks did not render

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Markdown editor shipped CommonMark-only parsing so GFM task lists, tables, strikethrough, and bare autolinks did not render.
- Related notes: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]], [[05_Sessions/2026-04-07-225700-implement-markdown-slash-commands-on-top-of-live-preview-reviewer|SESSION-2026-04-07-225700 reviewer session for Implement markdown slash commands on top of live preview]].

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
- `packages/desktop/src/renderer/components/notes/MarkdownEditor.tsx` initialized CodeMirror with `markdown()` but without the `GFM` parser extensions, so the syntax tree never exposed the GFM structures the renderer expected.
- The checkbox decoration plugin was looking for `TaskList` nodes, but the GFM parser emits `Task` / `TaskMarker` nodes for each task item, so checkbox line decorations were never applied.
- The editor also lacked a bare-autolink widget, so raw `URL` nodes were left as plain text even after GFM parsing was enabled.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]
- Session: [[05_Sessions/2026-04-07-225700-implement-markdown-slash-commands-on-top-of-live-preview-reviewer|SESSION-2026-04-07-225700 reviewer session for Implement markdown slash commands on top of live preview]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-07 - Reported.
<!-- AGENT-END:bug-timeline -->
