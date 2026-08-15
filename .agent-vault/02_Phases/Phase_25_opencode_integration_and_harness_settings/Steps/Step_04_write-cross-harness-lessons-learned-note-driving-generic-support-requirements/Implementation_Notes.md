# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## Execution 2026-08-15

**What shipped**

- `.agent-vault/06_Shared_Knowledge/cross-harness-lessons-learned.md` (new) — the assumed path held. Sections: purpose + evidence rule; the eight fixed axes as one table with a numbered evidence-pointer list beneath it; "the single sharpest divergence: modes"; "where the data model failed — the ARCH-0009 feedback loop"; the restated DEC-0018 PHASE-27 consequence; **REQ-26-01…18**; **PROP-A…D**; "what this note does not establish".
- Link edits: PHASE-25 phase note (exit-artifact bullet in Notes, acceptance criterion ticked), PHASE-26 phase note (Dependencies wikilink made real + a rough REQ→deliverable split in Notes), backlinks from `opencode-acp-capture.md` and `pi-acp-adapter-spike-report.md`. The spike report also gained the missing forward link to the opencode capture.

**Findings from re-reading the evidence (not from the briefs)**

- **Both harnesses return `configOptions`.** opencode from `session/new` (`packages/harness/src/testing/fixtures/opencode/initialize.json` → `sessionNew.configOptions`: a `model` and a `mode` selector, no `modes` block) and pi from `session/load` (`fixtures/pi-spike/spike-frames.json` → `probe3_session_load_response_trimmed`: `configOptions` plus a mirrored `modes` block). srgnt reads only `modes` (`packages/desktop/src/main/chat/session-controller.ts:691`), so it supports the surface neither harness treats as primary. That is a stronger claim than "opencode is unusual" and it is why REQ-26-18 exists.
- **The 93 slash commands are a preserved count, not a list.** `fixtures/opencode/simple-prompt.jsonl` seq 0 carries `availableCommandsTrimmedFrom: 93` with three placeholder entries — the fixture pins shape and count by design. Cited that way in REQ-26-13.
- **The opencode fixture's config-option values are positional placeholders** (`<group-1-currentValue>`), so the capture note's `currentValue: "build"` is the observed value and the fixture is the shape evidence. Both are cited, for the thing each actually proves.
- **`resume` is advertised by opencode and never exercised**, and `close`/`fork` likewise. Written as advertisement everywhere, which is why modelling them is PROP-B (a probe target) rather than a REQ.

**Design calls made while writing**

- The REQ list is scoped to what a PHASE-26 deliverable can hold. The `configOptions` finding splits: the report half is REQ-26-18 (**[runner]**), the product surface (`session/set_config_option`) is PROP-A and explicitly owned by no PHASE-26 step.
- Four items sit outside the REQ list rather than padding it: PROP-A (evidenced, unowned), PROP-B (advertised only), PROP-C (per-harness permission policy — deferred by decision, shape unevidenced), PROP-D (mid-conversation auth — no harness has demonstrated it). Keychain storage and the ACP registry feed are named as unevidenced.
- Two REQs are guards rather than features and say so: REQ-26-08 (no closed harness-id sets — `SChatTarget` had to widen, and `ChatView` shipped a collapse-to-mock bug that defeated STEP-25-02's own feature) and REQ-26-17 (the ESM/CJS boundary and the injectable `loadHarness`).
- The data-model failure section names five gaps plus one counter-example (`detectCommand`, where data-not-code worked), per the Execution Brief's instruction that per-harness code must appear as a requirement to eliminate it.

**Validation**

- `vault_validate` after this commit — frontmatter 123, structure 229, links 0, orphans 4 warnings, schema drift 1 warning — identical to the vault's pre-PHASE-25 baseline. Nothing under PHASE-25 is flagged. The four PHASE-25 session notes were conformed to `07_Templates/Session_Template.md` in the same commit (eleven headings each, object-shaped `context.current_focus`/`context.last_action`), which is what clears the deltas seen mid-step. The lessons note itself is flagged by nothing, but shared-knowledge notes have no template contract in `07_Templates/` and fall in the validator's skipped set — "passes" there means no frontmatter or link error, not "checked against a structure".
- No product code in the diff, so no test suite was run — `git status --short` is the check that the docs-only constraint held.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
