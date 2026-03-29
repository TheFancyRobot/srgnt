---
note_type: decision
template_version: 2
contract_version: 1
title: Remove legacy contracts z-star exports and standardize on S-star schemas
decision_id: DEC-0013
status: accepted
decided_on: '2026-03-28'
owner: opencode
created: '2026-03-28'
updated: '2026-03-28'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|PHASE-06 Replace Zod with Effect Schema]]'
  - '[[05_Sessions/2026-03-28-025155-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-025155 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]]'
tags:
  - agent-vault
  - decision
---

# DEC-0013 - Remove legacy contracts z-star exports and standardize on S-star schemas

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: remove legacy contracts `z*` exports and standardize on `S*` schemas after the Zod dependency is gone.
- Related notes: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|PHASE-06 Replace Zod with Effect Schema]], [[05_Sessions/2026-03-28-025155-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-025155 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]].

## Decision

- Remove the direct `zod` dependency from the workspace and convert all contract definitions to Effect Schema.
- Remove the exported legacy `z*` schema names from the source tree and standardize on canonical `S*` schema exports.
- Use shared helpers such as `parseSync(...)` and `safeParse(...)` when callers need parse-time validation behavior.

## Alternatives Considered

- Keep lightweight `z*` compatibility adapters after removing the dependency. Not selected because it preserves a stale API vocabulary after the migration and prolongs cleanup for every downstream consumer.
- Keep the direct `zod` dependency and postpone cleanup. Not selected because it leaves the migration incomplete and keeps two schema engines in active dependency scope.

## Tradeoffs

- Short term: the final rename creates more immediate churn because downstream imports and tests must switch from `z*` to `S*` plus parse helpers.
- Long term: the API surface is cleaner and matches the actual schema engine in use, which reduces confusion and future migration drag.
- Operationally: there is now one canonical schema engine (Effect Schema) and one canonical schema naming convention (`S*`).

## Consequences

- `packages/contracts/` now exposes Effect Schema `S*` exports only.
- Downstream packages no longer need Zod installed to validate contracts and now use `parseSync(...)` / `safeParse(...)` directly when they need decoding semantics.
- Any future contract additions should use `S*` naming only and should not reintroduce `z*` aliases.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|PHASE-06 Replace Zod with Effect Schema]]
- Session: [[05_Sessions/2026-03-28-025155-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-025155 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-28 - Created as `proposed`.
- 2026-03-28 - Accepted during STEP-06-05 cleanup; direct Zod dependency removed and legacy `z*` export names renamed away in favor of `S*` schemas plus shared parse helpers.
<!-- AGENT-END:decision-change-log -->
