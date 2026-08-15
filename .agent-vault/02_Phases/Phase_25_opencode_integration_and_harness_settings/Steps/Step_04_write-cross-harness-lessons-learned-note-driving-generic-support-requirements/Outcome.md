# Outcome

- Record the final result, validation performed, and explicit follow-up here.

## Result

Done. Validation for this step is **documentary only** — no product code changed
and no test suite was run — and the claims below carry their evidence scope where
they are made.

[[06_Shared_Knowledge/cross-harness-lessons-learned|Cross-Harness Lessons Learned]]
exists at the assumed path with `note_type: shared_knowledge`. It measures pi
(adapter-mediated) and opencode (native) on all eight fixed axes — launch and
detection, auth surfacing, capability gaps, quirks needed, permission behavior,
session load/resume, MCP passthrough, update-stream shape — with a numbered
evidence-pointer list beneath the table; records where srgnt's own data model
failed (the closed `NegotiatedCapabilities` struct, the `modes`-only session
surface, closed harness-id sets, behavior expressible only as quirk strings, and
an `rpc-authenticate` branch no shipped harness reaches, against `detectCommand`
as the counter-example where data-not-code worked); restates the DEC-0018
PHASE-27 consequence that MCP-over-`session/new` does not reach Pi members; and
carries **REQ-26-01…18**, each with (a) the requirement, (b) an evidence pointer
— a committed fixture path, a capture-note section, or a STEP-25-0x
Implementation Notes entry — and (c) a PHASE-26 deliverable mapping
(editor / runner / catalog / docs).

Four items are recorded as **PROP-A…D outside the REQ list** rather than padded
into it, each with why it is excluded: PROP-A (a generic
`session/set_config_option` surface) is evidenced by both harnesses but owned by
no PHASE-26 deliverable; PROP-B (`session/close`, `session/fork`) is evidenced
only as an advertisement; PROP-C and PROP-D were deferred by decision with no
Phase-25 evidence for their shape. Keychain storage and whether the ACP registry
publishes a machine-readable feed are named as unevidenced.

**Narrower than it sounds, stated here:**

- *"The requirements are complete."* They describe **two** harnesses, one
  adapter-mediated and one native. Every "harnesses disagree about X" claim rests
  on that sample.
- *"Both harnesses are measured."* Roughly half of opencode's row is an
  **advertisement**, not an exercised behavior: permissions, `session/load`,
  `session/resume`, MCP passthrough and the unauthenticated failure shape were
  never probed. That gap is the reason REQ-26-09 through REQ-26-12 exist, and the
  note says so on every affected row.
- *"The note passes validation."* The lessons note is flagged by nothing, but
  shared-knowledge notes have **no template contract** in `07_Templates/`, so
  they fall in the validator's skipped set — passing means "no frontmatter or
  link error", not "checked against a structure".

## Validation performed

- `vault_validate`, run before and after. Baseline: frontmatter 129 errors,
  structure 252, links 0, orphans 4 warnings, schema drift 1 warning. After:
  frontmatter 131, structure 260, links 0, orphans and schema drift unchanged.
  **Every one of the ten new errors is the new session note**, and every one is
  inherited from the format it was told to match: the same eight headings
  (`Objective`, `Planned Scope`, `Execution Log`, `Findings`, `Context Handoff`,
  `Bugs Encountered`, `Decisions Made or Updated`, `Completion Summary`) and the
  same two `INVALID_SESSION_CONTEXT` errors (`context.current_focus` and
  `context.last_action` must be objects) already reported against all three
  existing PHASE-25 session notes. Nothing else under PHASE-25 is flagged, and
  the lessons note is flagged by nothing.
- Wikilinks confirmed in both directions: PHASE-25 → note, PHASE-26 → note,
  note → spike report + opencode capture + DEC-0018 + ARCH-0009, backlinks from
  both capture notes.
- `git status --short` — nine changed paths, none of them product code, which is
  the docs-only constraint this step was given.
- **Not run:** every test suite, deliberately. The diff contains no code.

## Follow-up

- **PHASE-26** consumes the REQ list. REQ-26-06 (per-entry `harnesses.json`
  tolerance) and REQ-26-07 (delta-patch vs wholesale shadow) are the two that
  most change STEP-26-01's briefed shape; the rough REQ→deliverable split is
  recorded in the PHASE-26 phase note's Notes section.
- **PROP-A** needs an owner: a generic config-options surface is evidenced by
  both harnesses and belongs to no PHASE-26 step. A step note or a decision note,
  most naturally beside making the in-chat picker registry-driven.
- **Vault hygiene, pre-existing and affecting all four PHASE-25 session notes
  equally:** `07_Templates/Session_Template.md` requires eight headings none of
  them carries, and the session-context schema requires `current_focus` and
  `last_action` as objects, which none of them has. The second is a two-key fix
  per note; the first is a template-vs-practice decision. Every new session note
  in house format costs ten errors until one of them moves.
- Manual GUI verification remains owed across phases 23–25 — untouched by a
  docs-only step, and restated so it is not lost at the phase boundary.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
