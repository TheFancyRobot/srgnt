---
note_type: decision
template_version: 2
contract_version: 1
title: Pivot srgnt from data aggregator to ACP coding-agent command center
decision_id: DEC-0017
status: accepted
decided_on: '2026-07-10'
owner: matthew
created: '2026-07-10'
updated: '2026-07-10'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]]'
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
tags:
  - agent-vault
  - decision
---

# DEC-0017 - Pivot srgnt from data aggregator to ACP coding-agent command center

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: proposed.
- Keep this section aligned with the `status` frontmatter value.
- Accepted 2026-07-10: user-directed pivot (aggregator concept moves to an external collaboration project); plan reviewed decision-by-decision (interrogation log D1–D21 summarized in Tradeoffs/Alternatives) and committed as phases 21–29.

## Context

- Decision needed: Pivot srgnt from data aggregator to ACP coding-agent command center.
- Related notes: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]].

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
- srgnt pivots from "AI-powered personal data aggregator / command center" to a **desktop GUI for controlling CLI coding-agent harnesses via the Agent Client Protocol (ACP)** — in the spirit of Claude Desktop and the ChatGPT/Codex apps, but harness-agnostic.
- Motivation: the original aggregator concept moves to a collaboration project with another developer; srgnt must not compete with it. The visual identity, desktop shell, and local-first architecture are explicitly retained.
- Product pillars: (1) ACP-native chat GUI — Pi first, opencode second, then generic bring-your-own-harness; (2) sessions organized into projects, mixing harnesses freely; (3) persistent, resumable sessions; (4) Groups — multiple harness instances communicating through a srgnt-provided backend with reusable pipelines (implement → review → QA → iterate).
- Integration boundary: **ACP only** — one protocol stack, per-harness knowledge lives in HarnessDefinition data (launch/quirks/capability overrides), adapter gaps handled outside the app core (pinned adapters, shims, upstream contributions). No bespoke per-harness protocol code in the app.
- Delivery: vault phases 21–29 (teardown → ACP core → chat UI → persistence → opencode → generic harness → groups → pipelines → release), each independently shippable.
- Boundary of the choice: this decides product direction and integration architecture. It does not decide pi-acp adapter adoption (Phase 22 spike gate), SQLite adoption (explicitly deferred; files-first with a rebuildable-index escape hatch), or premium/licensing posture (Phase 29).

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **Continue the aggregator and differentiate from the collaboration project** — rejected: the user is contributing the aggregator concept to the joint project; competing with it is off the table, and splitting attention would starve both.
- **Start a fresh repo for the agent GUI** — rejected: the desktop shell, brand/theme tokens, terminal (node-pty + ghostty-web), notes editor, approvals/policy machinery, typed IPC contracts, and E2E infrastructure are exactly the expensive parts of a desktop agent GUI, and they already exist here and are liked. Git history + the `v0-aggregator-final` tag preserve the old product without carrying its packages forward.
- **Integrate harnesses via their native protocols** (e.g., `pi --mode rpc` directly, opencode server API) — rejected: N harnesses × M protocol stacks is the exact fragmentation ACP exists to solve; a dual-stack app would silently deprioritize the ACP path that is the product's reason to exist. Adapter gaps are handled outside the core (pinned community adapters, srgnt-owned shims, upstream contributions).
- **Build on a harness's own multi-agent features** (pi teams) for Groups — rejected as the *mechanism* (kept as the UX blueprint): pi teams are pi-only; srgnt Groups must be harness-agnostic. The three-tier bus (injected MCP server → prompt nudges → file mailbox) works with any ACP agent.
- **Electron → Tauri/web rewrite as part of the pivot** — rejected: zero user value for the pivot's budget; the Node ecosystem pieces (node-pty, SDK stdio spawning, transformers.js) are Electron-native here.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Deleting working aggregator code** (connectors, sync/entitlements/fred scaffolding, aggregator views, phases 00–20's product surface): sunk cost accepted; carrying it would tax every build, test run, and future reader. History is preserved via git + `v0-aggregator-final` tag; vault phases 00–20 remain as record.
- **ACP-only integration** trades short-term fidelity (Pi's native RPC exposes more today) for one coherent stack, capability-driven UI, and free compatibility with every future ACP agent. Cost: dependency on adapter quality for Pi until native `--mode acp` exists; mitigated by the Phase 22 spike gate, srgnt-owned shim option, and upstream contribution path.
- **Community `pi-acp` adapter dependency**: known gaps (permission routing, MCP passthrough, no client fs/terminal delegation) may degrade the flagship harness's UX at launch; accepted temporarily and made visible in UI (trust badges) rather than papered over.
- **Files/JSONL over SQLite**: simplicity, crash-safe appends, human-readable/greppable/memsearch-friendly data — at the cost of query power at scale. Escape hatch documented: SQLite as rebuildable index only, logs stay source of truth.
- **Groups depend on harness MCP passthrough** for the richest tier; mitigated by always-available prompt nudges and the file mailbox, so the feature degrades instead of gating on the weakest harness.
- **Solo-maintainer bandwidth across 9 phases**: mitigated by independently-shippable phases with hard exit criteria and vault-based re-entry.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- Phases 21–29 supersede the remaining open work in phases 02–10 (workspace persistence for aggregator entities, connector liveness, flagship daily-briefing workflow, sync/Fred preparation). Those phases stay historically accurate but their unfinished backlog is void.
- Packages `connectors`, `executors`, `sync`, `entitlements`, `fred` and all aggregator UI/IPC/CLI are deleted in Phase 21; the monorepo lands on five packages (`tsconfig`, `contracts`, `runtime`, `harness`, `desktop`).
- New architectural rules take effect: ACP-only harness integration; `harness` package never touches disk layout, `runtime` never speaks ACP; permissions default-ask; capability-driven UI degradation; raw-ACP event logs as session source of truth.
- README/AGENTS/vault home + architecture notes must be rewritten (Phase 21 scope); Roadmap's phase 00–10 table is historical.
- Prior decisions about connector isolation, connector catalogs, Microsoft auth boundaries (DEC-0003, DEC-0010, DEC-0016 connector variant) become historical; local-first, renderer-secret-boundary, and crash-posture decisions (DEC-0012 et al.) carry forward.
- The `.pi/` team workflow continues for building srgnt itself and doubles as the Groups design reference.
- Superseded design notes (kept as historical record, no longer roadmap inputs): [[06_Shared_Knowledge/sync-architecture|Sync Architecture]], [[06_Shared_Knowledge/fred-workflow-design|Fred Workflow Design]], [[06_Shared_Knowledge/conflict-resolution-design|Conflict Resolution Design]].

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|PHASE-21 Pivot Groundwork and Aggregator Teardown]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-07-10 - Created as `proposed`.
<!-- AGENT-END:decision-change-log -->
