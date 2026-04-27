# Execution Brief

## Step Overview

Classify what data exists in the product and what sync may or may not move later.

## Why This Step Exists

- The framework explicitly treats data classification as sync-prep deliverable.
- Encryption and account design are not meaningful until data classes are clear.

## Prerequisites

- Complete the earlier runtime and hardening phases so real local data classes exist.

## Relevant Code Paths

- workspace layout and persistence docs from Phase 02
- runtime artifact/log/state models from Phase 03
- product hardening telemetry/crash policy from Phase 08

## Execution Prompt

1. Inventory the product's local data classes: artifacts, settings, logs, connector metadata, cache, secrets references, run history, approvals, and derived indexes.
2. Classify each class by sensitivity, authoritativeness, and sync eligibility.
3. Record what must remain local-only, what may sync only in encrypted form, and what is derived and rebuildable.
4. Validate by checking that later sync architecture can reference this matrix without reclassifying core product data.
5. Update notes with the final classification matrix and any unresolved sensitive-data question.

## Related Notes

- Step: [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]
- Phase: [[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]
