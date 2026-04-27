# Implementation Notes

- **Zod dependency**: `packages/contracts` is the sole direct zod^3.23.0 consumer. All other packages import `z` from `@srgnt/contracts`.
- **Schema ownership**: contracts/src/entities/ (base, task, event, message, person, artifact, briefing, launch), workspace/layout.ts, ipc/contracts.ts, connectors/manifest.ts, executors/run.ts, skills/manifest.ts.
- **Consumer packages**: sync, fred, desktop, entitlements, runtime, connectors, executors — all depend on @srgnt/contracts Zod schemas.
- **Type-only usage**: runtime/src/loaders/entity.ts imports `ZodSchema` type from 'zod'.
- **Effect migration challenge**: Effect Schema uses `S.Schema<T>` vs Zod's `z.string()`, `.email()`, `.url()`, `.datetime()` — different API surface requiring rewrite, not just swap.
- **Schema count**: ~50 named Zod schemas across contracts plus ~10 in sync, fred, desktop, entitlements.

## Related Notes

- Step: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_01_audit-zod-usage-across-codebase|STEP-06-01 Audit Zod usage across codebase]]
- Phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]
