---
note_type: shared_knowledge
title: V1 Scope and Non-Goals
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
---

## 2. V1 Scope and Non-Goals

## V1 objective
Ship a desktop-first product that proves the core value proposition:
users can operate their day from a single workspace that combines integrations, terminal-agent workflows, artifact generation, and operational tracking.

## V1 in-scope

### Core workspace
- desktop application shell
- local workspace model
- artifact browser/editor
- command-center home view
- settings and connector management

### Operational surfaces
- daily command-center / briefing view
- calendar view with day, week, and agenda modes
- meeting and schedule context view
- task/risk/watchlist view
- run history and approvals view
- inbox or triage surface for new items/actions

### Integrations/connectors
Initial connector targets:
- Jira
- Outlook Calendar
- Teams or Slack

### Execution model
- terminal pane or terminal integration surface
- skill invocation model
- local skill runtime
- generated artifacts from workflows
- logs and run tracking

### Data model
- canonical entities
- capability model
- skill manifests
- connector manifests
- executor abstraction

### Security baseline
- privileged local boundary
- no secrets in renderer/UI
- local secure storage integration
- sensitivity-aware logs
- policy-aware action gating

## V1 out of scope

### Not a full notes replacement
V1 should support artifacts and structured writing, but it is not trying to become a general-purpose PKM system.

### Not a full chat/email/calendar replacement
The product should orchestrate and summarize work across systems, not replace the source systems wholesale.

### Not mobile parity
Mobile is later and should not block desktop v1.

### Not full community marketplace in v1
The system should be designed for extensibility, but marketplace/distribution/governance can come later.

### Not Fred-dependent
Fred is not required for base product value.

### Not team collaboration as a core v1 feature
Single-user excellence comes first.

## V1 success criteria

A successful v1 should make a user feel that:
- they can start their day here
- they can understand priorities faster here
- they can act on work with less context switching
- the product produces artifacts they actually use
- terminal-agent workflows feel integrated, not bolted on
- the workspace feels built for doing work, not filing notes

---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_v1_one_pager|V1 Foundation Pack: Product One-Pager]]
- [[06_Shared_Knowledge/srgnt_framework_milestone_roadmap|Initial Milestone Roadmap]]
