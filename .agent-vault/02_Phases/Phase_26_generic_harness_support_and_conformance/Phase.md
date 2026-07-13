---
note_type: phase
template_version: 2
contract_version: 1
title: Generic Harness Support and Conformance
phase_id: PHASE-26
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 26 Generic Harness Support and Conformance

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Generic Harness Support and Conformance milestone.
- Make "bring your own ACP harness" real: custom harness editor for launch specs (command/args/env), capability overrides, and quirk flags.
- Ship the ACP conformance smoke-runner ("test my harness") — the mock-agent scenario suite inverted to probe any configured agent binary.
- Integrate the official ACP Registry catalog for one-click harness adds, with a bundled static snapshot fallback (the connector-catalog lesson: remote catalogs fail; fail to builtin data). Document adding Gemini CLI, claude-code-acp, and codex-acp.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Custom harness editor: create/edit HarnessDefinitions (command, args, env, cwd template), capability overrides, quirk flags; persisted to `harnesses.json`.
- Conformance smoke-runner: spawn a configured harness, run a scripted probe (initialize, session/new, trivial prompt, cancel), report capability + behavior findings; usable from Settings ("Test this harness").
- ACP Registry integration: fetch the official registry catalog for one-click adds; bundled static snapshot fallback when offline/unreachable (mirrors the old builtin-catalog fallback lesson).
- Docs: "Add your own harness" guide with worked examples for Gemini CLI, claude-code-acp, and codex-acp.
- Registry entries carry install hints (e.g., `npx …`) but srgnt does not install harnesses itself in this phase — detection + guidance only.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- A marketplace or curated store — the registry is a catalog with install hints, nothing more.
- srgnt-managed harness installation/updates (the old connector-install machinery is gone deliberately; harnesses are user-installed CLIs).
- Full protocol conformance certification — the smoke-runner probes practical capability, not spec completeness.
- Per-harness bespoke UI beyond capability-driven degradation.

## Dependencies

- Depends on [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]].
- Requires PHASE-25's lessons-learned note as the requirements input, and its capability matrix/settings surfaces to extend.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] A user can add a custom harness (command/args/env + overrides) through the UI and run a session with it — proven with at least one non-built-in real agent (e.g., Gemini CLI or claude-code-acp).
- [ ] The conformance smoke-runner produces a readable capability/behavior report for any configured harness and flags the quirks the UI will degrade around.
- [ ] Registry browse/add works online and falls back to the bundled snapshot offline.
- [ ] "Add your own harness" docs exist with three worked third-party examples.
- [ ] Custom definitions persist in `harnesses.json` and survive restart.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27 Groups v1 Multi-Harness Sessions and Bus]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- None yet.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides|STEP-26-01 Build custom harness editor with launch specs and capability overrides]]
- [ ] [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator|STEP-26-02 Build ACP conformance smoke-runner as harness validator]]
- [ ] [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback|STEP-26-03 Integrate ACP Registry catalog with bundled snapshot fallback]]
- [ ] [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples|STEP-26-04 Document adding third-party harnesses with worked examples]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Requirements input: the Phase 25 lessons-learned note. Do not start Step 01 without it.
- The connector-catalog lesson from the aggregator era applies to the ACP Registry integration: remote catalogs fail; always fall back to a bundled static snapshot (the pattern already existed in `builtinConnectorDefinitions` fallback code).
- The conformance runner is the mock-agent scenario suite inverted: same scenarios, real binary under test, findings rendered as a report instead of assertions.
- Step order: custom editor (01) → conformance runner (02) → registry integration (03) → docs (04). 02 and 03 are parallelizable.
- Candidate third-party validation targets, all ACP-registry listed: Gemini CLI (production-grade reference agent), claude-code-acp, codex-acp.
