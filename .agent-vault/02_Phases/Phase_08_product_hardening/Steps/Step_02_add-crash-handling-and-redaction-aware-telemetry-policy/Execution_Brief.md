# Execution Brief

## Step Overview

Make failures observable without violating the product's privacy and local-first posture.

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

## Execution Prompt

1. Implement crash handling and define the redaction-aware telemetry policy together so operational visibility and privacy stay aligned.
2. Classify which events may be captured locally, which may be sent remotely later, and which content must never leave the device.
3. Add one validation path that exercises a controlled failure and confirms the resulting crash/telemetry behavior matches policy.
4. Update notes with the policy boundaries, storage locations, and any unresolved compliance concern.

## Related Notes

- Step: [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]
- Phase: [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
