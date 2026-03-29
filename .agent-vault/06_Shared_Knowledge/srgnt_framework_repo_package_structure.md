---
note_type: shared_knowledge
title: Repo and Package Structure
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - architecture
  - monorepo
  - structure
  - tooling
---

# Initial Repo / Package Structure

## Purpose
Define a repo structure that supports:
- desktop app development
- future mobile app development
- shared core packages
- sync and Fred services later
- community/package ecosystem evolution later

## Recommended monorepo structure

```text
repo/
  apps/
    desktop/
    mobile/
    marketing-site/
  services/
    sync/
    fred/
  packages/
    core-entities/
    core-manifests/
    core-runtime/
    core-policy/
    core-artifacts/
    core-connectors/
    core-skills/
    core-executors/
    ui-system/
    connector-jira/
    connector-outlook-calendar/
    connector-teams/
    skill-daily-briefing/
    executor-terminal/
  tooling/
    build/
    scripts/
    test-fixtures/
  docs/
    adr/
    product/
    architecture/
```

## App packages

### `apps/desktop`
Contains:
- Electron shell
- React renderer app
- preload layer
- desktop-specific wiring
- updater integration
- local workspace bootstrapping

### `apps/mobile`
Later package for mobile clients built on shared contracts.

### `apps/marketing-site`
Optional but useful for product site/docs/landing pages.

## Service packages

### `services/sync`
Future encrypted sync backend.
Likely candidate for Convex-backed implementation.

### `services/fred`
Premium orchestration backend/service layer.
May use Convex and/or other components as needed.

## Core shared packages

### `packages/core-entities`
Canonical entity definitions, schemas, transforms.

### `packages/core-manifests`
Skill/connector/executor manifest parsing and validation.

### `packages/core-runtime`
Run orchestration, dependency resolution, context assembly.

### `packages/core-policy`
Permissions, approval rules, sensitivity/data policies.

### `packages/core-artifacts`
Artifact model, storage contracts, metadata handling.

### `packages/core-connectors`
Connector SDK/contracts/shared helpers.

### `packages/core-skills`
Skill SDK/contracts/shared helpers.

### `packages/core-executors`
Executor interfaces and shared execution types.

### `packages/ui-system`
Shared design system and UI primitives.

## First-party package examples

### `packages/connector-jira`
Jira connector implementation.

### `packages/connector-outlook-calendar`
Calendar connector implementation.

### `packages/connector-teams`
Teams connector implementation.

### `packages/skill-daily-briefing`
Flagship v1 workflow package.

### `packages/executor-terminal`
Desktop integration for terminal-oriented execution flows.

## Tooling and docs

### `tooling/test-fixtures`
Shared provider fixtures, skill fixtures, synthetic workspaces, sample entities.

### `docs/adr`
Architecture decision records.

### `docs/product`
Product one-pagers, roadmap, packaging, monetization notes.

### `docs/architecture`
Technical designs, diagrams, security models.

## Why this structure was chosen
This structure:
- keeps app shells separate from core logic
- allows mobile later without rethinking shared contracts
- allows sync and Fred to evolve independently
- supports future packaging/community contributions
- keeps product and architecture documentation close to code

## Summary
A monorepo with separate app, service, and shared-core packages is the healthiest path for the productized architecture.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- [[06_Shared_Knowledge/srgnt_framework_base_product_architecture|Base Product Architecture]]
