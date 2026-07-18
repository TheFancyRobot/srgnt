# Execution Brief

## Why

- The phase note is explicit: this phase's real product is the *pattern*, and this note is the exit artifact. Two measured integrations exist after steps 01–03 — Pi (adapter-mediated, three earned quirks, pinned version) and opencode (native, capabilities from live negotiation) — and PHASE-26 (custom harness editor, conformance smoke-runner, registry catalog) explicitly depends on this note as its requirements input. Without it, Phase 26 would generalize from one anecdote.
- The discipline is "anecdotes → requirements, traceable to observations": every requirement must cite a measured behavior (fixture path, capture-note anchor, or Implementation Notes entry). No speculation — that is this step's validation bar, and it is what keeps Phase 26 honest.

## Prerequisites

- STEP-25-02 and STEP-25-03 complete (dependency list), which transitively means 01's captures exist. Concretely, gather before writing:
  - [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (the Pi side of every comparison).
  - `06_Shared_Knowledge/opencode-acp-capture.md` (STEP-25-01's output — the opencode side).
  - Fixtures: `packages/harness/src/testing/fixtures/pi/`, `fixtures/pi-spike/spike-frames.json`, `fixtures/opencode/`.
  - Implementation Notes + Outcome sections of STEP-25-01/02/03 (detection surprises, PATH issues, auth-required error shape, override-semantics friction, anything that required code instead of data).
  - [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (the Phase-27 MCP consequence must be restated, not rediscovered) and the PHASE-26 phase note (the deliverables the requirements must map onto).

## Likely Code Paths

- No product code. One new vault note + link edits:
  - `06_Shared_Knowledge/cross-harness-lessons-learned.md` (**recorded assumption on name/location**; `note_type: shared_knowledge` frontmatter like the spike report).
  - Link it from the PHASE-25 phase note (Notes/Related) and from the PHASE-26 phase note (Dependencies already name it conceptually — make the wikilink real), plus backlinks from the opencode capture note.

## Note Content Contract

Comparison table (or per-axis sections) measuring **both** harnesses on the same axes — these axes are fixed; add more only with evidence:

1. **Launch & install/detection** — adapter via pinned `npx pi-acp@0.0.31` vs native user-installed binary; what version pinning even means for each (launch-pinned vs tested-version constant); `detectCommand` ≠ `launch.command` for Pi; PATH reality in packaged Electron.
2. **Auth surfacing** — advertised `authMethods` (pi: `pi_terminal_login`; opencode: as captured); what an auth failure actually looks like on the wire (the SDK error shape recorded in 25-03); what UX was needed (external terminal flow + retry).
3. **Capability gaps** — negotiated row vs actual behavior; capabilities the model had to grow this phase (`authMethods`, `sessionList`); init-negotiated vs discovered-mid-session split (`modes`, `slashCommands`).
4. **Quirks needed** — Pi's earned three (+ what earned them); opencode's measured set (target: zero — if any were earned, each is a headline finding).
5. **Permission behavior** — round-trip vs self-approval (spike probe 1 vs opencode's observed `session/request_permission` traffic); option kinds seen in practice.
6. **Session load/resume** — per-harness `session/load`/`session/resume` reality mapped to PHASE-24's capability-gated resume branches (`resumeSession` → `loadSession` → read-only+fork).
7. **MCP passthrough** — Pi clamped (probe 2); opencode measured; restate the DEC-0018 Phase-27 consequence.
8. **Update-stream shape** — update kinds observed per harness (spike's distribution vs opencode's capture); anything ChatView needed specially.

Then the deliverable that makes it a requirements document: a numbered list (**REQ-26-01…n**), each entry carrying (a) the requirement, (b) the evidence pointer, (c) which PHASE-26 deliverable it lands on (custom-editor field / conformance-runner probe / registry-catalog metadata / docs). Expected-shape examples the executor should confirm or refute from evidence — not pre-write: the editor needs `detectCommand` and env fields because Pi/detection needed them; the conformance runner must probe permission round-trips and MCP passthrough *behaviorally* because initialize advertises both dishonestly for Pi; catalog entries need install hints + docsUrl because srgnt never installs.

## Key Design Constraints

- Every requirement traceable to an observation — a requirement without an evidence pointer gets cut or explicitly marked as a proposal outside the REQ list.
- Distill, don't duplicate: link the spike report and capture note for raw payloads; this note carries comparisons and requirements, not frame dumps.
- Cover the failure of the data model too: if anything in steps 01–03 required per-harness *code* (a special case keyed on id, a bespoke error branch), it must appear here as a requirement to eliminate it — that is the ARCH-0009 feedback loop.
- Step notes across this phase stay the source for execution history; this note is the durable cross-phase artifact.

## Execution Checklist

1. Re-read all gathered sources; extract per-axis facts for both harnesses with pointers.
2. Draft the note: comparison axes → findings → REQ list mapped to PHASE-26 deliverables.
3. Add the wikilinks (PHASE-25 note, PHASE-26 note, capture-note backlink).
4. Self-check every REQ for an evidence pointer; cut or downgrade the rest.
5. Update this step's Outcome + Snapshot; tick the phase acceptance criterion.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- Consumer: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]]; `06_Shared_Knowledge/opencode-acp-capture.md` (created by STEP-25-01)
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (Phase-27 MCP consequence to restate)
