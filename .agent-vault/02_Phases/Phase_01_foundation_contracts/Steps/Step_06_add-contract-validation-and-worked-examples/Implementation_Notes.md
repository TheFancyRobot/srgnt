# Implementation Notes

- Web pressure-testing suggests contracts should be machine-validated rather than left as prose; worked examples are the fastest way to expose drift.
- This step should stay repo-local and deterministic so later contributors can run it before touching Phase 02.
### Refinement (readiness checklist pass)

**Exact outcome**: A validation script at `packages/contracts/scripts/validate.ts` that:
1. Imports all Zod schemas from Steps 02-05.
2. Loads all fixture YAML/JSON files from `examples/skills/` and `examples/connectors/`.
3. Parses each fixture through its corresponding schema.
4. Validates cross-references: skill `requiredCapabilities` are satisfied by at least one connector's declared capabilities.
5. Exits 0 on success, non-zero with specific error messages on failure.

Plus a package.json script: `pnpm run validate` in the contracts package.

**Key decisions to apply**:
- DEC-0002: Validation uses Zod `.parse()` / `.safeParse()`. No additional validation library needed.
- DEC-0005: Script runs via `pnpm run validate`.

**Validation tool is now decided**: Zod itself. The earlier ambiguity about "which validation tooling" is resolved. No ajv, no custom validator — Zod schemas parse fixtures directly.

**Constraints**:
- No network calls. All validation is local against fixture data.
- Script must run in < 5 seconds.
- Script must produce human-readable output (not just exit codes).

**Validation** (meta-validation):
- Running `pnpm run validate` from `packages/contracts/` reports all fixture parse results.
- Introducing a deliberate schema violation in a fixture causes the script to fail with a clear error.
- `pnpm -r run typecheck` still passes.

**Integration touchpoints**:
- This validation script becomes the baseline for PHASE-02's CI pipeline.
- PHASE-04 connector implementations must pass the same validation with their real manifests.

**Junior-readiness verdict**: PASS. Validation tool is locked (Zod), script location is explicit, run command is defined, and the expected behavior on success/failure is documented.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples|STEP-01-06 Add Contract Validation And Worked Examples]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
