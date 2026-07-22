# Validation Plan

## Commands

- No product code — validation is documentary. Vault checks only:
  - `vault_validate` (or the project's vault validation command) — new note passes schema/link integrity.
  - Grep-level check that no phase-25 code change rode along in this step's diff (docs-only step).

## Acceptance Checks

- `06_Shared_Knowledge/cross-harness-lessons-learned.md` exists with `note_type: shared_knowledge` frontmatter and covers all eight fixed axes (launch/detection, auth, capability gaps, quirks, permissions, load/resume, MCP passthrough, update-stream shape) with **both** harnesses' measured values on each.
- Every REQ-26-xx entry has (a) requirement text, (b) an evidence pointer that resolves — a fixture path that exists, a capture-note anchor that exists, **or a STEP-25-0x Implementation Notes entry** (the three forms the Execution Brief's content contract permits; all three are valid, none is rejected), (c) a PHASE-26 deliverable mapping (editor / conformance runner / catalog / docs). Only a requirement carrying *none* of the permitted evidence forms is rejected.
- Wikilinks live in both directions: PHASE-25 phase note → lessons note; PHASE-26 phase note → lessons note; lessons note → spike report + opencode capture note + DEC-0018.
- The DEC-0018 Phase-27 consequence (MCP-over-`session/new` unavailable for Pi members) is restated with its pointer — Phase 27 planning must not have to rediscover it.
- Litmus test (the real bar): a reader holding ONLY this note plus the PHASE-26 phase note could draft PHASE-26's step list without opening Phase-25 execution history. If a Phase-26-shaping fact lives only in a step's Implementation Notes, the note is incomplete.

## Edge Cases

- Findings that surfaced too late to fix in this phase (e.g. per-entry `harnesses.json` tolerance, delta-overrides, per-harness permission-policy defaults deferred in STEP-25-02) → they belong HERE as requirements or explicit open decisions, not silently dropped.
- Contradictions between the spike report and later observation (e.g. a pi-acp behavior changed under a newer pi) → record both with dates; flag the DEC-0018 revisit trigger if the pin was bumped.
- If opencode earned any quirk or override, verify the corresponding STEP-25-01 definition change actually landed and is cited — the note must not claim data the code doesn't carry.

## Regression Expectations

- No code diffs; all suites trivially green. Phase acceptance criterion "Lessons-learned note exists … enumerates concrete Phase 26 requirements" tickable.
- PHASE-26 phase note gains only links (its refinement is its own future pass — do not expand its scope from here).

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
