# Implementation Notes

- Migrated base.ts entity schemas: SEntityEnvelope, SCanonicalEntity (Effect Schema equivalents).
- Migrated task.ts: STask schema created.
- Migrated event.ts: SEvent schema created.
- Effect Schema API: Schema.Struct, Schema.String, Schema.optional, Schema.Literal, Schema.Array, Schema.Record, Schema.pattern for datetime validation.
- datetime string fields: use Schema.String.pipe(Schema.pattern(datetimePattern)) where datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.
- Full migration scope: entities (base, task, event, message, person, artifact, briefing, launch), workspace/layout, ipc/contracts, connectors/manifest, executors/run, skills/manifest.

## Related Notes

- Step: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_03_migrate-contracts-package-schemas-to-effect-schema|STEP-06-03 Migrate contracts package schemas to Effect Schema]]
- Phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]
