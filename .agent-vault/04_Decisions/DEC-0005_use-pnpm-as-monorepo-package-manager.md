---
note_type: decision
template_version: 2
contract_version: 1
title: Use pnpm as monorepo package manager
decision_id: DEC-0005
status: accepted
decided_on: '2026-03-21'
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]]'
tags:
  - agent-vault
  - decision
---

# DEC-0005 - Use pnpm as monorepo package manager

Freeze one workspace toolchain so repo scaffolding, scripts, and CI all use the same package-manager assumptions.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Use pnpm as monorepo package manager.
- Related notes: [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]].
The monorepo needs a package manager choice before PHASE-02 scaffolding. This affects workspace configuration, dependency hoisting, lockfile format, CI caching, and developer experience across all subsequent phases.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
Use **pnpm** as the package manager for the srgnt monorepo. All workspace configuration, CI scripts, and documentation will reference pnpm commands.

- `pnpm-workspace.yaml` defines workspace packages.
- `pnpm-lock.yaml` is the lockfile (committed to git).
- All CI pipelines use `pnpm install --frozen-lockfile`.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **npm**: Native to Node.js, simplest setup. Rejected due to slower installs, phantom dependency issues from flat hoisting, and weaker workspace support.
- **yarn (v4/berry)**: Good monorepo support via workspaces, PnP mode. Rejected because PnP adds complexity with Electron native modules and pnpm is more widely adopted in the TS monorepo ecosystem.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Pro**: Strict dependency isolation prevents phantom dependencies.
- **Pro**: Fast installs via content-addressable store and hard links.
- **Pro**: Best-in-class monorepo workspace support.
- **Pro**: `pnpm-workspace.yaml` is simpler than yarn's configuration.
- **Con**: Requires pnpm to be installed separately (not bundled with Node.js). Mitigated by `corepack enable`.
- **Con**: Some Electron native module build tools assume npm/yarn. Mitigated by pnpm's `node-linker=hoisted` option if needed.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- PHASE-02 Step 01 monorepo scaffolding uses `pnpm init` and `pnpm-workspace.yaml`.
- All step notes referencing package install commands must use `pnpm add` / `pnpm install`.
- CI configuration must install pnpm (via `corepack enable` or explicit install step).
- Contributing docs must specify pnpm as required tooling.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-22 - Accepted during phase-readiness review; downstream repo and desktop steps now treat pnpm as fixed.
<!-- AGENT-END:decision-change-log -->
