# Implementation Notes

- Release QA should exercise the real wedge, not only technical diagnostics.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Onboarding flow in `packages/desktop/renderer/` — first-run screens covering: workspace creation/selection, connector status overview, core workflow entry point
- Settings UI in `packages/desktop/renderer/` — organized settings panel for: workspace path, connector configs, telemetry opt-in/out, update channel selection
- Release QA checklist document in `.agent-vault/06_Shared_Knowledge/release-qa-checklist.md` — structured test matrix covering:
  - Packaging: install/uninstall on macOS, Windows, Linux
  - Onboarding: first-run flow completes without confusion
  - Connectors: fixture-backed connector status works offline by default, with an optional live-auth smoke path for Teams when credentials are available
  - Flagship workflow: end-to-end happy path works
  - Terminal integration: terminal launches and commands execute
  - Crash handling: error boundary shows fallback, crash log is written
  - Auto-update: update check fires (even if no update available)
- Performance benchmark baselines: startup time, memory usage at idle, memory after 1hr usage (documented, not necessarily automated)
- Accessibility audit notes: keyboard navigation through main flows, screen reader landmark check, contrast ratio spot-check

**Key decisions to apply:**
- DEC-0003 (Teams first) — onboarding must show Teams connector setup prominently; Slack is secondary
- DEC-0004 (all three platforms) — QA matrix must cover all three platforms, not just the dev's primary OS
- DEC-0007 (markdown/Dataview data layer) — settings that persist must be stored in markdown/YAML files in the workspace, not in a separate database

**Starting files:**
- STEP-08-01 packaging pipeline must be complete (installable builds to test against)
- STEP-08-02 crash handling must be complete (QA checklist validates crash behavior)
- `packages/desktop/renderer/` must have the core UI shell from earlier phases
- Flagship workflow from PHASE-05 must be functional

**Constraints:**
- Do NOT add premium/Fred features to onboarding — base product only
- Do NOT skip any of the three platforms in the QA matrix — all three are first-class (DEC-0004)
- Do NOT automate performance benchmarks in this step — document baselines manually; automation is future work
- Do NOT block release on accessibility perfection — document findings and classify as release-blocker vs. follow-up

**Validation:**
1. Fresh install on each platform → onboarding flow launches → workspace is created → main UI appears
2. Settings panel opens → all settings are editable → non-secret settings persist after app restart (verify in workspace config files), while secrets remain in secure storage and only references appear on disk
3. Release QA checklist exists and covers all 7 areas listed above
4. Each QA checklist item has a PASS/FAIL/BLOCKED status for each of the 3 platforms
5. Performance baselines are documented with explicit PASS/FLAG/BLOCKED notes; at minimum record cold start time, idle memory, and one-hour memory delta, and treat crashes, UI hangs, or obvious memory growth as blockers even if no numeric threshold has been approved yet
6. Accessibility audit notes exist with at least: keyboard nav results, screen reader results, contrast findings

**Junior-readiness verdict:** PASS — this is primarily UI polish and test documentation work. The QA checklist is the most critical artifact and its structure is well-defined. The main risk is insufficient platform coverage (testing only on the dev's OS). Mitigate by requiring the QA matrix to have explicit entries for all three platforms, with BLOCKED status acceptable where hardware is unavailable.

## Related Notes

- Step: [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa|STEP-08-03 Polish Onboarding Settings And Release QA]]
- Phase: [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
