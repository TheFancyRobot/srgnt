---
note_type: shared_knowledge
title: srgnt One Pager
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
---

# srgnt One Pager

`srgnt` is a desktop-first, local-first command center for engineers and engineering managers. It brings Jira, Outlook Calendar, and Microsoft Teams context into a user-owned workspace, generates inspectable daily artifacts, and supports terminal-based coding-agent workflows without requiring premium Fred services or always-on cloud infrastructure.

## Target User

- Enterprise developers and engineering managers who already live in Jira, Outlook Calendar, and Microsoft 365.
- Users who want one trustworthy place to start the day, prepare for meetings, and track priorities without stitching tools together manually.

## Problem

- Work context is split across tickets, meetings, chat, notes, and scripts.
- The first hour of the day becomes manual triage instead of focused execution.
- AI tools often lack durable local context, transparent artifacts, and safe boundaries for real operational work.

## Solution

- Provide a local workspace that acts as the durable command-center surface.
- Pull connector-driven context from Jira, Outlook Calendar, and Teams into canonical local records.
- Generate inspectable artifacts such as a daily briefing, meeting prep blocks, prioritized actions, and watch items.
- Keep skills, logs, approvals, and terminal-agent launches grounded in local state rather than opaque remote services.

## V1 Wedge

- Start with one narrow workflow: the daily command center.
- Inputs: Jira issues, Outlook Calendar events, and Teams messages or mentions.
- Outputs: generated daily note, prioritized action list, meeting prep blocks, risk or watch items, and follow-up suggestions.
- This wedge is intentionally small, high-frequency, and easy to validate before broader workflow expansion.

## Why This Wedge Matters

- It solves a daily, repeated pain point rather than a one-off demo scenario.
- It proves the core product stack: connectors, canonical model, local runtime, generated artifacts, approvals, and UI surfaces.
- It keeps early scope focused enough that later sync and premium features remain additive instead of foundational.

## Success Criteria

- The base product is useful without Fred and without sync.
- The desktop app can assemble a trustworthy daily command-center workflow from the three v1 connectors.
- Generated outputs remain inspectable, editable, and durable in the local workspace.
- The product preserves local-first and secure trust-boundary rules: secrets stay out of the renderer, and privileged behavior stays behind narrow local boundaries.
- PHASE-01 through PHASE-05 can implement against one stable framing package instead of re-deciding product scope.

## Product Constraints

- Desktop-first, not mobile-first.
- Local-first, file-backed, and inspectable.
- Useful without always-on cloud services.
- Premium Fred orchestration is additive, not required.
- Sync is a later layer, not a prerequisite for core value.
- The renderer must not own secrets or privileged connector logic.

## Not In V1

- Mobile clients.
- Slack as the first messaging connector.
- Broad write-back automation or autonomous remote actions.
- Multi-workspace orchestration.
- Cloud-required core workflows.

## Durable Inputs And Follow-On Decisions

- Terminology is frozen in [[06_Shared_Knowledge/terminology_rules|Terminology Rules]].
- The v1 workflow is frozen in [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]].
- Product boundary and connector choice are already accepted in [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001]] and [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]].
- Remaining implementation choices are seeded as proposed ADRs in DEC-0008 through DEC-0012.

## Related Notes

- [[00_Home/Roadmap|Roadmap]]
- [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
- [[06_Shared_Knowledge/terminology_rules|Terminology Rules]]
- [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
