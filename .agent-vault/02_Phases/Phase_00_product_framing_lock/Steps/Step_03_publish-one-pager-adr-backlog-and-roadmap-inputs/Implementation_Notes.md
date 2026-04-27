# Implementation Notes

- Immediate outputs named by the framework: one-pager, ADR set, v1 technical design, package structure, manifest spec, schemas, connector spec, roadmap.
### Refinement (readiness checklist pass)

**Exact outcome**: Three artifacts:
1. **One-pager** at `.agent-vault/06_Shared_Knowledge/srgnt_one_pager.md` — a concise product summary (target user, problem, solution, wedge, success criteria, constraints) that any stakeholder can read in 2 minutes.
2. **ADR backlog** — a list of remaining decisions to be made, seeded as new decision notes in `.agent-vault/04_Decisions/` with status `proposed`. Existing accepted notes DEC-0002 through DEC-0007 should be referenced as already-settled inputs, not reopened.
3. **Updated Roadmap** at `.agent-vault/00_Home/Roadmap.md` — reflect the frozen framing, link to the one-pager and wedge definition, and ensure phase descriptions match the terminology from STEP-00-01.

**Decisions already resolved** (should NOT appear as open ADR seeds):
- DEC-0002: TypeScript + Zod for schemas
- DEC-0003: Teams first, Slack second
- DEC-0004: macOS + Windows + Linux
- DEC-0005: pnpm as package manager
- DEC-0006: PHASE-09/09 produce docs + scaffolding
- DEC-0007: Dataview query engine as local data layer

**Remaining ADR candidates** (should be seeded as `proposed` decisions):
- File-backed record contract: authoritative markdown/YAML records, append-only vs replace-in-place rules, and atomic write expectations
- Renderer stack and routing contract for `packages/desktop/renderer/`
- Shared Microsoft auth and secret-storage boundary for Outlook + Teams
- Packaging/update tooling and release-channel contract
- Crash-reporting posture (local-only vs approved remote reporting later)

**Seed status (2026-03-22 second pass):**
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] seeded as `proposed` for canonical file-backed record lifecycle rules.
- [[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009]] seeded as `proposed` for the renderer stack and v1 route contract.
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010]] seeded as `proposed` for the shared Microsoft auth boundary.
- [[04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1|DEC-0011]] seeded as `proposed` for packaging, updates, and release channels.
- [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012]] seeded as `proposed` for local-only redacted crash reporting.

**Follow-up closure (2026-03-22 third pass):**
- [[06_Shared_Knowledge/terminology_rules|Terminology Rules]] now exists, closing the hidden dependency on STEP-00-01's durable output.
- [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]] now exists, closing the hidden dependency on STEP-00-02's durable output.
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]] now exists and packages the frozen product boundary, wedge, and success criteria into a single stakeholder-facing artifact.
- [[00_Home/Roadmap|Roadmap]] now links to the framing package and no longer contradicts DEC-0003 or DEC-0007.
- PHASE-01, PHASE-02, and PHASE-03 now cite the framing package directly in their dependency sections.

**Validation**:
- `terminology_rules.md`, `v1_wedge_definition.md`, and `srgnt_one_pager.md` all exist and remain concise, durable references.
- Roadmap links to the one-pager and wedge definition and preserves the accepted DEC-0003 and DEC-0007 directions.
- ADR backlog has at least 3 new `proposed` decision notes for remaining choices.
- PHASE-01, PHASE-02, and PHASE-03 each cite at least one framing artifact beyond the roadmap itself.

**Junior-readiness verdict**: PASS. The step now points to concrete source notes, concrete output paths, roadmap follow-through, and downstream phase links. A junior developer can create or audit the framing package without reconstructing hidden context from prior chat.
**Security considerations**: Planning-only work, but the artifacts must preserve the existing trust-boundary rules: no secrets in the renderer, auth/session handling stays behind privileged local services, and crash/logging posture remains aligned with DEC-0010 and DEC-0012.

**Performance considerations**: Planning-only work, but the artifacts must not imply the query/index problem is already solved. Keep DEC-0007 framed as the accepted default direction with the explicit STEP-03-04 feasibility gate still in place.

## Related Notes

- Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
- Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]]
