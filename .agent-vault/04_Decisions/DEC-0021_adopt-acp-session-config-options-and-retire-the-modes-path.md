---
note_type: decision
template_version: 2
contract_version: 1
title: Adopt ACP session config options and retire the session-modes path
decision_id: DEC-0021
status: proposed
decided_on: ''
owner: ''
created: '2026-08-15'
updated: '2026-08-15'
supersedes: []
superseded_by: []
related_notes:
  - '[[06_Shared_Knowledge/cross-harness-lessons-learned|Cross-Harness Lessons Learned (STEP-25-04)]]'
  - '[[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture (STEP-25-01)]]'
  - '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]'
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]'
tags:
  - agent-vault
  - decision
---

# DEC-0021 — Adopt ACP session config options and retire the session-modes path

## Status

**Proposed.** Raised 2026-08-15 during PHASE-26 refinement, when PROP-A stopped
being a guess and became a measurement. Needs a decision before any phase builds
a mode/model selector.

## Context

srgnt reads session modes through `readModes`
(`packages/desktop/src/main/chat/session-controller.ts`), which looks for a
`modes` block, and drives them with `session/set_mode`. Measured against the two
shipped harnesses, that path drives **neither**:

- **opencode 1.18.18** returns `configOptions` from `session/new` — two groups,
  `model` and `mode` — and **no `modes` block at all**. `readModes` sees nothing.
- **pi** returns `configOptions` from `session/load` (thinking levels as modes,
  plus a model list), per the STEP-22-05 spike.

So the mode selector is effectively dead for both real harnesses, while the
protocol mechanism they both actually use is unread.

Measured 2026-08-15 by driving `opencode acp` directly (protocol frames only, no
prompt, no provider tokens — addendum in the opencode capture note):

- `session/set_config_option` **works**, params `{sessionId, configId, value}`,
  and returns the updated `configOptions`.
- `session/set_mode` **also works** on opencode. An earlier claim that it is "the
  wrong method" was wrong.

The protocol's own position is the deciding input, not the measurement:

- `agentclientprotocol.com/protocol/v1/session-config-options` — "Session Config
  Options supersede the older Session Modes API." Agents in transition are
  expected to advertise `configOptions` with `category: "mode"` **alongside** the
  legacy `modes` field.
- `agentclientprotocol.com/protocol/v1/session-modes` — "Dedicated session mode
  methods will be removed in a future version of the protocol."

opencode is exactly that transitional agent: it answers both while advertising
only `configOptions`.

## The capability-advertisement wrinkle

`session.configOptions.boolean` is a **client** capability. srgnt's
`buildClientCapabilities` (`packages/harness/src/acp/connection.ts:171`)
advertises only `fs` and `terminal`, so srgnt never tells an agent it can handle
boolean config options, and an agent may legitimately withhold them.

This cannot be fixed by advertising it early. The codebase's own invariant is
that a capability is advertised **from the implementation's presence, never
optimistically** — the same file advertises `writeTextFile: false` when the port
lacks the method, with the comment that the alternative "would be a capability
lie". Advertising `configOptions.boolean` before srgnt can drive config options
would be that lie.

Consequence for PHASE-26: the STEP-26-02 conformance report must state that
boolean config options may be **absent because srgnt did not advertise support**,
not because the agent lacks them. Without that caveat the report presents a
limitation of srgnt as a measurement of the agent — the exact failure mode the
capability matrix exists to prevent.

## Options

1. **Adopt config options as the primary surface** (proposed). Advertise
   `session.configOptions.boolean` *when* the handling exists, read
   `configOptions` alongside `modes`, drive `session/set_config_option`, and keep
   `session/set_mode` only as a fallback for agents that advertise `modes` and
   nothing else. Retire `readModes` as the primary path once both shipped
   harnesses are covered.
2. **Keep the modes path, report only.** What PHASE-26 does today: the runner
   reports `configOptions` and flags them unreachable (REQ-26-18). Cheap, honest,
   and leaves the selector dead for every real harness.
3. **Do nothing.** Rejected: the protocol will remove the dedicated mode methods,
   so this path expires on someone else's schedule.

## Recommendation

**Option 1, but not inside PHASE-26.** PHASE-26 is already four steps of editor,
conformance runner, registry integration and docs. This is protocol work with its
own UI surface, and folding it in would blur two steps that were not written for
it. PHASE-26 keeps Option 2 — report and flag, with the under-advertisement
caveat stated in the report — and this decision assigns the real work to a later
phase, most naturally alongside whatever makes the in-chat harness picker
registry-driven (REQ-26-08's named debt).

## Consequences if accepted

- `buildClientCapabilities` grows `session.configOptions.boolean`, gated on the
  handling actually existing.
- A config-options surface in chat replaces the mode selector; `readModes` and
  `session/set_mode` become the compatibility fallback.
- STEP-26-02's report gains a real column rather than a permanent "unreachable".
- PHASE-24's fork and PHASE-27's groups both inherit a session whose config is
  addressable, which matters when two harnesses in a group disagree on model.

## Open question for the decider

Which phase owns it — a late PHASE-26 addition, its own phase before PHASE-27, or
folded into PHASE-27's groups work where per-session model/mode divergence
becomes visible anyway?
