# Implementation Notes

- Artifact-aware context is part of the product value, not just a convenience wrapper.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Launch action system in `packages/runtime/src/launch/` — workflow surfaces can trigger terminal sessions with structured context
- **Context payload shape (defined here, was TBD):**
  ```typescript
  // LaunchContext — schema contract in packages/contracts/
  {
    launchId: string;           // unique ID for this launch
    sourceWorkflow: string;     // e.g., "daily-briefing", "calendar-triage"
    sourceArtifactId?: string;  // artifact that triggered the launch (if any)
    sourceRunId?: string;       // run ID from the generating workflow
    workingDirectory: string;   // where to open the terminal
    command?: string;           // pre-filled command (user must still approve)
    env?: Record<string, string>; // additional env vars (no secrets — redacted)
    labels?: string[];          // human-readable labels for the launch context
    createdAt: string;          // ISO timestamp
  }
  ```
- `packages/runtime/src/launch/templates.ts` — approved launch templates and `LaunchIntent` classification (`readOnly`, `artifactAffecting`) used to decide whether STEP-07-03 approval is required
- Launch action UI in `packages/desktop/src/renderer/components/TodayView.tsx` — Jira task rows can hand off a `LaunchContext` into the terminal route
- IPC channel `terminal:launch-with-context` in preload/main/renderer types — accepts `{ launchContext, rows, cols }`, validates it at the contract boundary, and spawns the PTY session with the supplied workspace context
- Terminal routing in `packages/desktop/src/renderer/main.tsx` and `packages/desktop/src/renderer/components/TerminalPanel.tsx` — the terminal view consumes the pending `LaunchContext`, opens that session instead of a fresh orphaned shell, and shows workflow/artifact/directory context in the panel
- Tests: launch-context contract validation plus renderer test coverage for Today View launch handoff
- Manual validation target: click a launch action from a Today View item -> terminal opens in the workspace directory with launch context visible in the panel header

**Key decisions to apply:**
- DEC-0002 (TypeScript + schemas): `LaunchContext` is defined in `packages/contracts/` and validated at the IPC boundary
- DEC-0004 (macOS + Windows + Linux): Launch actions must work cross-platform (working directories, shell defaults)
- DEC-0007 (Dataview/markdown local data): Launch history / context can be persisted as markdown for later querying

**Starting files (must exist before this step runs):**
- PTY service and terminal surface from STEP-07-01
- Flagship workflow surfaces from PHASE-05 (Today View, Calendar, daily briefing)
- Runtime model from PHASE-03

**Constraints:**
- Do NOT auto-execute commands — a pre-filled command requires user approval before execution (approval hardening is STEP-07-03, but the affordance must exist here)
- Do NOT pass secrets in the `LaunchContext.env` — environment variables must be redacted of sensitive values. Redaction boundaries couple forward to PHASE-08/08 security hardening; establish the boundary now even if enforcement is basic.
- Do NOT allow arbitrary context shapes — the `LaunchContext` schema contract is the boundary. No untyped `metadata: any` escape hatches.
- Do NOT build launch actions for every possible surface — start with one concrete path (e.g., "open terminal for this Jira task's repo") and expand later
- `workingDirectory` resolution order must be explicit: artifact-linked repo path if one exists, otherwise the current workspace root, otherwise require the user to choose before launch
- Only commands tagged `readOnly` in `packages/runtime/src/launch/templates.ts` may bypass approval; everything else is `artifactAffecting` by default until STEP-07-03 proves otherwise

**Validation:**
A junior dev verifies completeness by:
1. Opening the desktop app, navigating to Today View, and seeing a "Launch" action on at least one item
2. Clicking the launch action and confirming a terminal opens with the correct working directory and context labels visible
3. Verifying the pre-filled command (if any) is NOT auto-executed — it appears in the terminal but waits for user confirmation
4. Confirming the launch request matches the wrapped IPC contract (`launchContext`, `rows`, `cols`) instead of an ad-hoc payload
5. Parsing a `LaunchContext` through the shared schema contract — it validates. Passing extra untyped fields — it rejects.
6. Checking that `env` values in test fixtures do not contain secrets/tokens

**Junior-readiness verdict:** PARTIAL — One concrete Today View launch path is now real and test-backed, but the step should stay partial until more workflow surfaces and explicit runtime traceability are implemented.

## Related Notes

- Step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]]
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
