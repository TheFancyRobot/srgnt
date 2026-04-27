# Implementation Notes

- Framework evidence already proposes `Task`, `Event`, `Message`, `Thread`, `Person`, `Project`, `Document`, `ActionItem`, and `Artifact` as the initial entity vocabulary.
- The contract must preserve raw provider metadata while keeping skills dependent on canonical entities.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/entities/` for:
1. `EntityEnvelope` — shared wrapper: `id`, `type`, `source`, `canonical`, `providerMeta`, `createdAt`, `updatedAt`
2. `Task` — title, status, priority, assignee, project, due, labels, description
3. `Event` — title, start, end, attendees, location, recurrence, calendar
4. `Message` — content, sender, channel/thread, timestamp, reactions
5. `Thread` — messages[], participants, topic, channel
6. `Person` — name, email, role, team, avatarUrl
7. `Project` — name, key, status, lead, description
8. `Document` — title, content, author, path, lastModified
9. `ActionItem` — description, owner, status, due, source entity ref
10. `Artifact` — type, content, format, generatedBy, approvalStatus

**Key decisions to apply**:
- DEC-0002: Each entity is a `z.object()` schema. TypeScript types are inferred via `z.infer<>`.
- DEC-0007: These schemas also define the expected YAML frontmatter shape for entity markdown files. Each entity schema must include a `frontmatterSchema` export that maps to the fields stored in YAML.

**Constraints**:
- Canonical fields must not reference provider-specific concepts (no `jiraKey`, `outlookId` in canonical schemas).
- Provider metadata lives in `providerMeta: z.record(z.unknown())` on the envelope.
- All fields that may be absent across providers must be `z.optional()`.

**Validation**:
- `pnpm -r run typecheck` passes after adding schemas.
- Each schema can parse a minimal fixture JSON without errors.
- Steps 03 and 04 can import entity types without adding provider-specific fields.

**Junior-readiness verdict**: PASS. Entity list is exhaustive, schema format is locked, fixture requirement is explicit.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
