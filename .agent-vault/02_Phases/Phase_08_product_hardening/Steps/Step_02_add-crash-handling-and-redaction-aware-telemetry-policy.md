---
note_type: step
template_version: 2
contract_version: 1
title: Add Crash Handling And Redaction Aware Telemetry Policy
step_id: STEP-08-02
phase: '[[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-28'
depends_on:
  - PHASE-07
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Add Crash Handling And Redaction Aware Telemetry Policy

Make failures observable without violating the product's privacy and local-first posture.

## Purpose

- Add crash capture/recovery behavior and define what telemetry is allowed, redacted, or forbidden.
- Preserve enough signal for support and QA without leaking workspace content.

## Why This Step Exists

- The framework names redaction-aware telemetry as part of product hardening.
- Privacy and audit posture degrade quickly if error reporting is added informally after the fact.

## Prerequisites

- Complete the earlier runtime, workflow, and terminal phases so real failure modes are visible.

## Relevant Code Paths

- `packages/desktop/main/`
- `packages/desktop/renderer/`
- `packages/runtime/`
- crash/telemetry config files chosen in this step

## Required Reading

- [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/telemetry-policy|Telemetry Policy]]

## Execution Prompt

1. Implement crash handling and define the redaction-aware telemetry policy together so operational visibility and privacy stay aligned.
2. Classify which events may be captured locally, which may be sent remotely later, and which content must never leave the device.
3. Add one validation path that exercises a controlled failure and confirms the resulting crash/telemetry behavior matches policy.
4. Update notes with the policy boundaries, storage locations, and any unresolved compliance concern.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-28
- Next action: Carry the same redaction rules into later sync and premium telemetry work.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Sensitive workspace content should default to redacted or local-only handling.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Error boundary component(s) in `packages/desktop/renderer/` — React error boundaries wrapping major UI regions with graceful fallback UI
- Crash handler in `packages/desktop/main/` — `process.on('uncaughtException')` and `process.on('unhandledRejection')` with local crash log writing
- Telemetry policy document in `.agent-vault/06_Shared_Knowledge/telemetry-policy.md` classifying events into: (a) local-only, (b) may-send-redacted, (c) never-capture
- Redaction utility in `packages/runtime/` (or `packages/telemetry/`) — a function that strips workspace content, file paths, and user data from error payloads before any potential remote send
- Crash report local storage: crash logs written under `app.getPath('userData')/crashes/` (or equivalent platform-safe path) with rotation
- Remote crash reporting is explicitly out of scope for this step. If later work wants Sentry or another service, record a dedicated decision note then; the hardening phase must succeed with local-only crash logging.
- One integration test or manual script that triggers a controlled crash and verifies: (a) error boundary catches renderer crash, (b) main process crash is logged locally, (c) crash payload passes through redaction before any write

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — crash payload schemas and telemetry event schemas should be defined with Zod
- DEC-0004 (all three platforms) — crash log paths must work on macOS, Windows, and Linux (use `app.getPath('userData')` or equivalent)
- DEC-0007 (markdown/local data) — crash logs are local files, not database records

**Starting files:**
- `packages/desktop/main/` and `packages/desktop/renderer/` must exist with working Electron app
- `packages/runtime/` must exist (from PHASE-03)
- PHASE-08 STEP-01 packaging pipeline should be complete (so crash handling can be tested in packaged builds)

**Constraints:**
- Do NOT send any telemetry remotely in this step — remote reporting is a future decision. All crash data stays local.
- Do NOT log workspace file contents, user markdown, or file paths in crash reports — redaction is mandatory
- Do NOT make Sentry (or any remote service) a hard dependency — the crash system must function fully offline
- Do NOT capture renderer console.log as telemetry — only structured crash/error events
- Sensitive fields to redact by default: raw workspace markdown/body content, absolute file paths, connector tokens, OAuth callback params, environment variables, and user-entered prompt text

**Validation:**
1. Trigger a renderer error — verify error boundary catches it and shows fallback UI (not a white screen)
2. Trigger a main process unhandled exception — verify crash log is written to the local crashes directory
3. Inspect a crash log payload — verify no workspace content, no file paths, no user-authored text appears
4. Verify Zod schemas exist for crash event and telemetry event types
5. Verify telemetry policy doc exists and classifies at least 5 event categories
6. Run the app with no network — verify crash handling works identically (no remote dependency)

**Junior-readiness verdict:** PASS — the step is now scoped to local-only crash logging plus a redaction policy. The redaction utility has an explicit sensitive-field list, and any future remote reporting choice is intentionally deferred into its own decision note.

## Human Notes

- Do not optimize for analytics convenience at the cost of local-first trust.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means failures are observable and telemetry boundaries are explicit.
- Validation target: controlled crash path plus written redaction policy.
- The desktop app now writes redacted local crash logs, exposes a diagnostic crash-log action for QA, and contains renderer failures with a visible fallback screen instead of a blank window.
