---
note_type: step
template_version: 2
contract_version: 1
title: Bundle the offline model assets and add local-only model resolution
step_id: STEP-15-04
phase: '[[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Bundle the offline model assets and add local-only model resolution

## Purpose

- Outcome: the desktop app contains the default multilingual embedding model inside its packaged resources and runtime can resolve it without any network dependency.

## Why This Step Exists

- Offline-from-first-launch is a hard product requirement. It is only real when packaged builds can locate and load the model with remote loading disabled.

## Prerequisites

- STEP-15-01 complete.

## Relevant Code Paths

- `packages/desktop/package.json`
- desktop build and packaging config under `packages/desktop/`
- runtime semantic-search model loader modules

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Add the local embedding runtime dependency and the chosen default model assets to the desktop packaging flow.
2. Configure local-only model resolution with remote loading disabled.
3. Ensure runtime can receive a packaged model path through config instead of hardcoding dev-only paths.
4. Add validation that fails clearly when model assets are missing or mismatched.
5. Add at least one packaged-build or simulated-offline test proving local-only resolution works.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Prove the model loads from bundled local assets only.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Keep model id, asset path, and expected embedding dimension in the manifest/config contract so later rebuild logic can detect incompatibility.
- If the default model proves too large or unstable in packaged validation, record a superseding decision rather than silently swapping it.

## Human Notes

- This step is the main packaging risk for the whole initiative. Treat it as a gate, not a nice-to-have.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means a packaged desktop build can locate the bundled model locally with remote model loading disabled.
