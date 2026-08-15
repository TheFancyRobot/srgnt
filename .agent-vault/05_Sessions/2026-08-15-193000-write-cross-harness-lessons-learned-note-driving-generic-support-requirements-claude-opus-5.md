---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Write cross-harness lessons-learned note driving generic support requirements
session_id: SESSION-2026-08-15-193000
date: '2026-08-15'
status: completed
owner: claude-opus-5
branch: phase/25-step-04-lessons-learned
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
step: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]'
related_bugs: []
related_decisions:
  - '[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]]'
created: '2026-08-15'
updated: '2026-08-15'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-08-15-193000
  status: completed
  updated_at: '2026-08-15T19:30:00.000Z'
  current_focus:
    summary: Advance [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]].
    target: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]'
  resume_target:
    type: phase
    target: '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]'
    section: Context Handoff
  context_summary: >-
    STEP-25-04 complete on branch phase/25-step-04-lessons-learned — PHASE-25's
    exit artifact and PHASE-26's requirements input. Docs only: one new note,
    `06_Shared_Knowledge/cross-harness-lessons-learned.md`, plus link edits in
    the PHASE-25 and PHASE-26 phase notes and backlinks from both capture notes.
    The note compares pi (adapter-mediated) and opencode (native) on the eight
    fixed axes, records where srgnt's own data model failed (the ARCH-0009
    feedback loop), restates the DEC-0018 PHASE-27 MCP consequence, and carries
    REQ-26-01…18 — each with a requirement, an evidence pointer (committed
    fixture path, capture-note section, or a STEP-25-0x Implementation Notes
    entry) and a PHASE-26 deliverable mapping. Four unevidenced or unowned items
    are recorded as PROP-A…D outside the REQ list rather than padded into it;
    PROP-A (a generic `session/set_config_option` surface) is evidenced but owned
    by no PHASE-26 step. NOT VALIDATED - no product code changed and no test
    suite was run; validation is documentary (`vault_validate`). The lessons note
    itself is flagged by nothing. The session notes initially diverged from
    Session_Template and were brought to the full contract in this same commit, so
    the four PHASE-25 notes now carry all eleven required headings and object-shaped
    context.current_focus / context.last_action; validation is back at the vault
    baseline of frontmatter 123 / structure 229 / links 0, with nothing under
    PHASE-25 flagged.
  last_action:
    type: saved
---

# Session — STEP-25-04 cross-harness lessons-learned note

## Context

- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25]]
- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04]]
- Distills: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]] and [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture (STEP-25-01)]], plus the Implementation Notes and Outcome of STEP-25-01/02/03 and their three session notes
- Consumer: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26]] — its Dependencies section names this note

## Objective

Turn two measured harness integrations into an evidence-cited requirements document for PHASE-26, so generic support generalizes from data rather than from one anecdote.

## Planned Scope

- One shared-knowledge note comparing pi and opencode on fixed axes.
- A numbered REQ-26-xx list, each entry carrying a requirement, an evidence pointer, and a PHASE-26 deliverable.
- Wikilinks from the PHASE-25 and PHASE-26 phase notes and backlinks from both capture notes.

## Execution Log

Executed in a fresh subagent with the orchestrator holding git. No product code:
one new shared-knowledge note plus link edits.

Sources were read before drafting, and the committed fixtures were opened rather
than trusted from prose — which mattered twice. The opencode capture note quotes
`currentValue: "build"` for the mode selector, but the committed fixture stores
positional placeholders (`<group-1-currentValue>`) by design, so the note cites
the fixture for *shape* and the capture note for the observed value. And the 93
slash commands are not a list in the fixture: they are the preserved count
`availableCommandsTrimmedFrom: 93` on seq 0 of `simple-prompt.jsonl`, which is
the pointer the REQ cites.

Judgment calls taken while writing:

