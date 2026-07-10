---
note_type: architecture
template_version: 2
contract_version: 1
title: ACP Command Center Target Architecture
architecture_id: "ARCH-0009"
status: active
owner: "matthew"
reviewed_on: "2026-07-10"
created: "2026-07-10"
updated: "2026-07-10"
related_notes:
  - "[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]"
  - "[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]]"
  - "[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]"
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

# ACP Command Center Target Architecture

This note is the canonical description of srgnt's post-pivot architecture (per [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]): a desktop command center for CLI coding-agent harnesses over the Agent Client Protocol. It is the architecture reference for phases 21–29 and their steps. Aggregator-era architecture notes remain as historical record.

## Purpose

- Covers the whole pivoted product: protocol integration, process supervision, persistence, permissions, UI surfaces, and the Groups/pipelines subsystem.
- Answers: how does srgnt talk to any coding agent, persist and resume what happened, and let multiple agents collaborate — without per-harness protocol code?

## Overview

- srgnt is an Electron app (main/preload/renderer, secrets confined to main) whose renderer keeps the existing three-panel workspace shell, brand tokens, notes editor, and terminal.
- Every harness (Pi, opencode, custom) integrates **only** through ACP: JSON-RPC 2.0 over stdio, spawned as a child process, driven via the official `@agentclientprotocol/sdk` (`ClientSideConnection`).
- Product pillars: chat GUI over any ACP agent; sessions organized into projects (mixed harnesses per project); persistent, honestly-resumable sessions; Groups — multiple harness instances communicating through a srgnt-provided backend with reusable pipelines.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- `@srgnt/harness` (new package, pure Node, zero Electron imports) - all agent-facing logic: `acp/` SDK wrapper with typed update stream and capability model; `registry/` HarnessDefinition data (built-ins: Pi via pinned `pi-acp` adapter, opencode via `opencode acp`; user-defined custom entries; quirks + capability overrides); `supervisor/` process lifecycle (lazy spawn, health, kill-trees, idle reaping); `groups/` GroupBroker, bus MCP server, deterministic pipeline runner; `testing/` scriptable mock ACP agent (`AgentSideConnection`) — the test substrate for every phase.
- `@srgnt/runtime` - local-first persistence and policy: workspace v2 bootstrap, SessionStore (append-only JSONL event logs + meta records), project store, permission engine (evolved approvals + policy; default-ask), logs. Boundary rule: `harness` never touches disk layout; `runtime` never speaks ACP.
- `@srgnt/contracts` - `effect/Schema` definitions for Project, Session (kind: single|group, parentSessionId), SessionEvent envelope (raw ACP updates verbatim + srgnt client events, protocolVersion-tagged), HarnessDefinition, GroupTemplate/Pipeline, and typed IPC contracts.
- Desktop main process - composition root wiring supervisor ↔ IPC, client services offered to agents (`fs/read_text_file`/`fs/write_text_file` path-guarded to project roots; `terminal/*` backed by node-pty), permission round-trips to the renderer, GroupBroker socket.
- Renderer - existing shell (ActivityBar, Navigation, SidePanel, Titlebar, LayoutContext) plus ChatView (streamed messages, thought blocks, tool-call cards with CodeMirror diffs and terminal embeds, plan panel), composer (slash commands, modes, cancel), permission prompts, project/session navigation, GroupBoard + bus timeline, NotesView (per-project + group notes), TerminalPanel.
- Group bus - three tiers degrading by member capability: (1) bundled stdio MCP server injected via `session/new.mcpServers`, relaying to the GroupBroker over a token-authenticated local socket (tools: `group_send`, `group_inbox`, `group_wait`, `group_status`, `memory_search`); (2) prompt-turn nudges injecting pending digests; (3) `mailbox.md` file mirror. memsearch (user-installed CLI) optionally indexes group notes + mailbox for semantic recall.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `packages/harness/src/{acp,registry,supervisor,groups,testing}/` - agent-facing core (created in PHASE-22).
- `packages/runtime/src/{workspace,sessions,projects,approvals,policy}/` - persistence + permissions (workspace v2 in PHASE-21, sessions/projects in PHASE-24).
- `packages/contracts/src/` - domain + IPC schemas on `effect/Schema` (skeleton in PHASE-21).
- `packages/desktop/src/main/` - modular service composition root (modularized in PHASE-21).
- `packages/desktop/src/renderer/components/chat/` - ChatView and related surfaces (PHASE-23).
- `~/srgnt-workspace/projects/<id>/sessions/<id>/{meta.json,events.jsonl,transcript.md}` and `.../group/{bus.jsonl,members/<role>/events.jsonl,notes/}` - workspace v2 data layout.
- `~/srgnt-workspace/{groups/templates/,harnesses.json,settings.json}` - reusable templates and harness configuration.
<!-- AGENT-END:architecture-important-paths -->

