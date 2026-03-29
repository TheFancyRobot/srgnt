---
note_type: shared_knowledge
title: ADR-003 Skill Manifest Specification
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - adr
---

# ADR-003: Skill Manifest Specification

**Status:** Proposed  
**Date:** 2026-03-17  
**Decision Owner:** Framework Core  
**Scope:** v1 packaging and execution contract for skills

## Context

Skills are a central extension mechanism in the framework. If skills are defined only as loose prompts or undocumented scripts, they will be difficult to share, test, install, version, and trust.

We need a standard manifest that makes skills:
- inspectable
- installable
- testable
- composable
- permission-aware
- executor-agnostic

## Decision

We will define each skill as a package with a required human-readable manifest file, initially `skill.yaml`.

A skill package may include prompts, templates, helper scripts, fixtures, and tests, but the manifest is the source of truth for what the skill is, what it requires, and what it produces.

## Required manifest fields

Proposed v1 fields:

```yaml
id: daily-briefing
name: Daily Briefing
version: 0.1.0
summary: Generate a daily command-center note from tasks, events, and messages.
description: >
  Creates a dated daily note containing schedule context, work priorities,
  blockers, and synthesized action items.
author: example-author
license: MIT
entry:
  instructions: prompts/instructions.md
  template: templates/daily-note.md
requiredCapabilities:
  - tasks.read
  - events.read
optionalCapabilities:
  - messages.read
  - documents.read
inputs:
  schema: schemas/input.schema.json
outputs:
  artifacts:
    - type: daily_note
      target: Daily/{{date}}.md
  schema: schemas/output.schema.json
execution:
  mode: agent
  executorCompatibility:
    - codex
    - opencode
approvalPolicy:
  mode: preview_before_write
triggers:
  - type: manual
  - type: scheduled
    cron: "0 7 * * 1-5"
tags:
  - daily
  - planning
  - command-center
```

## Skill package structure

Recommended v1 layout:

```text
.command-center/skills/daily-briefing/
  skill.yaml
  README.md
  prompts/
    instructions.md
    system.md
  templates/
    daily-note.md
  schemas/
    input.schema.json
    output.schema.json
  fixtures/
    tasks.json
    events.json
    messages.json
  tests/
    daily-briefing.test.ts
```

## Skill responsibilities

A skill is responsible for:
- declaring metadata
- declaring required capabilities
- defining expected inputs and outputs
- defining or referencing instructions/templates
- producing outputs that conform to declared contracts
- shipping fixtures/tests where appropriate

A skill is not responsible for:
- connector auth
- provider-specific schema normalization
- core runtime orchestration

## Execution model

At runtime:
1. the host discovers the skill manifest
2. required capabilities are resolved
3. inputs are assembled from canonical entities and runtime context
4. an executor is selected
5. the executor receives the structured context plus referenced prompt/template files
6. outputs are validated against declared output expectations
7. artifacts are written and logged

## Approval model

The skill manifest must support approval/policy declarations.

Initial v1 modes:
- `read_only`
- `preview_before_write`
- `auto_write`
- `approval_required_for_side_effects`

These policies inform host behavior but do not replace broader runtime permission checks.

## Why this decision was made

A declarative manifest is necessary because:
- community authors need a predictable format
- skills must be discoverable and versionable
- hosts must know what a skill requires before execution
- users need visibility into behavior and permissions

## Consequences

### Positive consequences
- skills are more portable and testable
- the ecosystem has a stable packaging format
- hosts can validate dependencies before running a skill
- security/trust UX becomes possible

### Negative consequences
- skill authors must learn the manifest format
- some simple one-off skills may feel more formal than necessary

## Alternatives considered

### Alternative A: prompts-only skills
Rejected because they are difficult to validate, trust, and package consistently.

### Alternative B: arbitrary script entrypoints without manifest standardization
Rejected because they make discovery and permission handling weak.

### Alternative C: declarative manifest with optional assets/scripts
Selected.

## Summary

Skills will be packaged using a standard `skill.yaml` manifest that defines metadata, capabilities, inputs, outputs, execution compatibility, and approval behavior.

---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model|ADR-002: Canonical Entity Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004: Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr005_executor_interface|ADR-005: Executor Interface]]
- [[06_Shared_Knowledge/srgnt_framework_product_concept|srgnt Product Concept]]