- **The REQ list is scoped to what a PHASE-26 deliverable can hold.** The
  sharpest finding of the phase — `configOptions` instead of `modes` — splits in
  two. The half a PHASE-26 deliverable owns (the conformance report must
  enumerate config options and flag them as unreachable) is REQ-26-18; the half
  that is a *product* surface (`session/set_config_option`) is PROP-A, marked as
  owned by no step here. Writing it as one REQ would have implied PHASE-26 had
  agreed to build it.
- **Four items are outside the REQ list on purpose.** PROP-B (`session/close` /
  `session/fork`) is evidenced only as an *advertisement* — nothing has called
  either — so it is a probe target, not a modelling requirement. PROP-C
  (per-harness permission policy) and PROP-D (mid-conversation auth) were
  deferred by decision with no Phase-25 evidence for their shape. Keychain
  storage and the ACP registry feed are listed explicitly as unevidenced.
- **The data-model failure section is written as failure.** Per the Execution
  Brief, anything in steps 01–03 that needed per-harness code belongs here as a
  requirement to eliminate it. That section names five: the closed
  `NegotiatedCapabilities` struct, the `modes`-only session surface, the
  `SChatTarget` literal union (and the `ChatView` collapse-to-mock bug it hid),
  behavior that could only be expressed as quirk strings, and an
  `rpc-authenticate` branch no shipped harness reaches. `detectCommand` is
  recorded as the counter-example where data-not-code worked.
- **Both harnesses return `configOptions`.** The spike report's probe 3 shows pi
  returning them from `session/load` too. That turns "opencode is unusual" into
  "srgnt supports the surface neither harness treats as primary", which is a
  materially stronger claim and is why REQ-26-18 exists at all.

## Findings

(Deviations from the brief, which is what this step actually learned.)

### Deviations From The Brief

