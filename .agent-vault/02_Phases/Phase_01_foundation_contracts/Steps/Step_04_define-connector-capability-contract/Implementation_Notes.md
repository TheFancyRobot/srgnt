# Implementation Notes

- The framework doc already proposes capability strings such as `tasks.read`, `events.read`, and `mail.send`.
- The worked example should demonstrate capability-based portability, not direct coupling to `jira`, `outlook`, or `teams` inside skill contracts.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/connectors/` for:
1. `ConnectorManifest` — name, version, provider, authType, capabilities[], producedEntities[], syncModes[], configSchema
2. `ConnectorCapability` — capability string + read/write flag + entity types produced
3. `AuthType` — enum: `oauth2` | `api-key` | `token` | `none`
4. `SyncMode` — enum: `full` | `incremental` | `webhook`

Plus a worked example at `examples/connectors/jira/`:
- `connector.yaml` — manifest declaring Jira capabilities (tasks.read, tasks.write, projects.read)
- `fixtures/` — sample Jira API responses and their canonical entity mappings
- `README.md` — explains the mapping and how to validate

**Key decisions to apply**:
- DEC-0002: All schemas are Zod.
- DEC-0003: The v1 connectors are Jira, Outlook Calendar, and Microsoft Teams. The Jira sample connector is the worked example here. Teams connector details flow from the same contract.
- DEC-0007: Connectors write canonical entity data as markdown files with YAML frontmatter. The connector contract must specify the output file format.

**Constraints**:
- Capability strings are behavior-based and namespaced: `{entity-type}.{verb}` (e.g., `tasks.read`, `events.read`, `messages.read`).
- Read and write capabilities are always separate declarations.
- Connector manifests must declare which canonical entity types they produce.

**Validation**:
- The `jira/connector.yaml` parses through `ConnectorManifest.parse()`.
- The Jira connector's declared capabilities satisfy the daily-briefing skill's `requiredCapabilities`.
- Fixture data maps from Jira API response to canonical `Task` entity without errors.

**Junior-readiness verdict**: PASS. Connector schema fields explicit, capability taxonomy defined, sample connector named.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
