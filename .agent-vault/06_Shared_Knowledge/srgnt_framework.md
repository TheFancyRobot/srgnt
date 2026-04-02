---
note_type: shared_knowledge
title: srgnt Product and Architecture Foundation
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - architecture
---

# srgnt Product and Architecture Foundation

This document has been decomposed into focused, linkable notes for better navigability and maintainability. Each section below links to a dedicated note covering that topic in full detail.

## Product and V1 Planning

| Section | Note |
|---|---|
| Product Concept | [[06_Shared_Knowledge/srgnt_framework_product_concept\|Product Concept]] |
| V1 One Pager | [[06_Shared_Knowledge/srgnt_framework_v1_one_pager\|V1 One Pager]] |
| V1 Scope and Non-Goals | [[06_Shared_Knowledge/srgnt_framework_v1_scope_and_nongoals\|V1 Scope and Non-Goals]] |
| UX Direction | [[06_Shared_Knowledge/srgnt_framework_ux_direction\|UX Direction]] |
| Milestone Roadmap | [[06_Shared_Knowledge/srgnt_framework_milestone_roadmap\|Milestone Roadmap]] |

## Architecture Decision Records

| Section | Note |
|---|---|
| ADR-002: Canonical Entity Model | [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model\|Canonical Entity Model]] |
| ADR-003: Skill Manifest | [[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest\|Skill Manifest]] |
| ADR-004: Connector Contract | [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract\|Connector Contract]] |
| ADR-005: Executor Interface | [[06_Shared_Knowledge/srgnt_framework_adr005_executor_interface\|Executor Interface]] |

## System Architecture

| Section | Note |
|---|---|
| Base Product Architecture | [[06_Shared_Knowledge/srgnt_framework_base_product_architecture\|Base Product Architecture]] |
| Fred Integration Architecture | [[06_Shared_Knowledge/srgnt_framework_fred_integration\|Fred Integration Architecture]] |
| Security Boundary Model | [[06_Shared_Knowledge/srgnt_framework_security_boundary_model\|Security Boundary Model]] |
| Desktop Technical Design | [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design\|Desktop Technical Design]] |
| Repo and Package Structure | [[06_Shared_Knowledge/srgnt_framework_repo_package_structure\|Repo and Package Structure]] |

## Domain and Data

| Section | Note |
|---|---|
| Workspace Domain Model | [[06_Shared_Knowledge/srgnt_framework_workspace_domain_model\|Workspace Domain Model]] |
| Navigation and IA | [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia\|Navigation and IA]] |
| Daily Command Center Workflow | [[06_Shared_Knowledge/srgnt_framework_daily_command_center_workflow\|Daily Command Center Workflow]] |
| Calendar Domain Spec | [[06_Shared_Knowledge/srgnt_framework_calendar_domain_spec\|Calendar Domain Spec]] |
| Data Classification Matrix | [[06_Shared_Knowledge/srgnt_framework_data_classification_matrix\|Data Classification Matrix]] |

## UI and Components

| Section | Note |
|---|---|
| Wireframes and Screens | [[06_Shared_Knowledge/srgnt_framework_wireframes_and_screens\|Wireframes and Screens]] |
| Component Inventory and Data Contracts | [[06_Shared_Knowledge/srgnt_framework_component_inventory_and_data_contracts\|Component Inventory and Data Contracts]] |

## Technical Design

| Section | Note |
|---|---|
| Query and Index Architecture | [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture\|Query and Index Architecture]] |
| Dataview Strategy | [[06_Shared_Knowledge/srgnt_framework_dataview_strategy\|Dataview Strategy]] |
| Local-First Storage | [[06_Shared_Knowledge/srgnt_framework_local_first_storage\|Local-First Storage]] |
| Sync Service Design | [[06_Shared_Knowledge/srgnt_framework_sync_service_design\|Sync Service Design]] |
| Pre-Dev Readiness Checklist | [[06_Shared_Knowledge/srgnt_framework_predev_readiness_checklist|Pre-Dev Readiness Checklist]] |

## Related Notes

- [[00_Home/Roadmap|Roadmap]]
- [[00_Home/Active_Context|Active Context]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Domain_Model|Domain Model]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
- [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
- [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]]
- [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-First Product Boundary]]
- [[04_Decisions/DEC-0002_use-typescript-zod-for-all-contracts-and-schemas|DEC-0002 TypeScript + Zod Contracts]]
- [[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005 pnpm Monorepo]]
- [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Dataview Local Data Layer]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-Backed Record Contract]]
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]]
- [[06_Shared_Knowledge/terminology_rules|Terminology Rules]]
- [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]]
