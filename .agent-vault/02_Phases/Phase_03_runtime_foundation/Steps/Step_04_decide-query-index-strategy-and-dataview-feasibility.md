---
note_type: step
template_version: 2
contract_version: 1
title: Decide Query Index Strategy And Dataview Feasibility
step_id: STEP-03-04
phase: '[[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-03-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Decide Query Index Strategy And Dataview Feasibility

Make the query/index subsystem explicit before dashboards, Today, and Calendar start depending on it.

## Purpose

- Choose how the local metadata/index layer will work and whether any Dataview reuse is worth pursuing.
- Prevent later UI phases from depending on an undefined or accidental query engine.

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

## Required Reading

- [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
- [[01_Architecture/Code_Map|Code Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Audit the framework's query/index requirements and list the consumer surfaces they unblock.
2. Decide whether to reuse, adapt, or ignore Dataview-inspired ideas based on practical feasibility rather than wishful compatibility.
3. Choose the initial local metadata/index implementation direction and define its boundary relative to file-backed truth.
4. Record migration and rebuild expectations so the index can be treated as derived state.
5. Validate by checking that Phase 05 workflow surfaces can name the query/index APIs or modules they will depend on.
6. Update notes with the chosen direction, rejected alternatives, and any blocker that still needs a dedicated decision note.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-26
- Next action: None - DEC-0011 recorded and accepted. Dataview extraction not feasible, SimpleQueryEngine chosen for v1.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The index layer is derived state, not the authoritative workspace.
- This decision is a blocker for dashboards, saved views, Today, and Calendar surfaces.
### Refinement (readiness checklist pass)

**Critical context — DEC-0007 and the Dataview research spike:**
DEC-0007 records Dataview as the default query/index direction, but it explicitly requires this step to confirm standalone feasibility before Phase 03 implementation proceeds. A **research spike** is required before any implementation:

1. **Feasibility audit:** Can Dataview's core query engine (`obsidian-dataview` npm package or its source) run outside Obsidian? Dataview depends on Obsidian's `MetadataCache`, `Vault`, and `App` APIs. The spike must determine which dependencies can be shimmed vs. which require a fork.
2. **Extraction prototype:** Build a minimal Node.js script that loads one markdown file with YAML frontmatter and executes one Dataview query against it. If this fails, document why and propose alternatives.
3. **Go/no-go decision:** If extraction is feasible with reasonable effort, reaffirm DEC-0007 and record the implementation constraints in the spike output. If not, document the blocker and create a superseding DEC note with the alternative chosen (e.g., custom query engine over gray-matter + simple filter/sort, or a lightweight alternative like `markdown-it` + custom indexer).

**Exact outcome:**
- A research spike document (session note or architecture note) recording Dataview extraction feasibility with evidence
- A minimal prototype script or sandbox proving the chosen direction can: index markdown files, filter by frontmatter field, sort by date, and list artifacts by type
- If not feasible: a superseding DEC note recording the alternative chosen, plus an implementation handoff note that STEP-03-05 can follow
- `packages/contracts/src/query.ts` may be sketched if that helps compare alternatives, but production query implementation belongs to STEP-03-05
- Documentation of rebuild/invalidation behavior: how the eventual index should refresh when files change

**Key decisions to apply:**
- DEC-0007 (Dataview query engine) — this is the default direction under confirmation. The spike either reaffirms it or supersedes it.
- DEC-0002 (TypeScript + Zod) — query schemas and results must be Zod-typed
- DEC-0007's corollary: the index is derived state — it must be fully rebuildable from markdown files alone, and deleting the index cache must not lose data

**Starting files:**
- Completed STEP-03-01: manifest loaders reading markdown + YAML frontmatter
- Completed STEP-02-03: workspace layout with artifact directories
- `obsidian-dataview` source code (to be audited during the spike — https://github.com/blacksmithgu/obsidian-dataview)

**Constraints:**
- Do NOT skip the research spike — do not assume Dataview extraction works without proving it
- Do NOT import Obsidian APIs as production dependencies — the product is standalone Electron, not a plugin
- Do NOT build a full SQL-like query engine from scratch if Dataview extraction is feasible
- Do NOT make the index authoritative — markdown files are always the source of truth
- Do NOT block on a perfect query language — v1 needs filter + sort, not a full DSL

**Validation:**
1. Research spike document exists with clear feasibility verdict and evidence
2. If go: a prototype indexes 5+ markdown fixture files and queries them successfully
3. If no-go: a superseding DEC note exists recording the alternative, and the alternative implementation plan names the same minimum query contract
4. Prototype notes explain how index rebuild would work from files alone
5. Phase 05 (workflow surfaces) team can name the exact query API family they will call after STEP-03-05 implements it

**BLOCKER — STEP-02-03 dependency gap:** The "Starting files" section references "Completed STEP-02-03: workspace layout with artifact directories." STEP-02-03's contracts exist but the file-backed bootstrap implementation does not yet exist. For this step's research spike, the blocker is soft — the Dataview feasibility spike can proceed against any local markdown directory. However, if the spike confirms Dataview, the STEP-03-05 implementation will need the real workspace bootstrap from STEP-02-03 first. Track this dependency: if STEP-02-03 implementation is not complete when STEP-03-05 begins, STEP-03-05 is blocked.

**Junior-readiness verdict:** PASS with guidance — this step is now scoped to the research spike only (no implementation). A junior dev can: (1) read Dataview source, (2) build the minimal extraction prototype, (3) document feasibility evidence. The go/no-go DECISION requires senior review, but the research itself is straightforward technical investigation. The implementation that depended on the spike verdict has been moved to [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05]].

## Human Notes

- Be skeptical of compatibility goals that increase complexity without directly helping the wedge.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means later UI phases know exactly what query/index substrate they can build on.
- Validation target: Phase 05 can point to explicit query/index modules, APIs, or a recorded deferral decision.
