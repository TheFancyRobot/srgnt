---
note_type: decision
template_version: 2
contract_version: 1
title: Pi ACP adapter strategy — adopt pinned pi-acp, fork into a shim, or contribute native --mode acp
decision_id: DEC-0018
status: accepted
decided_on: '2026-07-15'
owner: matthew
created: '2026-07-15'
updated: '2026-07-15'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]'
  - '[[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]]'
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]'
tags:
  - agent-vault
  - decision
---

# DEC-0018 - Pi ACP adapter strategy — adopt pinned pi-acp, fork into a shim, or contribute native --mode acp

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: **accepted** (ratified by matthew, 2026-07-15) — the phased
  hybrid below is the chosen direction.
- Ratified as recommended: **adopt pinned `pi-acp@0.0.31` now for phases 23–24**;
  **revisit before Phase 27 to contribute native `--mode acp` upstream, forking
  into `packages/shims/pi-acp` only if upstream stalls.** This sets direction
  only — no fork/upstream implementation is committed in Phase 22 (spike-only).
- Revisit trigger stands: re-open when upstream pi lands native `--mode acp`, or
  when Phase 27 (groups/bus) work begins — whichever comes first.

## Context

- DEC-0017 committed srgnt to ACP as the only agent-integration surface, but
  explicitly left the *Pi adapter* choice open: Pi has no native ACP, only the
  community `pi-acp` shim (`npx pi-acp`) wrapping `pi --mode rpc`.
- STEP-22-05 ran a live spike against pinned `pi-acp@0.0.31` (evidence:
  [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]]).
  Measured results per probe:
  - **Permissions:** pi-acp self-approves; `session/request_permission` never
    round-trips to the client (0 calls during a real tool-executing turn).
  - **MCP passthrough:** a valid stdio MCP server injected via
    `session/new.mcpServers` is **never forwarded** to pi (server not launched, tool
    never called). `mcpServers` is force-clamped off in the Pi definition.
  - **loadSession/resume:** `session/load` **works** and returns rich model/thinking
    config; `session/resume` is unsupported (`-32601`).
  - **fs/terminal delegation:** none — pi runs tools in-process; client `fs`/`terminal`
    ports are never called (0 calls; file written directly by pi).
- Adapter version is pinned (`PI_ACP_VERSION = '0.0.31'`) and the three gaps are
  already declared as `quirks` + `capabilityOverrides` on the built-in definition, so
  the app degrades visibly rather than silently.

## Decision

Recommendation (for the human to ratify) — a **phased hybrid**, not a single choice:

1. **Now, for phases 23–24: ADOPT the pinned `pi-acp@0.0.31` adapter as-is.** None of
   the measured gaps block single-session chat (Phase 23) or session persistence
   (Phase 24): tool activity is fully observable via `tool_call`/`tool_call_update`
   updates, `session/load` covers resume-by-replay, and images stream. The gaps only
   need **honest UI surfacing** (self-approving permission badge; "MCP unavailable for
   Pi"; no client fs/terminal mediation) — already backed by the definition's quirks.
2. **Before Phase 27 (groups + bus): CONTRIBUTE native `--mode acp` upstream to pi**
   (fallback: **FORK into `packages/shims/pi-acp`**). The bus tier-1 design injects a
   stdio MCP server via `session/new.mcpServers`, which the spike proves **cannot work
   for Pi today**. Upstream-first because pi is actively developed and a native ACP mode
   fixes permission routing, MCP passthrough, and fs/terminal delegation for the whole
   ecosystem at once; fork only if upstream does not land before Phase 27 needs it.

Boundary of this decision: it does **not** commit implementation of the fork or the
upstream contribution now (Phase 22 is spike-only per its non-goals). It sets the
direction and the revisit trigger.

## Alternatives Considered

- **Adopt pinned adapter permanently, accept the gaps.** Rejected as the *whole*
  answer: acceptable through Phase 24, but the MCP-passthrough gap is a hard blocker for
  the Phase 27 group bus — "accept forever" would silently break Pi group members.
- **Fork into `packages/shims/pi-acp` now.** Rejected as the *first* move: it forks
  maintenance of a fast-moving community adapter before we know upstream's appetite for a
  native mode, and nothing in phases 23–24 needs the fixes yet. Kept as the fallback.
- **Contribute native `--mode acp` upstream now.** Right long-term target, but
  premature to *depend on* before Phase 27; upstream timing is out of our control, so we
  adopt-now and schedule the contribution against the phase that actually needs it.
- **Drive `pi --mode rpc` directly (bypass ACP).** Rejected by DEC-0017's boundary — ACP
  is the only integration surface; a bespoke Pi path would fork the whole harness model.

## Tradeoffs

- **Adopt-now (pinned):** lowest cost, unblocks phases 23–24 immediately; cost is
  carrying three visible capability gaps and a version pin that must be re-validated on
  any bump. Short-term win, but not a Phase-27-complete answer.
- **Upstream contribution:** highest ecosystem leverage and removes the fork-maintenance
  burden; risk is timeline/acceptance uncertainty — we do not control when (or if) it
  lands, so it cannot be a Phase-23 dependency.
- **Fork (`packages/shims/pi-acp`):** full control and deterministic timeline for the
  Phase-27 fixes; cost is ongoing divergence maintenance against upstream `pi-acp` and
  `pi --mode rpc` changes. Best reserved as the fallback if upstream stalls.

## Consequences

- Phase 23/25 refinement (the STEP-22-05 post-gate follow-up) should encode the honest
  UI copy: Pi self-approves permissions (informational trust badge, not a gate); MCP
  injection unavailable for Pi; no client fs/terminal delegation for Pi.
- **Phase 27 must treat MCP-over-`session/new` as unavailable for Pi members** until the
  adapter is fixed; its bus tiers need a non-MCP fallback for Pi, or must wait on the
  fork/upstream fix. This is the single biggest downstream consequence.
- Phase 24/25 can rely on `session/load` config options + `session/set_mode` for Pi
  model + thinking-level selection (no bespoke wiring needed).
- Revisit trigger: **re-open this decision when upstream pi lands native `--mode acp`,
  or when Phase 27 (groups/bus) work begins — whichever comes first.** Re-validate the
  pinned `pi-acp` version at that time.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]]
- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05]]
- Boundary: [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]
- Next phase affected: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-07-15 - Created as `proposed`. STEP-22-05 spike evidence recorded; phased-hybrid recommendation (adopt-now / contribute-upstream-before-Phase-27) proposed for human ratification.
<!-- AGENT-END:decision-change-log -->
