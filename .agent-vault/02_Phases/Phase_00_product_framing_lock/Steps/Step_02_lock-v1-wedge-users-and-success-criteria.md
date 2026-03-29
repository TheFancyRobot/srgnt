---
note_type: step
template_version: 2
contract_version: 1
title: Lock V1 Wedge Users And Success Criteria
step_id: STEP-00-02
phase: '[[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-00-01
related_sessions:
  - '[[05_Sessions/2026-03-22-025816-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-025816 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Lock V1 Wedge Users And Success Criteria

Freeze the first user slice, non-goals, and measurable success checks for the daily command-center wedge.

## Purpose

- Specify who the first user is, what problem the v1 wedge solves, and what counts as success.
- Ensure later phases optimize for one thin but useful workflow instead of an abstract platform.

## Why This Step Exists

- The framework repeatedly points to the daily command center as the first real value slice.
- Without explicit wedge criteria, connectors and workflow phases can sprawl into a generic productivity suite.

## Prerequisites

- Complete [[02_Phases/Phase_00_product_framing_lock/Steps/Step_01_reconcile-product-boundary-and-terminology|STEP-00-01 Reconcile Product Boundary And Terminology]].
- Read the daily command-center sections of the framework.

## Relevant Code Paths

- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`
- `.agent-vault/00_Home/Roadmap.md`
- `.agent-vault/02_Phases/Phase_00_product_framing_lock/Phase.md`
- `.agent-vault/02_Phases/Phase_04_first_integrations/Phase.md`
- `.agent-vault/02_Phases/Phase_05_flagship_workflow/Phase.md`

## Required Reading

- [[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]]
- [[01_Architecture/System_Overview|System Overview]]
- [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Extract the framework's named v1 wedge, target activities, and suggested first connector set.
2. Convert that into a durable statement of target user, in-scope workflows, and explicit non-goals.
3. Write success criteria that later phases can validate, including usefulness without Fred and without sync.
4. Cross-check the wedge definition against [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]] so the third connector stays settled as Microsoft Teams for v1.
5. Validate by checking that Phase 04 and Phase 05 can trace their acceptance criteria directly back to this wedge definition.
6. Update notes with the frozen wedge summary, non-goals, and any blocker that still changes phase scope.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Framework wedge: Jira + Outlook Calendar + one collaboration connector feeding daily briefing, meeting prep, priorities, and blockers.
- Success must be framed around a useful desktop workflow without Fred or sync.
### Refinement (readiness checklist pass)

**Exact outcome**: A frozen wedge definition note at `.agent-vault/06_Shared_Knowledge/v1_wedge_definition.md` containing: target user persona, in-scope workflows (daily briefing, meeting prep, priority/blocker surfacing), the three connectors (Jira, Outlook Calendar, Microsoft Teams per DEC-0003), explicit non-goals, and measurable success criteria that later phases can validate against.

**Output location**: `.agent-vault/06_Shared_Knowledge/v1_wedge_definition.md`.

**Key decisions now resolved**:
- Third connector: Microsoft Teams first, Slack second (see [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]]).
- This step should treat the collaboration connector as settled input and freeze the wedge around Jira + Outlook Calendar + Teams.

**Constraints**:
- Success criteria must be testable without Fred and without sync (local-only, base product).
- The wedge must be narrow enough that PHASE-04 (3 connectors) and PHASE-05 (1 workflow) can ship it.

**Validation**:
- `v1_wedge_definition.md` exists and contains: persona, workflows, connectors, non-goals, success criteria.
- Phase 04 and Phase 05 acceptance criteria trace directly back to the wedge definition (link check).
- No mention of mobile, marketplace, or multi-workspace in the v1 scope.

**Junior-readiness verdict**: PASS with the above refinements. The connector ambiguity is resolved. Output location is explicit. Success criteria format is defined.
**Security considerations**: N/A — this step produces a planning note (v1_wedge_definition.md). No code, auth, or secrets involved.

**Performance considerations**: N/A — documentation-only step with no runtime behavior.

## Human Notes

- Keep the wedge small; do not let future collaboration, mobile, or marketplace scope leak into the v1 definition.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-025816-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-025816 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]] - Published [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]] and closed the durable output expected by this step.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means later connector and workflow phases can point to one stable wedge definition.
- Validation target: Phase 04 and Phase 05 acceptance criteria read like direct implementations of this wedge.
- Current progress: [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]] now captures the target user, connector set, non-goals, and success criteria for the v1 command-center slice.
