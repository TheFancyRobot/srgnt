---
note_type: phase
template_version: 2
contract_version: 1
title: Groups v1 Multi-Harness Sessions and Bus
phase_id: PHASE-27
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 27 Groups v1 Multi-Harness Sessions and Bus

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Groups v1 Multi-Harness Sessions and Bus milestone.
- Ship group sessions (`kind: 'group'`): N members across mixed harnesses, each with its own agent process and event-log channel, presented with member tabs, roster, and user routing (send-to-member / broadcast).
- Implement the three-tier communication backend: injected group-bus MCP server (via `session/new.mcpServers`) connected to the main-process GroupBroker (primary); prompt-turn nudges (always available); file mailbox mirror (fallback). Persist `bus.jsonl` and render the bus timeline.
- Shared group memory: members write markdown artifacts to `group/notes/`; memsearch is detected and used when installed (watch + index + `memory_search` tool), never required. "Attach Group" escalation lets any single session spawn a linked group session with an explicit handoff (`parentSessionId`).

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Group session model: `kind: 'group'` sessions with GroupInstance (members, bus log, no pipeline yet); each member = own supervised agent process + acpSessionId + `members/<role>/events.jsonl` channel.
- Group UI: roster side panel, member tabs over per-member chat views, bus timeline view, compose-with-routing (send to member / broadcast).
- GroupBroker in main: message routing, persistence to `bus.jsonl`, member lifecycle fan-out.
- Bus MCP server: stdio executable shipped with the app, injected via `session/new.mcpServers`, connecting back to the broker over a local socket; tools `group_send`, `group_inbox`, `group_wait`, `group_status`, `memory_search`.
- Tier 2 nudges: broker injects pending-message digests into the next `session/prompt` per member. Tier 3 mailbox: bus mirrored to `group/notes/mailbox.md`.
- Shared memory: `group/notes/**.md` writable by members (via their own tools) and the user (NotesView); memsearch detected at runtime → `watch`/`index` the group notes + bus mirror, expose `memory_search`.
- "Attach Group": escalate any single session into a linked group session with explicit handoff summary (`parentSessionId`).
- Write-conflict guardrails: warning UX for multiple members sharing one working tree + documented git-worktree-per-member recipe (automation deferred).

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- Pipelines/automation (Phase 28) — Groups v1 is manual multi-agent with a bus; the user is the orchestrator.
- Git worktree automation for members (documented recipe only; automation is a tracked later enhancement).
- Requiring memsearch — it is detected and used when present, never load-bearing.
- Agent-to-agent communication beyond the srgnt bus (no direct sockets between harnesses).
- Cross-project group members (all members share the project root in v1).

## Dependencies

- Depends on [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (three-tier bus, group data layout, supervisor invariants).
- Requires two proven harnesses (PHASE-25) so capability variance is real, and PHASE-26's conformance/quirk data to drive per-member tier selection.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] A group session runs ≥2 members on different harnesses simultaneously, each with its own working chat view and event log.
- [ ] A member can `group_send` and another can `group_inbox`/`group_wait` it via the injected MCP server (tier 1) on at least one harness; nudge delivery (tier 2) works on all harnesses; mailbox mirror (tier 3) is written and readable.
- [ ] Bus traffic persists to `bus.jsonl` and the timeline UI renders it interleaved with member activity.
- [ ] With memsearch installed, group notes + bus mirror are indexed and `memory_search` returns relevant chunks; without it, everything else still works.
- [ ] "Attach Group" spawns a linked group session from a single session with a visible handoff; `parentSessionId` navigable both ways.
- [ ] Write-conflict warning appears when members share a working tree; worktree recipe documented.
- [ ] E2E: mock-agent-driven group scenario (two mock members exchanging bus messages) green.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|PHASE-28 Reusable Group Pipelines]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- None yet.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui|STEP-27-01 Model group sessions with member channels and roster UI]]
- [ ] [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server|STEP-27-02 Implement GroupBroker and injected bus MCP server]]
- [ ] [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline|STEP-27-03 Persist bus traffic and render the bus timeline]]
- [ ] [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers|STEP-27-04 Add prompt-turn nudges and file mailbox fallback tiers]]
- [ ] [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_05_add-shared-group-notes-with-optional-memsearch-integration|STEP-27-05 Add shared group notes with optional memsearch integration]]
- [ ] [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing|STEP-27-06 Add attach-group escalation and user message routing]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Design provenance: productizes the pi-teams workflow used to build this repo (`.pi/teams.yaml` coordinator/researcher/executor/reviewer/tester; `docs/pi-teams.md` QA → bugfix → QA loop) — but harness-agnostic via ACP MCP injection instead of pi-only tooling (decision log D10).
- Tier rationale: MCP tools give structured comms where passthrough works; prompt nudges mirror how pi teams already deliver teammate messages (proven UX, works everywhere); the file mailbox costs nothing and rescues the weakest harnesses. Conformance findings from Phase 26 tell the broker which tiers each member gets.
- The bus MCP server ships as an app-bundled stdio executable; its only job is socket relay to the GroupBroker — no business logic in the child.
- memsearch (user-installed CLI, detected at runtime): `watch`/`index` over `group/notes/` + bus mirror; `memory_search` tool proxies `search`/`expand`. Groups must pass all acceptance criteria on a machine without memsearch.
- Step order: group model + UI shell (01) → broker + MCP server (02) → bus persistence + timeline (03) → nudges + mailbox (04) → shared notes + memsearch (05) → attach-group + routing (06). 04–06 parallelize after 03.
- Validation: two-mock-member E2E exchange; mixed real-harness manual scenario (Pi + opencode) recorded in a session note.
