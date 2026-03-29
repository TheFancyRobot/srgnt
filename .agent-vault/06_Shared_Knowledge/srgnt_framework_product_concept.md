---
note_type: shared_knowledge
title: srgnt Product Concept
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
---

# srgnt Product Concept

## Product identity

- **Product name:** srgnt
- **Primary URL:** srgnt.app
- **Status:** selected and adopted for implementation materials

## Working concept
A framework for turning Obsidian into a personal and team command center.

Core idea:
- Obsidian is the human workspace and system shell.
- Extensions connect external systems into the vault.
- A terminal-based coding agent operates on vault content and connected data.
- Skills provide reusable, composable capabilities the agent can invoke.
- The result is a customizable productivity and operations environment tailored to each user.

---

## Product thesis
Most productivity systems fail because they split work across disconnected tools:
- notes live in one place
- tickets live in another
- chat and email live elsewhere
- automation lives in scripts
- AI agents lack durable context and reusable operational procedures

This framework unifies those layers around a single operating surface:
- the vault becomes the durable knowledge and state layer
- extensions become integration adapters
- skills become executable procedures
- agents become orchestrators
- notes become both interface and artifact

This makes the system:
- personal-first
- local-first where possible
- inspectable
- scriptable
- extensible
- AI-native without hiding the underlying data

---

## North star
Build an ecosystem that lets a user assemble a personal command center from:
- connectors
- skills
- views
- automations
- agents

The user should be able to say:
- "Prepare my day"
- "Summarize my team risk"
- "Create follow-ups from these meetings"
- "Update my Jira notes and draft stakeholder communications"
- "Run my weekly review workflow"

And the system should do that using the user's own tools, notes, and processes.

---

## Proposed mental model

### 1. Vault = knowledge + state
The vault is not just notes. It is the durable working memory of the system.

It should contain:
- human-authored notes
- synchronized external artifacts
- generated operational notes
- task and workflow state
- skill definitions
- system configuration
- logs and execution history

### 2. Extensions = integration/runtime surface
Obsidian extensions should handle:
- authentication and connection to external services
- sync and materialization of external data into the vault
- command registration inside Obsidian
- UI affordances for status, execution, and settings
- optional local APIs/events for agents and skills

### 3. Agent = orchestrator
The terminal coding agent is not the product itself. It is the execution engine.

It should:
- read vault context
- inspect skill definitions
- call local tools/adapters
- modify notes and generated artifacts
- follow skill contracts and guardrails
- produce audit trails

### 4. Skills = portable operational capabilities
A skill is a reusable procedure with:
- purpose
- inputs
- required connectors/tools
- instructions/prompting
- expected outputs/artifacts
- safety/approval rules
- optional schedules/triggers

Skills should be installable, composable, and shareable.

### 5. Views = opinionated user experiences
Examples:
- daily note generation
- team status dashboard
- meeting prep note
- incident command note
- release checklist note
- weekly review note

Views are where the system feels magical to the user.

---

## Architecture recommendation

## Layer 1: Workspace layer
Responsible for how information is represented in the vault.

Suggested directories:
- `.command-center/`
  - `config/`
  - `skills/`
  - `connectors/`
  - `state/`
  - `logs/`
  - `cache/`
  - `templates/`
- `Daily/`
- `Projects/`
- `People/`
- `Meetings/`
- `Systems/`
- `Dashboards/`
- `Inbox/`

Keep framework internals in a dot-prefixed directory so the user's knowledge structure stays clean.

## Layer 2: Connector layer
Each connector is responsible for one system.

Examples:
- Jira connector
- Outlook mail connector
- Outlook calendar connector
- Teams connector
- Slack connector
- GitHub connector
- Linear connector
- Confluence connector

Connector responsibilities:
- auth
- sync strategy
- schema mapping
- conflict handling
- materialization strategy
- rate limiting
- permissions
- metadata tracking

Each connector should produce normalized records plus source-specific raw metadata.

## Layer 3: Canonical data model
Do not let each skill depend directly on each provider's schema.

Create canonical entities such as:
- Task
- Event
- Message
- Thread
- Person
- Project
- Document
- ActionItem
- NoteArtifact

This is one of the most important design decisions. Skills should operate on canonical entities, while connectors map provider-specific data into those entities.

Example:
- Jira issue -> Task
- Planner item -> Task
- GitHub issue -> Task
- Outlook meeting -> Event
- Teams message thread -> Thread

This gives you portability and reduces lock-in.

