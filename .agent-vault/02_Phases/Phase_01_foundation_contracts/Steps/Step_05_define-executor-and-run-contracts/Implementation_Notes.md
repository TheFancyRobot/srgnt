# Implementation Notes

- The framework doc already treats executors as pluggable backends such as Codex and OpenCode.
- Web pressure-testing reinforced that desktop security boundaries must keep secrets out of the renderer and make privileged operations explicit and auditable.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/executor/` for:
1. `ExecutorRequest` — skillRef, inputEntities[], capabilities granted, approvalMode, contextWindow, timeoutMs
2. `ExecutorResult` — status (success | failure | partial | approval-pending), outputArtifacts[], logs[], errors[], duration
3. `RunLog` — timestamped entries with: level (info | warn | error | debug), message, sensitivityTag, redacted flag
4. `ArtifactOutput` — type, content, format, approvalStatus, targetPath

Plus schemas in `packages/contracts/src/approvals/`:
5. `ApprovalRequest` — what action, which entity, requested by (skill), approval mode, context summary
6. `ApprovalDecision` — approved | denied | modified, decidedBy, reason, timestamp

**Key decisions to apply**:
- DEC-0002: All schemas are Zod.
- The approval model defined in Step 03 (`ApprovalMode` enum) is consumed here. This step defines the **runtime approval flow contracts** (request/decision) while Step 03 owns the **declaration vocabulary**.

**Constraints**:
- Executor contracts must not reference specific agent backends (no `codex` or `opencode` types).
- Run logs must have a `sensitivityTag` field so PHASE-07/07 redaction logic can filter them.
- No renderer-specific types (no React components, no IPC message shapes).

**Security considerations**:
- Secrets (API keys, tokens) must never appear in `ExecutorRequest` or `RunLog`. They are resolved by the connector layer, not passed through executor contracts.
- The `redacted` flag on log entries is for display-time filtering; actual redaction happens at the runtime layer (PHASE-03/06).

**Validation**:
- A mock daily-briefing execution flow (request -> result with artifacts) can be represented without errors.
- `pnpm -r run typecheck` passes.
- The model can represent: success, failure, partial completion, and approval-gated pause.

**Junior-readiness verdict**: PASS. Approval model ownership clarified, security boundaries explicit, executor is backend-agnostic.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_05_define-executor-and-run-contracts|STEP-01-05 Define Executor And Run Contracts]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
