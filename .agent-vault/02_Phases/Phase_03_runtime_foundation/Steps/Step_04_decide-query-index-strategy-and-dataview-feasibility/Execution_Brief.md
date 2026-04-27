# Execution Brief

## Step Overview

Make the query/index subsystem explicit before dashboards, Today, and Calendar start depending on it.

## Why This Step Exists

- The framework's final pre-coding checklist names Dataview feasibility and index implementation as remaining decisions.
- Saved views, dashboards, freshness, Today, and Calendar all depend on query/index behavior.

## Prerequisites

- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]].

## Relevant Code Paths

- `packages/runtime/`
- `packages/contracts/`
- future query/index package or module path chosen during this step
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Execution Prompt

1. Audit the framework's query/index requirements and list the consumer surfaces they unblock.
2. Decide whether to reuse, adapt, or ignore Dataview-inspired ideas based on practical feasibility rather than wishful compatibility.
3. Choose the initial local metadata/index implementation direction and define its boundary relative to file-backed truth.
4. Record migration and rebuild expectations so the index can be treated as derived state.
5. Validate by checking that Phase 05 workflow surfaces can name the query/index APIs or modules they will depend on.
6. Update notes with the chosen direction, rejected alternatives, and any blocker that still needs a dedicated decision note.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
