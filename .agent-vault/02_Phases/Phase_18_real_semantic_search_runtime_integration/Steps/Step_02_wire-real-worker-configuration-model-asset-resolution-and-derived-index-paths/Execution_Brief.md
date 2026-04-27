# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- The real runtime engine is only trustworthy if the worker receives the same model path, workspace root, chunking limits, and derived index root that production desktop builds will use.
- This step prevents false-positive tests that only work with ad hoc or test-only configuration.

## Prerequisites

- STEP-18-01 complete.
- Understand Phase 15 model bundling and Phase 17 packaged validation behavior.

## Relevant Code Paths

- `packages/desktop/src/main/semantic-search/worker.ts`
- `packages/desktop/src/main/semantic-search/host.ts`
- `packages/runtime/src/semantic-search/config.ts`
- `packages/contracts/src/ipc/contracts.ts`
- packaged-path resolution code in `packages/desktop/src/main/`

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Related Notes

- Step: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths|STEP-18-02 Wire real worker configuration model asset resolution and derived index paths]]
- Phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]
