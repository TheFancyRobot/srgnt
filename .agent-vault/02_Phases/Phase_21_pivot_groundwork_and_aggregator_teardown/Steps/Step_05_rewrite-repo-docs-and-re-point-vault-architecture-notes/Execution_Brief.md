# Execution Brief

## Why

- Docs and vault architecture notes still describe the aggregator. Every future contributor and agent session boots its understanding from these files — they must describe the ACP command center before Phase 22 starts building it.

## Prerequisites

- STEP-21-03 and STEP-21-04 complete (docs must describe the *actual* slimmed repo, not the plan).
- Read [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] and [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]] — the docs restate these, they don't invent.

## Likely Code Paths

- `README.md`: new product statement ("desktop command center for CLI coding agents over ACP"), five-package structure, dev commands (unchanged), remove the entire connector-plugin guide and CLI sections; keep the Pi Team Workflow section (it's the dev workflow, still true).
- `AGENTS.md`: keep the agent-vault block verbatim; update the product framing line.
- `TESTING.md`: prune connector/Today/Calendar test guidance; keep desktop E2E workflow docs.
- Vault (bounded mutations only): append a "superseded for product surface by [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (DEC-0017)" pointer to the Purpose sections of `System_Overview`, `Integration_Map`, `Domain_Model`, `Connector_Package_Runtime`; update their `reviewed_on`. Do not delete or rewrite them — they document the shell/terminal/notes internals that survive, plus history.
- `06_Shared_Knowledge/{sync-architecture,fred-workflow-design,conflict-resolution-design}.md`: append the same historical pointer (they were already orphan-flagged by `vault_validate`).

## Execution Checklist

1. Rewrite README/AGENTS/TESTING; walk the README quick start on a fresh clone.
2. Apply vault mutations via `vault_mutate` (append_section / update_frontmatter), never raw rewrites.
3. `vault_refresh` (all), then `vault_validate` — no new errors attributable to this step.
4. Close the phase: check off PHASE-21 acceptance criteria that are now true, update the phase status, and record the outcome in each step's Outcome Summary.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes|STEP-21-05 Rewrite repo docs and re-point vault architecture notes]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
