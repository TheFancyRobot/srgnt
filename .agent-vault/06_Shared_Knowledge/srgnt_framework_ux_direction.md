---
note_type: shared_knowledge
title: Initial Product UX Direction
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - ux
---

## 3. Initial Product UX Direction

## Key UX principle
The product should feel familiar to Obsidian users in terms of flexibility, composability, local ownership, and keyboard-friendly workflows.

It should **not** inherit a notes-first mental model.

## UX positioning
The product should feel like:
- a command center
- an operations cockpit
- a structured workspace for action and tracking

Not like:
- a blank notebook
- a markdown vault clone
- a generic dashboard tool

## UX opportunities to differentiate

### 1. Artifact-first instead of note-first
Outputs should be framed as operational artifacts such as:
- briefings
- meeting prep packets
- action summaries
- release readiness reports
- triage views
- follow-up drafts

This is stronger than "notes" because it ties content to operational intent.

### 2. Track execution, not just information
The UX should make it easy to see:
- what was generated
- what was acted on
- what changed
- what is blocked
- what is waiting for approval
- what needs follow-through

### 3. Build around workflows, not documents
Primary navigation can be centered on:
- Today
- Inbox
- Workflows
- Artifacts
- Integrations
- Runs
- Review

rather than:
- Notes
- Folders
- Tags

### 4. Make automation visible
A major opportunity is to make automations and skill runs feel first-class:
- what ran
- why it ran
- what it touched
- what it produced
- whether approval is needed

### 5. Treat tracking as a first-class product primitive
Tracking should not be an afterthought layered onto notes.

Examples:
- artifact status
- follow-up state
- workflow state
- connector freshness
- run outcomes
- unresolved blockers
- watch items

### 6. Structured + flexible hybrid
The product should use structured cards, lists, timelines, and views for active operations work, while still allowing rich text/markdown-style artifacts where needed.

## Suggested primary navigation for v1
- Today
- Calendar
- Inbox
- Workflows
- Artifacts
- Integrations
- Runs
- Settings

Optional later:
- Review
- Team
- Sync
- AI/Fred

## Suggested mental model for users
- **Today** = what matters now
- **Calendar** = what is happening in time and what work is attached to it
- **Inbox** = new inputs to triage
- **Workflows** = reusable operational actions
- **Artifacts** = durable outputs and work products
- **Integrations** = connected external systems
- **Runs** = history, approvals, and accountability

## Summary

V1 UX should be optimized around operations, automation, and tracking rather than generic note-taking. Familiarity for Obsidian users should come from flexibility and local ownership, not from copying the note-first product model.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_v1_one_pager|V1 Foundation Pack: Product One-Pager]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]
- [[06_Shared_Knowledge/srgnt_framework_wireframes_and_screens|Wireframes and Screen Specifications]]
