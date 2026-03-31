---
note_type: decision
template_version: 2
contract_version: 1
title: Define notes workspace boundary and cross-workspace navigation rules
decision_id: DEC-0014
status: accepted
decided_on: '2026-03-31'
owner: ''
created: '2026-03-31'
updated: '2026-03-31'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]'
  - '[[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]]'
tags:
  - agent-vault
  - decision
---

# DEC-0014 - Define notes workspace boundary and cross-workspace navigation rules

Lock the Notes surface boundary for Phase 14 so the Electron IPC layer, renderer UX, and workspace write contract all implement the same model.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Define notes workspace boundary and cross-workspace navigation rules.
- Related notes: [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]], [[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]].
- The original Phase 14 planning mixed three incompatible models: notes under `.command-center/notes/`, notes under `{workspaceRoot}/notes/`, and cross-workspace navigation to files outside the notes root.
- That ambiguity changes the required workspace layout contract, tree root, search scope, path-validation rules, and missing-link behavior.
- The user clarified the desired product shape during refinement: a dedicated `Notes/` root at the workspace top level, a Notes-only left tree, whole-workspace search and wikilink navigation, and Obsidian-like markdown editing behavior plus slash commands.
- The local-first storage rules in [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] mean user-facing notes should not live under `.command-center/`, which is reserved for framework-managed records.

## Decision

- The canonical editable notes root is `${workspaceRoot}/Notes/`. Phase 14 must update the workspace layout contract and bootstrap logic so this directory exists by default.
- The left-hand Notes tree browses only `${workspaceRoot}/Notes/`. It is not a generic workspace file manager.
- Whole-workspace search and wikilink resolution may read and open markdown files anywhere under the user-facing workspace tree, but must exclude `.command-center/`, hidden directories, symlinks, non-markdown files, and any path that escapes the workspace root.
- Missing-link creation is allowed only when the normalized target resolves inside `${workspaceRoot}/Notes/`. Links outside that root may open existing files, but they must never auto-create files elsewhere in the workspace.
- Renderer code passes workspace-relative paths only. The main process owns all path resolution, containment checks, symlink rejection, and file writes.
- This decision does not freeze the exact editor package. Phase 14 still must satisfy an Obsidian-style live-preview UX target, but the step plan may use the fastest faithful implementation path that preserves markdown as the source of truth.

## Alternatives Considered

- Store notes under `.command-center/notes/`. Rejected because `.command-center/` is for framework-managed state, not user-facing content, and hiding operational notes there weakens the local-first workspace model.
- Make the tree browse the whole workspace. Rejected because the Notes surface should remain a focused operational notes area rather than becoming a general file explorer.
- Restrict links and search to `Notes/` only. Rejected because the user explicitly wants whole-workspace search and wikilinks, including links into existing workspace markdown such as `Daily/` or `Meetings/`.
- Allow missing links to auto-create anywhere they resolve. Rejected because it turns note text into a broad write primitive and makes path-validation and user intent much harder to reason about safely.

## Tradeoffs

- Pro: gives every Phase 14 step one stable filesystem model instead of three competing ones.
- Pro: keeps user-authored notes visible in the workspace alongside other user-facing markdown.
- Pro: preserves the user's desired cross-workspace linking and search without turning the Notes tree into a broad file browser.
- Con: whole-workspace link/search support requires more careful path policy and indexing work than a notes-only MVP.
- Con: supporting whole-workspace reads but Notes-only creation adds asymmetric rules that the UI and tests must make explicit.
- Con: future phases may still need a broader artifact/document browsing surface, but that should be planned as its own product decision rather than smuggled into Notes.

## Consequences

- Phase 14 must replace all `.command-center/notes/` and lowercase `notes/` planning language with the canonical top-level `Notes/` root.
- [[02_Phases/Phase_14_notes_view/Steps/Step_01_add-ipc-channels-and-main-process-handlers-for-notes-file-operations|STEP-14-01]] must update the workspace layout contract and typed notes IPC surface accordingly.
- [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02]] must implement separate policies for editable Notes-root writes versus workspace-wide markdown reads.
- [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05]] and [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes|STEP-14-07]] must share the same workspace markdown inclusion and exclusion rules.
- Search and wikilink tests must explicitly cover `.command-center/` exclusion, symlink rejection, and missing-link creation limited to `Notes/`.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
- Session: [[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-31 - Created as `proposed`.
- 2026-03-31 - Accepted during Phase 14 refinement after the notes root, tree scope, and whole-workspace navigation/search rules were clarified.
<!-- AGENT-END:decision-change-log -->
