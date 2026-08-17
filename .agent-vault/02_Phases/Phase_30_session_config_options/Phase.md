---
note_type: phase
template_version: 2
contract_version: 1
title: Session Config Options
phase_id: PHASE-30
status: planned
owner: ''
created: '2026-08-15'
updated: '2026-08-15'
depends_on:
  - '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0021_adopt-acp-session-config-options-and-retire-the-modes-path|DEC-0021 Adopt ACP session config options and retire the session-modes path]]'
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 30 Session Config Options

> **Execution order — read this first.** The id is `PHASE-30` because 26-29 were
> already taken; it is **not** last. This phase runs **after PHASE-26 and before
> PHASE-27**. Ids here are allocation order, not execution order. Renumbering
> 27-29 was rejected: 82 vault files reference those phase paths as validated
> wikilinks, so a cosmetic renumber is a large breakage risk for no function.

## Objective

- Make srgnt able to read and drive ACP **session config options**, the mechanism
  both shipped harnesses actually use for model and mode selection.
- Retire `readModes` / `session/set_mode` from the primary path, keeping them as
  the fallback for agents that advertise only the legacy `modes` block.
- Advertise the `session.configOptions.boolean` client capability — but only once
  the handling exists, never ahead of it.

## Why This Phase Exists

- **srgnt's model/mode selector works in exactly one case out of four.**
  `readModes` (`session-controller.ts:1344`) reads a `modes` block off the
  **`session/load`** result and `setMode` (line 1437) drives `session/set_mode`.
  - **pi, reopened session — WORKS.** `session/load` returns a `modes` block.
    This is live behavior; **preserve it and keep regression coverage** (an
    earlier draft of this note wrongly said the selector drives neither harness).
  - **pi, fresh session — dead.** No `modes` block on `session/new`.
  - **opencode, either path — dead.** It never sends a `modes` block; it sends
    `configOptions` (`model` and `mode`) from `session/new`.
  A control that works only after a session is reopened, and only for one
  harness, is worse than absent: the UI implies something it usually cannot do.
- **The current path expires on someone else's schedule.** The ACP spec states
  that Session Config Options *supersede* the Session Modes API, and that
  "dedicated session mode methods will be removed in a future version of the
  protocol". This is not a nice-to-have refactor; it is the supported surface.
- **The work is measured, not speculative.** `session/set_config_option` was
  driven successfully against opencode 1.18.18 during PHASE-26 refinement
  (2026-08-15) with params `{sessionId, configId, value}`, returning the updated
  `configOptions`. Evidence: addendum in
  [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture]].
  **Scope of that evidence:** a scripted protocol probe against one agent, one
  version. No prompt or model turn ran, no UI exists, and nothing was verified
  through a full session or by hand. UI behavior, pi's `session/load` path, and
  manual end-to-end verification are all still owed by this phase.
- PHASE-26 deliberately scoped this **out** — its conformance runner reports
  config options and flags them unreachable (REQ-26-18), and
  [[04_Decisions/DEC-0021_adopt-acp-session-config-options-and-retire-the-modes-path|DEC-0021]]
  assigned the driving surface here.

## Scope

- Read `configOptions` from `session/new` **and** `session/load` responses, and
  merge them into session state beside the existing capability model.
- Drive `session/set_config_option` (`{sessionId, configId, value}`), handling
  both `select` and boolean option types.
- Advertise `session.configOptions.boolean` in `buildClientCapabilities`
  (`packages/harness/src/acp/connection.ts`) **gated on the handling existing** —
  see the constraint below.
- Replace the chat mode selector with a config-options control driven from data:
  one control per advertised group, labelled from the group's own metadata.
- Keep `modes` / `session/set_mode` as a fallback for agents that advertise the
  legacy block and no `configOptions`. **Non-negotiable: a reopened pi session
  must keep working exactly as it does today** — this is the one live path, and
  the phase must land regression coverage for it before touching `readModes`.