- **The brief's expected-shape examples were confirmed, not copied.** It offered
  three ("editor needs `detectCommand` and env fields", "runner must probe
  permissions and MCP behaviorally", "catalog needs install hints + docsUrl") and
  said to confirm or refute them from evidence. All three survive as REQ-26-01,
  REQ-26-02, REQ-26-09/10 and REQ-26-16, each re-derived from a fixture or a
  measured probe rather than from the brief.
- **18 REQs, not a round number, and two of them are guards rather than
  features.** REQ-26-08 (no closed harness-id sets) and REQ-26-17 (the ESM/CJS
  boundary) constrain how PHASE-26 builds rather than what it builds. Both are
  evidenced by shipped bugs or shipped workarounds, so they stayed in the list;
  the alternative was leaving a regression that has already happened once
  undocumented.
- **The Validation Plan's litmus test is claimed only for the REQ list.** A
  reader holding this note plus the PHASE-26 phase note can draft PHASE-26's step
  list. It is *not* claimed that the note replaces the capture notes: the raw
  frames stay there deliberately, per the "distill, don't duplicate" constraint.

## Context Handoff

PHASE-26 Step 01 should read the REQ list before designing the custom-harness editor. PROP-A (a generic `session/set_config_option` surface) is evidenced by both harnesses but owned by no PHASE-26 deliverable and needs an owner first.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `.agent-vault/06_Shared_Knowledge/cross-harness-lessons-learned.md` (new) — the eight-axis comparison, the ARCH-0009 data-model failure section, the restated DEC-0018 PHASE-27 consequence, REQ-26-01…18 and PROP-A…D.
- `.agent-vault/06_Shared_Knowledge/opencode-acp-capture.md` — backlink to the lessons note, pointing its "Explicitly not measured" section at REQ-26-09…12.
- `.agent-vault/06_Shared_Knowledge/pi-acp-adapter-spike-report.md` — backlinks to the opencode capture and the lessons note (probes 1/2/4 → REQ-26-09/10/11).
- `.agent-vault/02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase.md` — exit-artifact link in Notes; the "lessons-learned note exists" acceptance criterion ticked.
- `.agent-vault/02_Phases/Phase_26_generic_harness_support_and_conformance/Phase.md` — the Dependencies reference becomes a real wikilink and records the gate as open; Notes gains the rough REQ→deliverable split.
- `.agent-vault/02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements.md` — status done, owner, `related_sessions`, snapshot, Implementation Notes, Session History, Outcome Summary.
- `.agent-vault/02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Implementation_Notes.md`
- `.agent-vault/02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements/Outcome.md`
- `.agent-vault/05_Sessions/2026-08-15-193000-write-cross-harness-lessons-learned-note-driving-generic-support-requirements-claude-opus-5.md` (new; this note)
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- `vault_validate` after this commit — frontmatter 123, structure 229, links 0, orphans 4 warnings, schema drift 1 warning — identical to the vault's pre-PHASE-25 baseline. Nothing under PHASE-25 is flagged.
- The four PHASE-25 session notes originally diverged from `07_Templates/Session_Template.md` (eight missing headings each, plus `context.current_focus`/`context.last_action` needing to be objects). That divergence started with STEP-25-01's note and propagated because each subsequent note was told to match it. All four were conformed in this commit, which is what returns the counts to baseline; the earlier in-flight figures (frontmatter 131, structure 260) no longer describe the tree.
- Nothing else under PHASE-25 is flagged, and `06_Shared_Knowledge/cross-harness-lessons-learned.md` is flagged by nothing — shared-knowledge notes have no template contract, so they fall in the validator's skipped set.
- `git status --short` — only the nine paths above; no product code in the diff (the docs-only requirement).
- **Not run:** every test suite. No product code changed, so `pnpm test` / `lint` / `build` would only re-prove the merged state of steps 01–03.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

None. This step changed no product code.

## Decisions Made or Updated

Four items are held as PROP-A..D outside the REQ list rather than padding it: each lacks either an owning deliverable or shape evidence. Keychain-backed secret storage and an ACP registry feed are named as explicitly unevidenced.

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- PHASE-26 (next): read the lessons note first; its REQ→deliverable split is recorded in the PHASE-26 phase note's Notes section. STEP-26-01's brief already carries "expect REQ-26-xx to refine this" markers — REQ-26-06 (per-entry `harnesses.json` tolerance) and REQ-26-07 (delta-patch vs wholesale shadow) are the two that change its shape most.
- PROP-A — a generic `session/set_config_option` surface — is evidenced by both harnesses but owned by no PHASE-26 step. It needs a step or a decision note, most naturally beside making the in-chat picker registry-driven.
- The conformance runner inherits every probe opencode still owes (permissions, `session/load`, `session/resume`, MCP passthrough, the unauthenticated wall). That is REQ-26-09…12 and 15, and it is the reason the runner is worth building rather than a nicer matrix.
- Vault hygiene, pre-existing and affecting all four PHASE-25 session notes equally: `07_Templates/Session_Template.md` demands eight headings none of them carries, and the session-context schema wants `current_focus` and `last_action` as objects, which none of them has. The second is a two-key fix per note; the first is a template-vs-practice decision.
- Manual GUI verification remains owed across phases 23–25 (carried, untouched by a docs-only step).
<!-- AGENT-END:session-follow-up-work -->

## Follow-Ups

- PHASE-26 starts from the REQ list; REQ-26-06 and REQ-26-07 are the two that
  most change STEP-26-01's shape as briefed.
- PROP-A (generic config-options surface) is evidenced but unowned — it needs a
  step or a decision note.
- The template/practice mismatch for session notes is vault-wide and pre-existing;
  it is why this note validates with eight heading errors.
- Manual GUI verification remains owed across phases 23–25.

## Completion Summary

STEP-25-04 complete. The note exists with 18 evidence-cited requirements and four explicit proposals. Not verified: nothing was executed — this is a documentation step, and every claim in the note rests on the fixtures and notes it cites rather than on a fresh measurement.
