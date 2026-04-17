# Fred Premium Workflow Design

## Overview

This document describes the design for premium workflows orchestrated by Fred, the optional AI orchestration layer. It covers what premium workflows are, how Fred executes them, how results flow back to the base product without creating coupling, and the integration points with base product features.

For the underlying architecture and data minimization rules, see [fred-architecture](./fred-architecture.md) and STEP-10-02. For the entitlement framework that gates access to premium features, see STEP-10-01 and its entitlement table.

## What Are Premium Workflows

Premium workflows are high-value, AI-assisted operations that enhance the base command center experience. They are:

- **Additive** — the base product remains fully functional without them
- **Entitlement-gated** — access requires an active premium subscription
- **Data-minimized** — Fred receives only the context required for each specific workflow
- **Policy-aware** — all premium flows respect the data classification boundaries established in Phase 09

Premium workflows operate on top of the base workflow model established in Phase 05. They do not replace or modify base workflow execution paths.

## Premium Workflow Catalog

The following premium workflow families are in scope for the premium Fred layer:

### 1. AI-Synthesized Daily Briefing

**STEP-10-01 entitlement cross-reference**: Uses entitlement key `fred:synthesized-briefing` from the STEP-10-01 entitlement table.

**What it does**: Produces an enhanced morning briefing that synthesizes content from connected connectors (calendar, tasks, messages) with workspace knowledge.

**Base version**: The base daily briefing artifact pipeline (Phase 05) generates a structured briefing from connector data.

**Premium enhancement**: Fred generates a written narrative synthesis — connecting patterns across sources, flagging conflicts between calendar and task state, and surfacing relevant workspace notes that mention today's focus areas.

**Entitlement key**: `fred:synthesized-briefing`

**Required tier**: premium

**Minimization compliance**: STEP-10-02 compliant — Fred receives only the day's calendar block titles, task titles, and referenced workspace note excerpts, never full file contents or unrestricted workspace access.

**Layers over base**: Enhances the existing base daily briefing artifact pipeline; if premium is disabled, the base briefing still works unchanged.

### 2. Smart Scheduling Assistant

**STEP-10-01 entitlement cross-reference**: Uses entitlement key `fred:smart-scheduling` from the STEP-10-01 entitlement table.

**What it does**: Proposes optimal meeting times based on attendee availability, focus time preferences, and existing commitments.

**Base version**: The calendar connector shows availability and lets users create events manually.

**Premium enhancement**: Fred analyzes calendar patterns, asks about scheduling preferences, and proposes specific time slots with rationale. The user approves or adjusts before any calendar write occurs.

**Entitlement key**: `fred:smart-scheduling`

**Required tier**: premium

**Minimization compliance**: STEP-10-02 compliant — Fred receives anonymized availability windows and stated preferences, not raw email content, credentials, or attendee contact details beyond the approved calendar scope.

**Layers over base**: Sits on top of the existing calendar connector and manual event creation flow; the base scheduling workflow remains complete without Fred.

### 3. Cross-Connector Synthesis

**STEP-10-01 entitlement cross-reference**: Uses entitlement key `fred:cross-connector-synthesis` from the STEP-10-01 entitlement table.

**What it does**: Generates a unified view of a topic across Jira, calendar, messages, and workspace notes.

**Base version**: Each connector surface is queried independently through Dataview.

**Premium enhancement**: Fred accepts a natural-language query ("what's the status of the Q2 launch across all my sources?"), gathers relevant excerpts through the data accessor, and produces a synthesized answer with source citations.

**Entitlement key**: `fred:cross-connector-synthesis`

**Required tier**: premium

**Minimization compliance**: STEP-10-02 compliant — each connector's data accessor applies minimization before content leaves the device, and Fred never receives full raw connector payloads or full-workspace queries.

**Layers over base**: Builds on existing connector surfaces and Dataview queries instead of replacing them; users can still inspect each source independently in the base product.

### 4. Artifact-Enhanced Command Execution

**STEP-10-01 entitlement cross-reference**: Uses entitlement key `fred:artifact-enhancement` from the STEP-10-01 entitlement table.

**What it does**: When a user runs a terminal command, Fred can suggest related artifacts, explain what a command will do based on workspace context, or offer to create a follow-up artifact after execution.