- Turn STEP-26-02's "unreachable" report column into a real measured column.

## Non-Goals

- Persisting a per-project or per-harness default model/mode. Session-scoped only
  in v1; persistence is a separate decision.
- Any UI keyed on a harness id — same constraint as REQ-26-08.
- Interpreting what a group *means* (which model is "better", what a mode does).
  Groups are rendered from their own metadata; srgnt does not editorialize.
- Removing `readModes` entirely. It stays as the documented fallback.

## Dependencies

- Depends on [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26]] — its conformance runner is what verifies a harness's config-options surface, and REQ-26-08's registry-driven picker work is the natural companion to this UI.
- [[04_Decisions/DEC-0021_adopt-acp-session-config-options-and-retire-the-modes-path|DEC-0021]] — **ACCEPTED 2026-08-16**, so this phase is cleared to execute once it has step notes.
- Protocol references, re-read at execution time: `agentclientprotocol.com/protocol/v1/session-config-options` and `.../session-modes`.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] A user can change model **and** mode from within a session against opencode, and the change is reflected by the agent's returned `configOptions`.
- [ ] Pi's `configOptions` (returned from `session/load`) render through the same data-driven control with no harness-specific code.
- [ ] An agent advertising only the legacy `modes` block still works, through the fallback.
- [ ] **A reopened pi session's mode selector still works, proven by a regression test written before `readModes` is touched.** This path works today; the phase must not trade it for the new one.
- [ ] `session.configOptions.boolean` is advertised only where the handling exists, and a test asserts the advertisement matches the implementation.
- [ ] STEP-26-02's conformance report shows config options as measured rather than unreachable.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27 Groups v1 Multi-Harness Sessions and Bus]]
<!-- AGENT-END:phase-linear-context -->

> This block reflects *execution* order. The phase id (30) is allocation order only — see the banner at the top of this note.

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] — the capability-driven-degradation invariant. A control rendered from advertised `configOptions` is that invariant applied to session configuration; a dead selector reading a field no harness sends is the invariant violated.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0021_adopt-acp-session-config-options-and-retire-the-modes-path|DEC-0021]] (**ACCEPTED 2026-08-16**) — the decision that created this phase, and the record of why config options replace the modes path.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- None yet — run `/vault:plan` for this phase before execution.
<!-- AGENT-END:phase-steps -->

## Notes

- **Hard constraint, and the reason this phase exists separately from PHASE-26:**
  `session.configOptions.boolean` is a **client** capability, so an agent may
  legitimately withhold boolean config options from a client that does not
  advertise it. It must **not** be advertised before the handling exists. This
  codebase's rule is that a capability is advertised from the implementation's
  presence — `buildClientCapabilities` sets `writeTextFile: false` when the port
  lacks the method, with the comment that the alternative "would be a capability
  lie". Advertising early to make a report look better is exactly that lie.
- Until this phase lands, STEP-26-02's conformance report must state that a
  missing boolean config option measures **srgnt's under-advertisement**, not the
  agent's capability.
- Measured 2026-08-15 against opencode 1.18.18 (protocol frames only, no prompt,
  no provider tokens):
  - `session/set_config_option` `{sessionId, configId, value}` → works, returns
    updated `configOptions` (`model` and `mode` groups).
  - `session/set_mode` `{sessionId, modeId}` → **also** works. An earlier claim
    that it is "the wrong method" was wrong; prefer config options because the
    spec supersedes modes, not because `set_mode` fails.
  - First attempt used `optionId` instead of `configId` and returned
    `-32602 Invalid params` — worth remembering, because a method that exists but
    rejects bad params is easy to misread as a method that is absent.
- Sizing estimate at creation: roughly 1-2 days. The protocol change is small; the
  data-driven UI control is most of it.
- Companion opportunity: REQ-26-08 records that the in-chat harness picker is
  still not registry-driven. Both are "the chat header should be driven by data,
  not a hardcoded list" — worth doing together if scheduling allows.
