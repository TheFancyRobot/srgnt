---
note_type: shared_knowledge
title: V1 Wedge Definition
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - wedge
  - v1
---

# V1 Wedge Definition

Freeze the first thin-but-useful product slice so later connector and workflow phases ship one coherent command-center experience.

## Target User

- Primary persona: enterprise developers and engineering managers who already work in Microsoft 365 and Jira.
- Typical day: they start in Jira, Outlook Calendar, and team chat, then manually reconcile priorities, meetings, blockers, and follow-ups across those tools.

## Core Problem

- The first hour of work is fragmented across tickets, meetings, messages, and notes.
- Existing AI helpers lack durable local context, inspectable artifacts, and clear safety boundaries.

## V1 Workflow

- Build a daily command center powered by three connectors: Jira, Outlook Calendar, and Microsoft Teams.
- Use those inputs to generate a local daily briefing that highlights priorities, meeting prep, blockers, watch items, and follow-up suggestions.
- Keep the workflow useful without sync and without premium Fred orchestration.

## Required Inputs

- Jira issues for the user and their team.
- Outlook Calendar events for the current day and near-term schedule.
- Microsoft Teams messages or mentions relevant to current work.

## Required Outputs

- Generated daily note or briefing artifact.
- Prioritized action list.
- Meeting prep blocks.
- Risk or watch-item summary.
- Follow-up suggestions that remain inspectable and editable.

## Explicit Non-Goals

- Mobile client work.
- Broad write-back automation across external systems.
- Multi-workspace orchestration.
- Slack as a first-wave connector.
- Premium Fred-only value or cloud-required core workflows.

## Success Criteria

- The product produces a genuinely useful daily command-center workflow from Jira, Outlook Calendar, and Teams.
- A user can understand priorities, upcoming meetings, blockers, and next follow-ups from one local workspace view.
- Output artifacts are inspectable, editable, and durable in the local workspace.
- The workflow remains useful when Fred is unavailable and when sync is disabled.
- The scope stays narrow enough that PHASE-04 and PHASE-05 can ship it without reopening the wedge.

## Downstream Mapping

- PHASE-04 implements the three connector feeds and freshness surfaces required by this wedge.
- PHASE-05 implements the command-center workflow surfaces that consume these inputs and produce the defined outputs.

## Related Notes

- [[02_Phases/Phase_00_product_framing_lock/Steps/Step_02_lock-v1-wedge-users-and-success-criteria|STEP-00-02 Lock V1 Wedge Users And Success Criteria]]
- [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
- [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]
- [[06_Shared_Knowledge/terminology_rules|Terminology Rules]]
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