## Data Flow

- Prompt turn: renderer → IPC → supervisor spawns/reuses agent process → `session/prompt` → `session/update` notifications stream back → SessionStore appends raw updates (versioned envelope) → renderer renders live; response stop reason closes the turn.
- Permission: agent `session/request_permission` → permission engine (session-remembered → project policy → default-ask) → renderer prompt if unresolved → decision returned + audit event appended.
- Resume: reopen renders instantly from local events; next prompt reconnects via `session/load`/`session/resume` when the harness advertises support; otherwise read-only + explicit fork-with-handoff (`parentSessionId`).
- Group message: member calls `group_send` (MCP tool) → bus server relays over socket → GroupBroker persists to `bus.jsonl`, routes to recipient inboxes, mirrors to `mailbox.md`, and nudges idle recipients on their next prompt turn.
- Pipeline: deterministic runner fills stage prompt template → prompts the stage's member → awaits completion condition (stop reason / token / user gate) → evaluates transitions (loop-backs bounded by `maxIterations`) → advances; run state persists for restart recovery.

## Invariants

- ACP is the only harness integration surface; per-harness knowledge is HarnessDefinition **data**, never protocol code.
- Capability-driven UI: optional features render from negotiated capabilities and degrade visibly, never silently.
- Permissions default to ask-everything; relaxation is explicit, per-project, and audit-logged.
- UI-open ≠ process-running; the supervisor owns all agent process lifecycles and leaves no orphans on quit.
- `events.jsonl` is the session source of truth; `transcript.md` is derived; readers are tolerant of unknown event kinds.
- Renderer never holds secrets or raw process handles (carried forward from the aggregator-era boundary model).

## Constraints

- ACP is the only harness integration surface; per-harness knowledge is HarnessDefinition **data**, never protocol code (see Invariants above for the full list — Invariants restates the binding rules; this section carries the contract-required constraints).
- `@srgnt/harness` must build and test standalone with zero Electron imports; `@srgnt/runtime` must never speak ACP.
- All agent processes are supervisor-owned: lazy spawn, idle reaping, kill-trees on quit — no orphaned processes under any exit path.
- Client `fs/*` services are path-guarded to project `rootDir` + `additionalDirectories`; renderer never receives secrets or raw process handles.
- Permission engine defaults to ask-everything; auto-allow rules are explicit, per-project, and audit-logged.
- Local-first: all persistence is human-readable files under the central workspace; no database in v1 (SQLite permitted later only as a rebuildable index).
- memsearch and other user-installed tools are optional enhancers, detected at runtime — features must pass acceptance without them.

## Failure Modes

- Agent process crash mid-turn → supervisor surfaces a recoverable error state in the session; event log retains everything up to the last received update; respawn honors load/resume capability or falls back to read-only + fork.
- `pi-acp` adapter gaps (permission routing, MCP passthrough) → capability-driven degradation with visible trust badges; group bus falls to nudge/mailbox tiers; PHASE-22 spike gate owns the adopt/fork/contribute response.
- ACP Registry or remote catalogs unreachable → bundled static snapshot serves harness discovery (fail-to-builtin, the aggregator-era catalog lesson).
- Corrupt JSONL tail after a crash → tolerant reader drops the partial line, marks the turn interrupted, and continues; transcript checkpoint provides the human-readable fallback.
- MCP bus socket loss (broker restart) → bus server reconnects with backoff; messages persist in `bus.jsonl` before fan-out, so delivery resumes without loss; mailbox mirror remains readable throughout.
- Concurrent group members mutating one working tree → warned in UI; pipelines sequential by default; documented git-worktree-per-member recipe until automation lands.
- Protocol version drift across SDK bumps → stored events carry `protocolVersion`; fixture-pinned tolerant decodes catch breakage at upgrade time, not at read time.

## Related Notes

- [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot decision]] — rationale, alternatives, tradeoffs, consequences.
- Phases: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21]], [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22]], [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23]], [[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24]], [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25]], [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26]], [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27]], [[02_Phases/Phase_28_reusable_group_pipelines/Phase|PHASE-28]], [[02_Phases/Phase_29_polish_packaging_and_release/Phase|PHASE-29]].
- Historical (aggregator-era, superseded for product surface, still accurate for shell/terminal/notes internals): [[01_Architecture/System_Overview|System Overview]], [[01_Architecture/Integration_Map|Integration Map]], [[01_Architecture/Domain_Model|Domain Model]].
- External ground truth (2026-07-10): agentclientprotocol.com protocol v1 (session setup/load/resume, permissions, fs/terminals, MCP injection); `@agentclientprotocol/sdk`; pi 0.80.5 + community `pi-acp` adapter (no native ACP yet; gaps in permission routing/MCP passthrough); `opencode acp` native; memsearch CLI (`index/watch/search/expand`) user-installed.