## Layer 4: Skill runtime
A skill runtime should:
- discover installed skills
- validate required inputs and dependencies
- expose skill metadata to agents
- run preflight checks
- provide access to connector data and local tools
- write outputs to the vault
- log executions

A skill package should likely contain:
- `skill.json` or `skill.yaml`
- instructions or prompt files
- optional templates
- optional scripts/tool adapters
- test fixtures
- README

## Layer 5: Agent execution layer
You currently rely on terminal agents. That is fine for v1.

Treat agents as pluggable executors:
- Codex
- OpenCode
- Claude Code equivalent
- future custom runtime

Define a thin execution contract so the framework does not become dependent on one terminal agent.

## Layer 6: Automation/orchestration layer
This should support:
- manual runs
- scheduled runs
- event-triggered runs
- approval-gated runs

Examples:
- Every weekday at 7am generate daily briefing
- After calendar sync, update meeting prep notes
- After Jira sync, update team dashboard
- When tagged note appears in Inbox, run triage skill

---

## Strong recommendation: split the product into three things

### A. Core framework
Owns:
- vault conventions
- skill spec
- runtime contracts
- canonical schemas
- packaging/versioning
- logs/state

### B. Connector SDK + connector plugins
Owns:
- external system integrations
- sync/materialization
- connector APIs exposed to skills

### C. Skill ecosystem
Owns:
- reusable workflows
- templates
- dashboards
- briefings
- review flows
- automations

This separation will help avoid a monolith.

---

## Suggested v1 scope
Do not try to build the entire ecosystem first.

Build a narrow but compelling wedge:

### V1 use case: daily command center
Inputs:
- Jira issues for self/team
- Outlook calendar events
- Teams messages or mentions

Outputs:
- generated daily note
- prioritized action list
- meeting prep blocks
- risk/watch items
- follow-up suggestions

Why this is a good wedge:
- high personal value
- easy to demo
- repeatable daily habit
- proves connectors + canonical model + skill runtime + generated artifacts

---

## Product principles

### 1. Notes are first-class artifacts
Every meaningful run should produce inspectable notes, not only transient chat output.

### 2. AI should be guided, not magical
Skills should narrow the problem space and define safe operating boundaries.

### 3. Local-first where possible
Cache and state should live locally; external APIs should enrich, not own, the workflow.

### 4. Everything should be inspectable
Users should be able to see:
- source data
- transformations
- generated outputs
- logs
- prompts/instructions
- run history

### 5. Users should be able to override everything
Manual edits are a feature, not a bug.

### 6. Framework first, product second
Do not hardcode your own workflow too deeply into the core.

---

## Proposed domain model

### Connector
- id
- name
- provider
- authState
- capabilities
- syncModes
- schemasSupported

### EntityRecord
- id
- entityType
- sourceConnector
- sourceId
- canonicalData
- rawMetadata
- syncedAt
- hash

### Skill
- id
- name
- version
- description
- inputSchema
- requiredCapabilities
- instructions
- outputTargets
- approvalPolicy
- triggerSupport

### SkillRun
- id
- skillId
- startedAt
- completedAt
- status
- inputs
- outputs
- artifacts
- logs
- approvals

### Artifact
- id
- type
- path
- generatedBy
- relatedEntities
- createdAt

---

## Execution model recommendation
A good initial execution flow:
1. User invokes a skill from Obsidian command or terminal.
2. Framework resolves required connectors and inputs.
3. Framework loads relevant canonical entities from the local cache/state.
4. Agent receives:
   - skill instructions
   - allowed tools
   - relevant vault paths
   - selected entities
   - output contract
5. Agent generates or updates artifacts.
6. Framework validates outputs.
7. Framework writes logs and updates run history.

This gives structure without overengineering.

---

## Packaging recommendation for skills
A skill should feel like an installable package.

Example:
```text
.command-center/skills/daily-briefing/
  skill.yaml
  README.md
  prompts/
    system.md
    instructions.md
  templates/
    daily-note.md
  fixtures/
    jira.json
    calendar.json
  tests/
    daily-briefing.test.ts
```

Key point:
Skills should be testable with fixtures independent of live systems.

---

## Biggest architectural risks

### Risk 1: coupling skills directly to provider schemas
Mitigation:
- canonical model layer
- provider adapters

### Risk 2: over-reliance on one agent tool
Mitigation:
- executor abstraction
- skill contracts independent of specific agent

### Risk 3: vault pollution and unreadable generated content
Mitigation:
- strict directory conventions
- generated artifact prefixes/frontmatter
- archive/cache separation

