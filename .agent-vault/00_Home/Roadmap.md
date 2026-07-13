---
note_type: home_index
template_version: 1
contract_version: 1
title: Roadmap
status: active
created: "YYYY-MM-DD"
updated: "2026-03-27"
tags:
  - agent-vault
  - home
  - roadmap
---

# Roadmap

This roadmap tracks the product build plan for `srgnt`, using `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` as the planning source of truth.

## Planning Principles

- Freeze framing and contracts before implementation slices drift.
- Keep the base product useful without sync or premium Fred orchestration.
- Preserve local-first, file-backed workspace boundaries and keep secrets out of the renderer.
- Validate each milestone with a thin but real vertical slice before expanding scope.

## Phase Outline

| Phase | Status | Goal |
| --- | --- | --- |
| Phase 00 Product Framing Lock | completed | Align the repo and vault around the desktop-first workspace product boundary, v1 wedge, and success criteria |
| Phase 01 Foundation Contracts | completed | Freeze canonical contracts for entities, skills, connectors, executors, and worked examples |
| Phase 02 Desktop Foundation | partial | Stand up the repo skeleton, Electron shell, privileged boundary, and workspace bootstrap |
| Phase 03 Runtime Foundation | partial | Build the shared local runtime, approvals, artifacts, runs, and query/index direction |
| Phase 04 First Integrations | partial | Deliver Jira, Outlook Calendar, and one collaboration connector plus freshness/status surfaces |
| Phase 05 Flagship Workflow | partial | Prove the daily command-center workflow with Today, Calendar, and generated artifacts |
| Phase 06 Replace Zod with Effect Schema | planned | Migrate all Zod schemas to Effect Schema across the monorepo for unified runtime/type-level validation |
| Phase 07 Terminal Integration Hardening | partial | Integrate PTY-backed terminal execution with artifact-aware launches, approvals, and logs |
| Phase 08 Product Hardening | partial | Make the desktop app shippable with packaging, updates, crash handling, and onboarding polish |
| Phase 09 Sync Preparation | partial | Prepare data boundaries, classification, and continuity assumptions for future encrypted sync |
| Phase 10 Premium Fred Preparation | partial | Define entitlements and premium AI boundaries without coupling the base product to Fred |

Status legend: `completed` = acceptance is met; `partial` = meaningful implementation exists but key acceptance gaps remain; `scaffolded` = contracts or shells exist without the promised end-to-end behavior.
### Direction pivot — ACP coding-agent command center (2026-07-10)

Per [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]], srgnt pivots to a desktop GUI for CLI coding-agent harnesses over the Agent Client Protocol. The aggregator concept moves to an external collaboration project; phases 00–20 above are historical record, and their unfinished backlog is void. The build plan is now phases 21–29:

| Phase | Status | Goal |
| --- | --- | --- |
| [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase\|Phase 21 Pivot Groundwork and Aggregator Teardown]] | planned | Land housekeeping, tag `v0-aggregator-final`, delete aggregator packages/UI, workspace v2 + contracts v2 foundations, re-point docs and vault |
| [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase\|Phase 22 ACP Core Package and Pi Integration Spike]] | planned | `@srgnt/harness` (SDK wrapper, supervisor, registry), mock ACP agent, real-Pi round-trip, pi-acp adapter decision gate |
| [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase\|Phase 23 Chat UI v1 Over Ephemeral ACP Sessions]] | planned | Streaming chat surface, tool-call cards with diff/terminal embeds, default-ask permissions, composer with slash/modes, mock-agent E2E |
| [[02_Phases/Phase_24_projects_and_session_persistence/Phase\|Phase 24 Projects and Session Persistence]] | planned | JSONL event-log persistence, projects, session lists, honest resume (load/resume vs read-only + fork), lifecycle cleanup |
| [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase\|Phase 25 Opencode Integration and Harness Settings]] | planned | Second harness via `opencode acp`, harness settings UI, capability matrix, lessons-learned for generic support |
| [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase\|Phase 26 Generic Harness Support and Conformance]] | planned | Custom harness editor, conformance smoke-runner, ACP Registry catalog with snapshot fallback, third-party docs |
| [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase\|Phase 27 Groups v1 Multi-Harness Sessions and Bus]] | planned | Group sessions, three-tier bus (MCP server → nudges → mailbox), bus timeline, shared notes + optional memsearch, attach-group escalation |
| [[02_Phases/Phase_28_reusable_group_pipelines/Phase\|Phase 28 Reusable Group Pipelines]] | planned | GroupTemplate/Pipeline schemas, deterministic runner with gates and loop-backs, GroupBoard, built-in implement→review→QA→iterate template |
| [[02_Phases/Phase_29_polish_packaging_and_release/Phase\|Phase 29 Polish Packaging and Release]] | planned | Onboarding rewrite, perf, packaging matrix, docs/license, release checklist; stretch: transcript/notes semantic search |

## Near-Term Outcomes

- A durable framing package: [[06_Shared_Knowledge/srgnt_one_pager|one-pager]], [[06_Shared_Knowledge/terminology_rules|terminology rules]], [[06_Shared_Knowledge/v1_wedge_definition|v1 wedge definition]], and the proposed ADR backlog in [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] through [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012]].
- A working contract and desktop foundation: pnpm workspaces, shared contracts, Electron shell, typed IPC alignment, validated examples, and root build/typecheck/test coverage.
- A partially implemented command-center slice whose remaining work is honest and explicit: workspace persistence, runtime indexing, live connector/auth behavior, and full end-to-end daily briefing flow.

## Explicit Open Questions

- Can the accepted Dataview-over-markdown direction run standalone with acceptable complexity and performance, or must [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]] record a superseding decision?
- How much sync and Fred preparation should stay architecture-only versus becoming executable backlog during Phases 09-10?

## Resolved Questions

- Package manager: **pnpm** (see [[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005]])
- Third wedge connector: **Microsoft Teams first, Slack second** (see [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]])
- Default local data-layer direction: **Dataview over markdown files**, subject to the explicit feasibility-confirmation gate in [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007]] and [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04]].

## Related Notes

- [[00_Home/Dashboard|Dashboard]]
- [[00_Home/Active_Context|Active Context]]
- [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
- [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]]
- [[06_Shared_Knowledge/terminology_rules|Terminology Rules]]
- [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
