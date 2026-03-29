---
note_type: shared_knowledge
title: Dataview Compatibility Strategy
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - dataview
---

## 14. Dataview Compatibility Strategy

### Purpose
Define how the product should incorporate Dataview-like querying without reinventing a query language from scratch.

## Recommendation
Do not invent a new query language from zero.

Instead:
- use Obsidian Dataview as the conceptual starting point
- investigate forking or extracting reusable parts of the Dataview codebase
- preserve as much practical query familiarity as makes sense
- replace Obsidian-specific runtime assumptions with product-native workspace integrations

## Strategic goal
Build a **Dataview-inspired or partially Dataview-compatible query engine** for a standalone operations workspace.

Not:
- a hard dependence on Obsidian
- a direct copy of the entire Obsidian plugin model
- a chat-only or dashboard-only ad hoc query layer

## Why this approach
Benefits:
- users get a relatively approachable query language
- dashboard builders and advanced users can learn from existing Dataview mental models
- engineering avoids unnecessary parser and language-design work
- the product gains a strong, user-extensible query story early

## Likely adaptation boundaries
The product should attempt to reuse or preserve where valuable:
- parser and AST concepts
- query pipeline/filter/sort semantics
- familiar result forms such as list/table/calendar-like outputs
- JavaScript or advanced query escape hatches later if safe and appropriate

The product should replace or rework:
- Obsidian plugin runtime assumptions
- Obsidian vault API assumptions
- Obsidian-specific rendering and UI bindings
- note/page-only worldview

## Product-native extensions
Unlike vanilla Dataview usage in a notes app, this product should extend queryability to product-native operational objects such as:
- Run
- FollowUp
- InboxItem
- WatchItem
- ApprovalRequest
- Workflow

This is one of the key opportunities to make the query system more powerful than a note-centric clone.

## Compatibility philosophy
Recommended compatibility stance:
- aim for a practical compatibility subset first
- document divergences clearly
- prioritize stability and useful coverage over perfect parity
- extend with product-native features only after the foundation is stable

## Implementation phases
### Phase 1: research
- audit Dataview architecture
- identify reusable parser/evaluator/index concepts
- identify Obsidian-specific coupling points

### Phase 2: compatibility surface definition
- define supported syntax subset for v1
- define product-native object exposure model
- define supported output/result types

### Phase 3: local integration
- integrate query engine into workspace index layer
- expose queries to dashboards, saved views, artifact lists, and review surfaces

### Phase 4: extension
- add product-native query helpers
- add richer aggregations or widget-specific support later

## Licensing and maintenance note
If Dataview code is forked or adapted, licensing, attribution, and long-term maintenance ownership must be handled explicitly.

## Summary
The product should adopt a Dataview-inspired compatibility strategy: reuse and adapt proven query concepts where possible, preserve user familiarity, and integrate them into a standalone local-first operations workspace rather than building a brand-new query language from scratch.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]
