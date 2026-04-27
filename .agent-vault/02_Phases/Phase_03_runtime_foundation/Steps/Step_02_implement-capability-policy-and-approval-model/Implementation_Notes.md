# Implementation Notes

- Read/write separation must remain explicit for trust and approval UX.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/runtime/src/policy/capability.ts` — capability resolution engine: given a manifest's declared capabilities and the workspace's policy config, returns allowed/denied/approval-required for each operation
- `packages/runtime/src/policy/approval.ts` — approval model: tracks pending approvals, approval grants, and approval persistence (stored as workspace state files, not in-memory only)
- `packages/contracts/src/policy.ts` — Zod schemas for capability declarations, policy rules, and approval records
- `packages/runtime/src/policy/index.ts` — barrel export for the policy subsystem
- Test suite covering: (a) read-only operation → auto-allowed, (b) write operation → approval-required, (c) denied capability → blocked, (d) previously-approved operation → allowed without re-prompt
- Integration test: load a connector manifest via STEP-03-01 loaders, run its capabilities through the policy engine, verify correct allow/deny/approval results

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — capability and approval schemas must be Zod-validated
- DEC-0003 (Teams first, Slack second) — the connector capability model should not assume Slack-specific permission shapes; Teams is the primary connector target
- DEC-0007 (markdown files as data) — approval records should be stored as workspace files under `.command-center/state/approvals/`, not in an ephemeral store

**Starting files:**
- Completed STEP-03-01: working manifest loaders that produce typed manifest objects with capability declarations
- Phase 01 contracts defining what capabilities connectors and skills can declare

**Constraints:**
- Do NOT build approval UI in this step — the policy engine returns decisions, the UI is built later
- Do NOT hard-code connector-specific policy rules — policy must be manifest-driven and generic
- Do NOT make the policy engine async-dependent on network calls — it operates on local state only
- Do NOT store approvals in Electron-specific storage (e.g., safeStorage) — use workspace files

**Validation:**
1. `pnpm test --filter runtime` passes with policy tests covering all four paths (allowed, denied, approval-required, previously-approved)
2. `pnpm typecheck` passes across contracts + runtime
3. A denied capability cannot be bypassed by omitting the policy check (the loader -> policy path is mandatory)
4. Integration test: manifest load -> policy evaluation -> correct result, end-to-end
5. Read vs. write operations produce visibly different policy outcomes in test output

**Junior-readiness verdict:** PASS — well-scoped policy engine step. The four test paths (allow/deny/approval-required/previously-approved) give clear acceptance criteria. The implementer needs to understand the manifest capability schema from Phase 01.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model|STEP-03-02 Implement Capability Policy And Approval Model]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
