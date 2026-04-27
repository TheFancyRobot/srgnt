# Implementation Notes

- The framework doc already proposes `skill.yaml` plus prompts, templates, fixtures, tests, and README as the default package shape.
- The daily-briefing wedge is the safest worked example because it exercises entities, capabilities, approvals, and artifact outputs without requiring broad product scope.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/skills/` for:
1. `SkillManifest` — name, version, description, author, requiredCapabilities[], producedArtifacts[], requiredEntities[], approvalMode, configSchema, promptRefs[]
2. `ApprovalMode` — enum: `auto` | `confirm-before-write` | `confirm-always` | `manual`
3. `SkillCapabilityRef` — capability string (e.g., `tasks.read`, `events.read`) that maps to connector capabilities

Plus a worked example at `examples/skills/daily-briefing/`:
- `skill.yaml` — manifest file with all required fields populated
- `prompts/briefing.md` — template prompt referencing entity types
- `fixtures/` — sample input entities and expected output artifacts
- `README.md` — explains what the skill does and how to validate it

**Key decisions to apply**:
- DEC-0002: Manifest schema is Zod. The `skill.yaml` file is validated by parsing it through the Zod schema at validation time.
- The approval model is **owned by this step**. Steps 04 and 05 reference it but do not redefine it. The approval vocabulary (`auto`, `confirm-before-write`, `confirm-always`, `manual`) is canonical.

**Constraints**:
- Skills must not name specific providers (no `jira` or `teams` in capability refs — only behavior-based strings like `tasks.read`).
- Skills must not assume a specific executor backend.

**Validation**:
- The `daily-briefing/skill.yaml` parses successfully through `SkillManifest.parse()`.
- The manifest's `requiredCapabilities` can be satisfied by the sample connector from Step 04.
- `pnpm -r run typecheck` passes.

**Junior-readiness verdict**: PASS. Manifest fields enumerated, approval model owned, worked example structure explicit.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
