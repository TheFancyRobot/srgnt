---
note_type: knowledge
title: Telemetry Policy
status: active
created: 2026-03-28
updated: 2026-03-28
tags:
  - telemetry
  - privacy
  - security
---

# Telemetry Policy

This document defines the v1 privacy posture for crash evidence, update checks, and any future telemetry expansion.

## v1 Default

- Local-first and local-only by default.
- No remote telemetry is sent automatically.
- Redaction happens before crash payloads are written to disk.
- Any future remote reporting remains opt-in and requires a new decision note.

## Allowed Data Classes

### Category A: Local-only structured diagnostics

These may be written locally after redaction:

- crash timestamp and error type
- redacted error message
- redacted stack trace
- update-check status (`available`, `not-available`, `error`, `skipped`)
- feature-level settings such as theme, update channel, and connector enabled state

### Category B: Potential future remote telemetry (opt-in only)

These are not transmitted today, but are the outer limit for a future opt-in path:

- startup and shutdown events without file paths
- screen navigation names
- coarse performance timings
- crash counts and error categories without stack traces

### Category C: Never capture

These must never be stored or transmitted as telemetry payloads:

- workspace markdown or artifact content
- absolute workspace file paths
- connector tokens or OAuth callback parameters
- terminal command output
- user-entered prompt text
- raw connector API payloads

## Redaction Rules

Before any crash payload is persisted, the app redacts:

- the configured workspace root
- unix and windows absolute paths
- email addresses
- token/password/secret style key-value pairs
- OAuth/access-token style values

## Current Implementation

- Main-process crash reports are written to `app.getPath('userData')/crashes/`.
- Renderer failures are contained by an error boundary that shows a fallback screen instead of a blank window.
- The Settings screen exposes two privacy toggles:
  - `Allow Redacted Usage Telemetry`
  - `Allow Future Crash Uploads`

These toggles record consent state only. They do not enable remote transmission in v1.

## Validation Paths

- `pnpm --filter @srgnt/desktop test` covers crash redaction helpers.
- `pnpm --filter @srgnt/desktop test:e2e` writes a diagnostic crash log and verifies workspace paths are absent from the saved payload.
- The Settings screen includes a `Write Crash Log` action for release QA.

## Related Notes

- [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]
- [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]
