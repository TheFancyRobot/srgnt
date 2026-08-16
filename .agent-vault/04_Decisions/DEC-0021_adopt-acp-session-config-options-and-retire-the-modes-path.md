---
note_type: decision
template_version: 2
contract_version: 1
title: Adopt ACP session config options and retire the session-modes path
decision_id: DEC-0021
status: accepted
decided_on: '2026-08-16'
owner: matthew
created: '2026-08-15'
updated: '2026-08-16'
supersedes: []
superseded_by: []
related_notes:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
  - '[[02_Phases/Phase_30_session_config_options/Phase|PHASE-30 Session Config Options]]'
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

**ACCEPTED 2026-08-16** by Matthew. Raised 2026-08-15 during PHASE-26 refinement,
when PROP-A stopped being a guess and became a measurement.

Accepted position: **Option 1 — adopt config options as the primary surface,
executed as [[02_Phases/Phase_30_session_config_options/Phase|PHASE-30]]**, which
runs between PHASE-26 and PHASE-27. PHASE-26 itself is unchanged by this: it still
only *reports* config options (REQ-26-18), with the under-advertisement caveat.

## Context

srgnt reads session modes through `readModes`
(`packages/desktop/src/main/chat/session-controller.ts:1344`), which looks for a
`modes` block on the **`session/load`** result, stores the ids, and drives them
with `session/set_mode` (`setMode`, line 1437).

**Corrected 2026-08-16 after review — an earlier draft of this note claimed the
path drives "neither harness". That was wrong.** The accurate position:

- **pi, reopened session: works.** `session/load` returns a `modes` block, so a
  reopened pi session has a live mode selector today. **This is working behavior
  with real users and must be preserved, with regression coverage**, not
  refactored away.
- **pi, fresh session: dead.** A `session/new` session has no `modes` block to
  read, so the selector has nothing until the session is reopened.
- **opencode: dead everywhere.** It returns `configOptions` from `session/new` —
  `model` and `mode` groups — and **no `modes` block at any point**. `readModes`
  sees nothing, ever.

So the gap is narrower than first stated but still real: the selector works for
exactly one harness in exactly one lifecycle path, while the mechanism both
harnesses actually advertise goes unread.

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

1. **Adopt config options as the primary surface** — **CHOSEN**. Advertise
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

## Consequences — now committed

- `buildClientCapabilities` grows `session.configOptions.boolean`, gated on the
  handling actually existing.
- A config-options surface in chat replaces the mode selector; `readModes` and
  `session/set_mode` become the compatibility fallback.
- STEP-26-02's report gains a real column rather than a permanent "unreachable".
- PHASE-24's fork inherits a session whose config is addressable.
- PHASE-27's groups give **each member its own ACP session**, so configuration
  becomes addressable **per member ACP session** — which is what makes two
  members disagreeing on model a thing the user can actually see and change,
  rather than an invisible property of whichever process answered.

## Owner — assigned 2026-08-15, accepted 2026-08-16

**Its own phase, executing between PHASE-26 and PHASE-27:**
[[02_Phases/Phase_30_session_config_options/Phase|PHASE-30 Session Config Options]].

The id is 30 only because 26-29 were already allocated; execution order is
26 → **30** → 27, stated in all three phase notes. Renumbering 27-29 to make the
ids sequential was rejected — 82 vault files reference those phase paths as
validated wikilinks, so it is a large breakage risk for a cosmetic gain.

Rejected alternatives:

- **Fold into PHASE-26.** That phase is already editor + conformance runner +
  registry + docs; this is protocol work with its own UI surface and would blur
  two steps not written for it.
- **Fold into PHASE-27 (groups).** Groups need it — two harnesses in one session
  will disagree on model — but burying a standalone fix inside a much larger
  phase makes it the first thing cut if PHASE-27 runs long.

Accepted 2026-08-16, so PHASE-30 is cleared to execute once it has step notes
(`/vault:plan PHASE-30`).
