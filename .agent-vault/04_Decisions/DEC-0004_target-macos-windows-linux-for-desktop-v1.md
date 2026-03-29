---
note_type: decision
template_version: 2
contract_version: 1
title: Target macOS + Windows + Linux for desktop v1
decision_id: DEC-0004
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

# DEC-0004 - Target macOS + Windows + Linux for desktop v1

Freeze the desktop support matrix early so packaging, PTY hosting, and QA work against one explicit platform target.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Target macOS + Windows + Linux for desktop v1.
- Related notes: [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]].
PHASE-02 (Desktop Foundation) and PHASE-08 (Product Hardening) need to know which OS platforms the Electron app must build for. This affects: monorepo CI matrix, native module compilation, code signing, packaging tool configuration, and QA test matrix.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
The v1 desktop app targets **macOS, Windows, and Linux**. All three platforms are first-class from the start.

- macOS: `.dmg` installer, Apple code signing + notarization.
- Windows: `.exe` / NSIS installer, Windows code signing.
- Linux: `.AppImage` and/or `.deb`, no code signing required.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **macOS only**: Smallest scope, fastest to ship. Rejected because too narrow for developer audience.
- **macOS + Windows**: Covers ~95% of professional developers. Rejected because Linux is important for the developer persona and the marginal cost of adding Linux to Electron builds is low.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Pro**: Full developer market coverage from day one.
- **Pro**: Electron's cross-platform support makes this relatively low-cost.
- **Con**: CI build matrix is 3x larger. Build time and infra cost increase.
- **Con**: Linux has more packaging variants and no standard code signing. Mitigated by choosing AppImage as the primary Linux format.
- **Con**: Native module compatibility (e.g., PTY in PHASE-07) must be validated on all three platforms.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- PHASE-02 monorepo scaffolding must include CI build targets for all 3 platforms.
- PHASE-08 packaging step must define installer formats per platform.
- PHASE-08 code signing step must handle platform-specific signing (macOS notarization, Windows Authenticode, Linux none).
- PHASE-07 PTY integration must be tested on all 3 platforms.
- QA test matrix in PHASE-08 must cover all 3 platforms.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-22 - Accepted during phase-readiness review; downstream packaging, PTY, and QA notes now assume all three desktop platforms are first-class.
<!-- AGENT-END:decision-change-log -->
