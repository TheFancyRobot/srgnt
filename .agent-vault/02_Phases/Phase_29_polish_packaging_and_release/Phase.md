---
note_type: phase
template_version: 2
contract_version: 1
title: Polish Packaging and Release
phase_id: PHASE-29
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-21'
depends_on:
  - '[[02_Phases/Phase_28_reusable_group_pipelines/Phase|PHASE-28 Reusable Group Pipelines]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 29 Polish Packaging and Release

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Polish Packaging and Release milestone.
- Rewrite onboarding around the new product: detect installed harnesses, offer install hints, and walk through a first session.
- Hardening for release: settings consolidation, long-transcript virtualization, packaging matrix (mac/linux first-class, Windows best-effort), refreshed docs, LICENSE posture review, and the release checklist.
- Stretch: semantic search across session transcripts + notes using the parked in-app subsystem (the embedding model re-enters packaged artifacts only when this ships).

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_28_reusable_group_pipelines/Phase|PHASE-28 Reusable Group Pipelines]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Onboarding rewrite: harness detection (pi/opencode/registry entries on PATH), install hints, workspace setup (reusing the improved choose-or-default flow), first-session walkthrough.
- Settings consolidation: harnesses, permissions, projects, appearance in one coherent surface.
- Performance: long-transcript virtualization in ChatView; event-log read paths measured against large sessions.
- Packaging matrix: mac (dmg x64+arm64) and linux (AppImage + rpm) first-class; Windows best-effort with known stdio/pty caveats documented.
- Docs refresh: README, TESTING.md, website copy; LICENSE posture review before any public release.
- Release checklist: `release:check:repo` equivalent updated for the new E2E coverage matrix (chat, persistence, groups, pipelines).
- Stretch: semantic search over transcripts + notes via the parked runtime subsystem; the bundled model returns to `extraResources` only with this feature.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- New feature surface area beyond the stretch search item — this phase hardens what exists.
- Windows first-class support (best-effort with documented caveats).
- Remote/cloud transports, telemetry expansion, or premium tiers.
- Marketing site build-out beyond copy refresh.

## Dependencies

- Depends on [[02_Phases/Phase_28_reusable_group_pipelines/Phase|PHASE-28 Reusable Group Pipelines]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]].
- Requires phases 22–28 feature-complete; this phase hardens and packages, it does not build new surface (stretch search item excepted).

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] Fresh-machine onboarding: detects installed harnesses, guides install for missing ones, creates workspace, and lands the user in a working first session.
- [ ] 10k-message transcript scrolls smoothly (virtualized) and loads in acceptable time from JSONL.
- [ ] mac + linux packaged builds pass the packaged E2E smoke; Windows build produced with documented caveats.
- [ ] Release checklist (build, typecheck, unit, E2E, packaged smoke across the new coverage matrix) passes end to end.
- [ ] Docs (README, TESTING, site copy) describe the shipped product; LICENSE posture reviewed and recorded as a decision.
- [ ] If the stretch ships: transcript/notes semantic search behind a working UI with the model re-bundled; otherwise the model stays unbundled.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|PHASE-28 Reusable Group Pipelines]]
- Current phase status: planned
- Next phase: not planned yet.
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
- [ ] [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough|STEP-29-01 Rewrite onboarding with harness detection and first-session walkthrough]]
- [ ] [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_02_consolidate-settings-and-virtualize-long-transcripts|STEP-29-02 Consolidate settings and virtualize long transcripts]]
- [ ] [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort|STEP-29-03 Ship packaging matrix for mac linux and windows best-effort]]
- [ ] [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture|STEP-29-04 Refresh docs and license posture]]
- [ ] [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix|STEP-29-05 Assemble release checklist and updated E2E coverage matrix]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Dev machines span macOS (current) and Linux (`.pi/SYSTEM.md` references a Linux checkout); CI E2E is Linux — both stay first-class through every phase, so this phase's packaging work is consolidation, not rescue.
- Windows caveats to document: stdio agent spawning quirks, ConPTY behavior, path handling in HarnessDefinitions.
- The semantic-search stretch reuses the parked runtime subsystem (phases 15–18 work) pointed at transcripts + notes; decision log D15 governs re-bundling the model.
- LICENSE.md predates the pivot; review before any public release and record the outcome as a decision note.
- Step order: onboarding (01) → settings + perf (02) → packaging (03) → docs (04) → release checklist (05); stretch runs opportunistically.
- Exit = releasable: `release:check:repo` pipeline green across the updated coverage matrix.
- Refinement pass 2026-07-21 (all 10 step companions filled to junior-executable depth; details live in each step's Execution Brief / Validation Plan):
  - **STEP-29-01 real blockers** are Phase 23 (chat/first-session) and Phase 25 (registry/harness settings), though the vault `depends_on` is empty — confirm both merged before execution. The REAL onboarding flow is inline in `main.tsx` (`onboardingFlow` useMemo), not `Onboarding.tsx`'s unused `defaultOnboardingSteps`; e2e `fixtures.ts` `completeOnboarding` hard-codes heading strings and MUST be updated in lockstep with any step rename.
  - **STEP-29-03 critical constraint (encoded):** `@srgnt/harness` is ESM-only and desktop-main is CommonJS; the packaged Electron's bundled Node can `ERR_REQUIRE_ESM` where dev does not, and tsc/build success never catches it. The packaged smoke MUST open a real harness-backed (mock) session, not just assert onboarding renders (current `packaged.spec.ts` only does the latter). Bundled bus-server bin (`harness/src/groups/bus-server/bin.ts`) must be verified present + spawnable (asar/asarUnpack) in every artifact. Release workflow triggers stay `v*` + `workflow_dispatch` ONLY — do not re-add PR/push-to-main.
  - **STEP-29-04 license:** LICENSE.md is BSL 1.1 (Licensor "The Fancy Robot, LLC", Change Date 2029-03-29 → MPL 2.0) but `build-fedora-rpm.sh`'s rpm spec declares `License: UNLICENSED` — reconcile. Actual public-release license posture is a human decision this step RECORDS (default: document current BSL 1.1 + flag "confirm before public release"). README still stale-claims harness is "planned for Phase 22 and does not exist yet".
  - **STEP-29-05:** re-audit the three carried baseline E2E failures (app.spec PTY `posix_spawnp`; gfm ATX `.cm-header-*` — mitigated by PR #14 auto-retry `retries: 2`; bug-0013-visual Linux-only binary off-Linux) — fix or record acceptance; no silent known-failures in the gate. Add Phase 23-28 specs (chat/persistence/groups/pipelines) to `test:e2e`/`test:e2e:full`.
  - Decisions-needed recorded across the briefs (non-blocking for refinement): STEP-29-02 virtualization lib vs. hand-rolled (default: `@tanstack/react-virtual`); STEP-29-03 bus-bin `asarUnpack` vs `extraResources` (default: `asarUnpack`); STEP-29-04 public license posture (human owner); STEP-29-05 fix-vs-accept per baseline failure.