**Base version**: Terminal executes commands with artifact context injection (Phase 07).

**Premium enhancement**: Fred provides pre-execution context suggestions and post-execution artifact generation. This layers on top of the existing execution pipeline without modifying it.

**Entitlement key**: `fred:artifact-enhancement`

**Required tier**: premium

**Minimization compliance**: STEP-10-02 compliant — Fred receives only the command being executed and artifact references already attached to the run, not arbitrary workspace content, secrets, or transcripts outside the approved scope.

**Layers over base**: Adds optional pre/post execution assistance around the existing base executor pipeline; command execution itself remains a base feature.

### 5. Proactive Opportunity Detection

**STEP-10-01 entitlement cross-reference**: Uses entitlement key `fred:proactive-nudges` from the STEP-10-01 entitlement table.

**What it does**: Periodically scans calendar, tasks, and workspace notes to surface implicit opportunities or risks (e.g., a meeting that conflicts with a deadline, a task that hasn't been updated despite elapsed time).

**Base version**: No equivalent in the base product.

**Premium enhancement**: Fred generates periodic nudge notifications surfaced through the notification system. All suggestions are presented to the user, never auto-applied.

**Entitlement key**: `fred:proactive-nudges`

**Required tier**: premium

**Minimization compliance**: STEP-10-02 compliant — Fred receives only metadata (titles, dates, status indicators), never meeting-note bodies, task descriptions, credentials, or unrestricted workspace content.

**Layers over base**: Adds optional notifications through the existing notification system; no base workflow depends on premium nudges to function.

## How Fred Orchestrates Premium Workflows

### Orchestration Model

Fred uses a request-response orchestration model with explicit user consent at every step:

```
User Action
    │
    ▼
Base Product UI Layer
    │
    ▼ (entitlement check)
Entitlements Package (isFeatureAvailable)
    │
    ▼ (granted)
Fred Integration Layer
    │
    ▼ (workflowId + minimized context)
Fred Orchestrator (IFredOrchestrator)
    │
    ▼ (workflow execution)
Fred Service (hosted)
    │
    ▼ (structured result)
Fred Integration Layer
    │
    ▼ (normalization)
Base Product Artifact / Notification / UI Update
```

### Workflow Execution Interface

Fred exposes `IFredOrchestrator` for workflow execution:

```typescript
interface IFredOrchestrator {
  executeWorkflow(
    request: FredWorkflowRequest
  ): Promise<FredWorkflowResult>;

  getAvailableWorkflows(
    entitlement: UserEntitlements
  ): WorkflowDescriptor[];

  getStatus(): FredConnectionStatus;
}
```

`FredWorkflowRequest` carries everything Fred needs to execute a specific workflow:

```typescript
interface FredWorkflowRequest {
  workflowId: WorkflowId;
  context: MinimizedPayload;
  userConsent: UserConsent;
  correlationId: string;
}
```

### Data Flow Through the Integration Layer

The Fred integration layer (inside the base product's main process) is responsible for:

1. **Entitlement verification** — confirming the user has access before sending any data
2. **Context assembly** — gathering the minimum required data for the requested workflow through `IFredDataAccessor`
3. **Redaction enforcement** — applying classification-based redaction before payload construction
4. **Payload shaping** — building the `MinimizedPayload` that Fred receives
5. **Result normalization** — transforming Fred's output into base product artifacts or actions

The base product never sends raw workspace content to Fred. Every field in the `MinimizedPayload` is explicitly selected and reviewed against the minimization rules.

## Receiving Results Without Base Coupling

### The Decoupling Principle

The base product must function completely whether Fred is available, unavailable, or disabled. This is achieved through:

1. **Interface-based integration** — base product calls `IFredOrchestrator` through an abstraction, not a concrete Fred class
2. **Result normalization** — Fred results always conform to base product artifact schemas
3. **Graceful degradation** — when Fred is unavailable, premium features show appropriate messaging, not errors
4. **No runtime Fred imports in base packages** — `packages/fred/` is isolated; base packages do not import from it

### Result Types and Their Base Equivalents

Every premium workflow produces one of these result types, all of which have equivalent base product structures:

| Premium Result Type | Base Equivalent | Notes |
|--------------------|----------------|-------|
| `AIBriefingContent` | `BriefingArtifact` | Same artifact schema, AI-enhanced content |
| `SchedulingProposal` | `CalendarEventDraft` | User approval required before write |
| `SynthesisResult` | `DataviewQueryResult` | Structured with source citations |
| `ArtifactSuggestion` | `ArtifactReference` | Presented as user option, not auto-applied |
| `NudgeNotification` | `UserNotification` | Same notification surface |

### Workflow Result Schema

```typescript
interface FredWorkflowResult {
  workflowId: WorkflowId;
  correlationId: string;
  output: WorkflowOutput;
  audit: FredWorkflowAudit;
  expiresAt: number;
}

interface FredWorkflowAudit {
  dataAccessed: DataAccessRecord[];
  tokensUsed?: number;
  modelUsed?: string;
  minimizationApplied: boolean;
}
```

The base product consumes `output` and `audit.dataAccessed` for display and records. It never needs to interpret internal Fred processing details.

## Step Definitions for Premium Workflows

Each premium workflow follows a defined step sequence. These steps are enforced by the Fred integration layer, not by Fred itself.

### Step Sequence: AI-Synthesized Briefing

```
STEP 1: Trigger
  - User navigates to Today view, or
  - Scheduled trigger at configured briefing time (if premium enabled)

STEP 2: Entitlement Check
  - Call IEntitlementChecker.checkAccess('fred:synthesized-briefing')
  - If denied: show upgrade prompt, fall back to base briefing

STEP 3: Context Assembly (via IFredDataAccessor)
  - Fetch today's calendar blocks (titles, times, attendee count)
  - Fetch today's tasks (titles, status, due dates)
  - Fetch workspace note excerpts referencing today's focus keywords
  - Apply redaction per classification matrix

STEP 4: Consent Confirmation
  - Display "Fred will analyze your today's agenda to generate a synthesis"
  - User confirms or declines

STEP 5: Orchestrator Execution
  - Call IFredOrchestrator.executeWorkflow() with assembled context

STEP 6: Result Normalization
  - Transform AIBriefingContent into BriefingArtifact format
  - Attach audit trail

STEP 7: Artifact Injection
  - Insert normalized result into the Today view artifact pipeline
  - User sees enhanced briefing alongside base briefing content
```

### Step Sequence: Smart Scheduling

```
STEP 1: Trigger
  - User clicks "Find a time" on a calendar event, or
  - Fred proactively suggests scheduling for a task with a due date but no time

STEP 2: Entitlement Check
  - Call IEntitlementChecker.checkAccess('fred:smart-scheduling')

STEP 3: Preference Collection
  - Ask user for meeting duration, hard constraints, soft preferences
  - Fred uses these as scheduling inputs

STEP 4: Context Assembly
  - Fetch attendee availability via calendar connector
  - Fetch existing commitments for the target date range
  - Fred receives anonymized availability windows, not contact details

STEP 5: Orchestrator Execution
  - Call IFredOrchestrator.executeWorkflow() with availability context

STEP 6: Proposal Display
  - Present 2-3 time slot proposals with rationale
  - User selects one or declines

STEP 7: Calendar Write (if user selects)
  - Base calendar connector executes the write
  - Fred result is discarded; only user-approved action persists
```

### Step Sequence: Cross-Connector Synthesis

```
STEP 1: Trigger
  - User types a natural-language query in the Command Center search, or
  - Fred proactively surfaces a synthesis when patterns across sources are detected

STEP 2: Entitlement Check
  - Call IEntitlementChecker.checkAccess('fred:cross-connector-synthesis')

STEP 3: Source Selection
  - Determine which connectors are relevant based on the query
  - Request context from each through IFredDataAccessor with per-connector scopes

STEP 4: Orchestrator Execution
  - Call IFredOrchestrator.executeWorkflow() with multi-source minimized payload

STEP 5: Result Display
  - Present SynthesisResult with inline source citations
  - Each citation links back to the source connector surface

STEP 6: Follow-up Actions
  - User can drill into any cited item for full source context
  - No data is retained by Fred after the session
```

### Step Sequence: Artifact Enhancement

```
STEP 1: Trigger
  - User initiates a terminal run, or
  - A run completes and Fred detects an artifact opportunity

STEP 2: Entitlement Check
  - Call IEntitlementChecker.checkAccess('fred:artifact-enhancement')

STEP 3: Context Assembly (pre-execution)
  - Attach relevant artifact references and workspace context
  - Fred may suggest additions before execution

STEP 4: Orchestrator Execution (pre-execution suggestion)
  - If pre-execution: generate suggestions, present to user
  - User approves or skips

STEP 5: Terminal Execution (base workflow, unchanged)
  - Command runs through standard executor pipeline

STEP 6: Orchestrator Execution (post-execution)
  - Fred analyzes run output and context
  - Generates artifact suggestion if warranted

STEP 7: Suggestion Presentation
  - Present ArtifactSuggestion as a dismissible option
  - User can create the artifact or dismiss
```

### Step Sequence: Proactive Nudges

```
STEP 1: Trigger
  - Scheduled background job (runs when premium is active and user is idle)
  - Frequency: configurable, default once per hour

STEP 2: Entitlement Check
  - Verify premium status before running any checks

STEP 3: Lightweight Analysis
  - Fred evaluates calendar, task, and workspace metadata only
  - No content is read unless a potential opportunity is flagged

STEP 4: Nudge Generation (if applicable)
  - Produce a NudgeNotification with a specific, actionable message
  - No auto-actions; user must approve any proposed change

STEP 5: Notification Delivery
  - Surface through the base notification system
  - User can dismiss, snooze, or act on the nudge
```

## Integration With Base Product

### Integration Points

Fred integrates with the base product at the following surfaces:

| Base Product Surface | Integration Type | Description |
|---------------------|-----------------|-------------|
| Today View | Artifact injection | AI-synthesized briefing injects into briefing pipeline |
| Command Center | Query intercept | Natural-language queries route to Fred when entitlement is active |
| Calendar Surface | Scheduling proposals | Fred proposals appear as draft events pending user approval |
| Terminal Surface | Context enrichment | Pre/post execution hooks for artifact suggestions |
| Notifications | Proactive nudges | Nudges delivered through the base notification system |
| Settings | Entitlement display | Premium features visible but gated in settings UI |

### Integration Architecture

```
Base Product Packages
    │
    ├── packages/desktop/          (UI, views, surfaces)
    │       └── No Fred imports
    │
    ├── packages/runtime/          (workflows, artifacts, executor)
    │       └── No Fred imports
    │
    ├── packages/entitlements/     (entitlement checking)
    │       └── No Fred imports
    │
    └── packages/fred/             (Fred integration layer)
            ├── IFredOrchestrator
            ├── IFredDataAccessor
            ├── FredWorkflowRequest / Result schemas
            └── No imports FROM desktop, runtime, or entitlements packages
```

The `packages/fred/` package may import from `packages/contracts/` for shared schemas and interfaces. It must not import from base-product packages such as `packages/desktop/`, `packages/runtime/`, or `packages/entitlements/`.

### AI Summarization Integration

The base product's daily briefing pipeline (Phase 05) produces structured data artifacts. Fred's synthesized briefing:

1. Receives the same structured data as the base briefing
2. Applies an additional LLM processing step to produce narrative synthesis
3. Returns a `BriefingArtifact` with the same schema as the base briefing, with an additional `aiEnhanced: true` flag
4. The UI layer renders the artifact identically regardless of whether `aiEnhanced` is set

This means the UI never needs to know whether content came from Fred or the base pipeline — it just renders the artifact.

### Smart Scheduling Integration

Smart scheduling does not write to the calendar directly. The flow is:

1. Fred proposes time slots as `SchedulingProposal` objects
2. The base calendar surface displays proposals as draft suggestions
3. User selects a slot
4. The base calendar connector performs the actual write operation
5. Fred is never trusted with direct credential access

This preserves the security boundary: Fred cannot schedule events without explicit user approval through the base calendar connector.

### Consent Model

Every premium workflow that sends data to Fred requires explicit user consent. Consent is:

- **Per-workflow** — users approve each workflow type separately
- **Recorded** — consent events are logged in the audit trail
- **Revocable** — users can withdraw consent at any time through settings
- **Transparent** — users see exactly what data categories Fred will access before approving

### Offline Behavior

Premium workflows require network access to reach the Fred service. When offline:

- Entitlement checks continue to work (local config)
- Available workflows are still enumerated but show "unavailable offline" status
- Scheduled proactive nudges are skipped
- In-flight requests are cancelled gracefully with appropriate messaging

The base product's offline story (fully functional without network) is preserved for all non-Fred features.

## Minimization Rules for Premium Workflows

Each premium workflow must declare its data access scope at design time. The Fred integration layer enforces these scopes at runtime.

### Scope Declaration Pattern

```typescript
const WORKFLOW_SCOPES: Record<WorkflowId, DataAccessScope> = {
  'fred:synthesized-briefing': {
    calendar: ['titles', 'times', 'attendee-count'],
    tasks: ['titles', 'status', 'due-dates'],
    workspace: ['referenced-excerpts-only'],
  },
  'fred:smart-scheduling': {
    calendar: ['availability-windows', 'constraints'],
    tasks: ['duration-estimates'],
    workspace: [],
  },
  'fred:cross-connector-synthesis': {
    calendar: ['titles', 'relevant-content-snippets'],
    tasks: ['titles', 'status', 'relevant-snippets'],
    workspace: ['relevant-snippets'],
    connectors: ['relevant-excerpts'],
  },
};
```

### Hard Boundaries

The following data must never leave the device for any premium workflow:

- Raw file contents beyond explicitly referenced excerpts
- Secret values, credentials, or API keys
- Full email message bodies
- Raw connector payloads (only pre-approved excerpt fields)
- Any data classified as `local-only` in the Phase 09 classification matrix

## Rejected Concepts

The following premium concepts were considered and rejected because they would have coupled the base product to Fred:

### Rejected: Fred-as-Default Terminal Copilot

**Concept**: Replace the base terminal execution path with Fred as the primary executor.
**Rejection rationale**: This would make the base terminal unusable without an active Fred connection. Terminal execution must remain a base product feature. Artifact enhancement (optional pre/post hooks) is the correct layering.

### Rejected: Automatic Workspace Indexing by Fred

**Concept**: Let Fred maintain its own full-text index of the workspace for premium search.
**Rejection rationale**: This would create a second, Fred-owned data store that the base product depends on for search functionality. The base semantic search layer (Phases 15-18) must remain self-contained. Fred can use the base search index through the data accessor, not replace it.

### Rejected: Fred-Driven Automated Task Updates

**Concept**: Let Fred auto-update task status based on calendar and message analysis without user approval.
**Rejection rationale**: Auto-writing task changes without explicit user approval violates the trust model. All Fred task interactions must surface as suggestions, not auto-applied changes. This is already addressed by the smart scheduling and nudge designs, which require user approval.

## Implementation Notes

- Premium workflow interfaces are defined in `packages/fred/src/interfaces/`
- Schema definitions use Effect Schema per DEC-0002
- All workflow IDs follow the `fred:<workflow-name>` pattern for consistent entitlement mapping
- The Fred integration layer lives in the main process only — no Fred logic runs in the renderer
- Premium UI surfaces (synthesis display, proposal cards, nudge toasts) are part of the base desktop package but are entitlement-gated

## Related Documentation

- [fred-architecture](./fred-architecture.md) — Fred boundary, data minimization rules, and API surface
- [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_01_define-entitlements-and-base-vs-premium-contracts|STEP-10-01 Define Entitlements And Base Vs Premium Contracts]] — entitlement table and premium tier definitions
- [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules|STEP-10-02 Specify Fred Integration Boundary And Minimization Rules]] — minimization rules this document complies with
- [Data Classification Matrix](./data-classification-matrix.md) — Data classes that Fred minimization rules are built on
- [Daily Command Center Workflow](./srgnt_framework_daily_command_center_workflow.md) — Base workflow that premium workflows layer onto
- [Phase 05 Flagship Workflow](../02_Phases/Phase_05_flagship_workflow/Phase.md) — Foundation for the base workflow model
