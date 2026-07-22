---
note_type: phase
template_version: 2
contract_version: 1
title: Opencode Integration and Harness Settings
phase_id: PHASE-25
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24 Projects and Session Persistence]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
  - '[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy (accepted 2026-07-15: adopt pinned pi-acp@0.0.31 for phases 23-24)]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 25 Opencode Integration and Harness Settings

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Opencode Integration and Harness Settings milestone.
- Integrate opencode (native `opencode acp`) as the second harness, with capabilities detected at runtime rather than hardcoded.
- Build the harness settings UI (binary paths, env, per-project harness defaults) and the per-harness capability matrix view; surface `authenticate`/auth errors with actionable docs links.
- Produce the cross-harness lessons-learned note comparing Pi and opencode integration reality — it becomes the requirements input for Phase 26 generic support.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24 Projects and Session Persistence]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Built-in opencode HarnessDefinition (`opencode acp`), binary detection, version probing, runtime capability negotiation (do not hardcode `loadSession`/modes — read the `initialize` response).
- Harness settings UI: binary path override, env vars, per-project default harness, per-harness permission policy defaults.
- Capability matrix view in Settings: what each configured harness supports (load/resume, modes, slash commands, images, MCP transports), driven by live negotiation results.
- Auth: surface `authenticate` flows and auth failures with harness-specific guidance links.
- Fixture capture for opencode traffic; extend contract tests to two real harnesses.
- Exit artifact: lessons-learned note (Pi vs opencode integration deltas) that seeds Phase 26 requirements.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- Generic/custom harness support (Phase 26) — opencode is a built-in definition.
- Managing opencode's own configuration (models, providers, MCP servers) — srgnt configures the launch, not the harness's internals.
- Installing harnesses on the user's behalf — detection and guidance only.
- Groups across the two harnesses (Phase 27).

## Dependencies

- Depends on [[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24 Projects and Session Persistence]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (capability-driven UI invariant).
- Requires PHASE-24's per-project defaults and persistence (harness settings write into project/workspace stores).
- Prerequisite tooling: opencode installed locally by the executor (re-verified NOT on PATH 2026-07-17; STEP-25-01 treats installation as a real precondition — srgnt the product only detects and guides).

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] With opencode installed, a project can run Pi and opencode sessions side by side; capability differences render as visible degradation, never silent failure.
- [ ] Capability matrix reflects live `initialize` negotiation per harness; nothing is hardcoded per harness beyond the launch spec.
- [ ] Harness settings persist (binary path, env, per-project default) and take effect on next spawn.
- [ ] Auth failures surface actionable guidance; `authenticate` flow works where required.
- [ ] opencode traffic fixtures added; contract tests pass against both harnesses.
- [ ] Lessons-learned note exists in the vault and enumerates concrete Phase 26 requirements.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24 Projects and Session Persistence]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]] (ACCEPTED 2026-07-15) — sets the Pi contrast this phase measures opencode against: Pi's measured row (loadSession true, resume false, mcpServers clamped, self-approving permissions) is the known half of the capability matrix; the revisit trigger (native `--mode acp` / Phase 27) is a lessons-learned data point.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]
- [ ] [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]
- [ ] [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]
- [ ] [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- opencode ground truth (2026-07-10): native `opencode acp` subprocess over stdio; supports its tools, MCP servers, permission system via ACP; `session/load` not documented — capability detection at runtime is the rule this phase establishes for all harnesses. Not installed locally yet (install is a step prerequisite).
- This phase is deliberately small: its real product is the *pattern* — second-harness reality check + the lessons-learned note that turns anecdotes into Phase 26 requirements.
- Step order: opencode definition + detection (01) → settings UI (02) and capability matrix + auth surfacing (03) in parallel → lessons-learned note (04, last).
- Validation: side-by-side Pi + opencode sessions in one project; capability matrix cross-checked against each harness's `initialize` response; fixtures for opencode traffic added to contract tests.
- Refinement pass 2026-07-17 (post-DEC-0018 reconciliation) — grounded facts, recorded assumptions, and open decisions; details live in each step's Execution Brief:
  - `which opencode` re-verified empty on this machine (2026-07-17). STEP-25-01 treats install as an executor precondition (default `npm i -g opencode-ai`, method + exact version recorded) and renders the product-side reality through `registry/detect.ts`'s typed `ok`/`probe-failed`/`not-installed` states. srgnt never installs (non-goal intact).
  - Capability capture copies the STEP-22-03 pattern: gated `opencode.integration.test.ts` behind `SRGNT_IT_OPENCODE=1` (mirrors `SRGNT_IT_PI=1`), fixtures under `testing/fixtures/opencode/`, findings written to a new `06_Shared_Knowledge/opencode-acp-capture.md` that feeds STEP-25-04. opencode starts with zero quirks/overrides — earned only from measured probes (deliberate contrast with Pi's research-pre-declared quirks).
  - Grounded model gaps to close in STEP-25-01: `NegotiatedCapabilities` lacks `authMethods` and `sessionList` (both observed in the pi spike); `SHarnessDefinition` lacks a `detectCommand` field (Pi launches `npx` but detects `pi` — currently hardcoded in `detectPi`).
  - Capabilities persistence (matrix data source): new runtime capability cache writing workspace `harness-capabilities.json` (assumption — separate file beside `harnesses.json`, not inside the `SDesktopSettings`-schema'd `settings.json`); desktop main writes through after each successful connect; cache is display data only, never a live-session source of truth.
  - Settings overrides ride the shipped registry semantics: workspace `harnesses.json` entries shadow built-ins wholesale (last-write-wins) — UI writes a full edited copy, "Reset to built-in" deletes it, shadowed built-ins get an "overridden" badge (they stop tracking built-in updates, e.g. a `PI_ACP_VERSION` bump, until reset).
  - Auth v1 scope (assumption): terminal-type auth methods (pi `pi_terminal_login`, opencode's login flow) are external — AuthPanel shows a copyable command + docs link + Retry; `authenticate(methodId)` is called only for non-interactive methods; srgnt never collects credentials in its own UI. Executor must verify the SDK 1.2.1 auth-required error shape before wiring detection. Mock agent gains an `authRequired` scenario directive for E2E.
  - Decision needed (non-blocking, defaults recorded in the briefs): capability-cache file name/placement (default `harness-capabilities.json` at workspace root); override mechanics (default wholesale-shadow per current registry, delta-patch deferred to Phase 26 if lessons demand it); per-harness permission policy defaults (default DEFER to Phase 26 — per-project `permissionPolicy` from STEP-24-02 stays the only relaxation surface this phase).
  - STEP-25-04's note is named `06_Shared_Knowledge/cross-harness-lessons-learned.md` (assumption) with fixed comparison axes for BOTH harnesses — launch/install+detection, auth surfacing, capability gaps, quirks needed, permission behavior, session load/resume, MCP passthrough, update-stream shape — distilled into evidence-cited REQ-26-xx entries mapped to PHASE-26 deliverables (editor / conformance runner / catalog / docs).