### Risk 4: weak trust due to silent changes
Mitigation:
- run logs
- diff previews
- approval modes
- explicit output locations

### Risk 5: connectors becoming brittle
Mitigation:
- connector SDK
- capability declarations
- test fixtures and mock syncs

### Risk 6: the framework becoming too personal to your workflow
Mitigation:
- plugin-first design
- declarative skill specs
- canonical entities

---

## Recommended repo strategy
Consider a mono-repo with packages like:
- `packages/core`
- `packages/obsidian-plugin`
- `packages/connector-sdk`
- `packages/connector-jira`
- `packages/connector-outlook`
- `packages/connector-teams`
- `packages/skill-sdk`
- `packages/skills-daily-briefing`
- `packages/executor-codex`
- `packages/executor-opencode`
- `apps/example-vault`
- `docs/`

This gives a path from POC to ecosystem.

---

## Build roadmap

## Phase 0: framing
Define:
- product name
- problem statement
- target user profiles
- v1 use case
- framework boundaries

Deliverables:
- architecture brief
- terminology glossary
- v1 success criteria

## Phase 1: foundational contracts
Build:
- vault directory conventions
- canonical entity schemas
- skill manifest spec
- execution contract for agents
- logging/run history model

Deliverables:
- JSON schemas or TypeScript types
- sample skill package
- sample connector contract

## Phase 2: connector baseline
Build 3 first-class connectors:
- Jira
- Outlook calendar
- Teams or Slack

Deliverables:
- sync to canonical store
- source metadata retention
- local cache/state
- test fixtures

## Phase 3: v1 skill runtime
Build:
- skill discovery
- preflight validation
- executor abstraction
- artifact writing
- run logs

Deliverables:
- run a skill end-to-end from Obsidian + terminal

## Phase 4: flagship skill
Build:
- daily briefing / command center skill

Deliverables:
- daily note generation
- meeting prep section
- task summary section
- synthesized action list
- watch-outs / blockers

## Phase 5: UX hardening
Build:
- command palette actions
- status panels
- sync status
- run history UI
- preview before write where appropriate

## Phase 6: ecosystem readiness
Build:
- skill packaging/versioning
- install flow
- docs/examples
- community contribution model

---

## What I would build first if we were starting tomorrow
1. Name the framework and define its boundaries.
2. Freeze a directory structure under a dot-prefixed system folder.
3. Define canonical entity types for Task, Event, Message, Person, Project.
4. Create a declarative skill manifest format.
5. Build one clean end-to-end flow: generate daily briefing from Jira + calendar.
6. Add logs, fixtures, and tests before adding more connectors.
7. Only then expand into email/chat actions and broader automations.

---

## My recommendation for the product framing
Describe it as:

"A framework for building AI-native command centers inside Obsidian using connectors, skills, and agent-driven workflows."

That is much clearer than "system framework" and gives you room for:
- an Obsidian plugin
- a skill marketplace/ecosystem
- connector packs
- local automation runtime
- optional hosted services later

---

## Immediate next outputs to create
1. product vision / one-pager
2. naming options
3. architecture decision record set
4. v1 technical design
5. repo/package structure
6. skill manifest specification
7. canonical schema definitions
8. daily briefing skill spec
9. connector contract spec
10. implementation roadmap with milestones

---

## Collaboration mode for future work
A productive way to build this with an AI partner:
- keep a living architecture doc
- create ADRs for major decisions
- define contracts before implementation
- build one thin vertical slice at a time
- require fixtures/tests for each connector and skill
- maintain a backlog split into core, connectors, skills, and UX

---

## Positioning statement
This is not just an Obsidian plugin.
It is a personal operations framework with Obsidian as the primary workspace.

That distinction matters because it changes your design from:
- "How do I add commands to Obsidian?"

to:
- "How do I create an extensible runtime for knowledge, integrations, and AI-executable skills inside a user-owned workspace?"


---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model|ADR-002: Canonical Entity Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest|ADR-003: Skill Manifest Specification]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004: Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr005_executor_interface|ADR-005: Executor Interface]]
- [[06_Shared_Knowledge/srgnt_framework_base_product_architecture|Base Product Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_v1_one_pager|V1 Foundation Pack: Product One-Pager]]
- [[06_Shared_Knowledge/srgnt_framework_v1_scope_and_nongoals|V1 Scope and Non-Goals]]
- [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]
- [[06_Shared_Knowledge/srgnt_framework_milestone_roadmap|Initial Milestone Roadmap]]
