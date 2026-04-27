# `@srgnt/connector-jira`

Jira connector package for srgnt. Syncs Jira issues into your workspace as markdown files, surfaced as tasks in the srgnt UI.

## Capabilities

The connector runs in an **isolated worker thread** with a limited capability set:

| Capability | Purpose |
|---|---|
| `http.fetch` | Jira REST API calls |
| `logger` | Structured diagnostic output |
| `crypto.randomUUID` | Unique ID generation |
| `workspace.root` | Locate the workspace directory |
| `credentials.getToken` | Retrieve the Jira API token from the host credential store (DEC-0017) |
| `files` | Write and manage markdown files in the workspace via `FileAdapter` (Phase 21) |

No environment variables, child process, or main-process APIs are available to the connector.

## Security Model

**Token never leaves the privileged host boundary.** The Jira API token is stored via the host's credential adapter, which prefers the OS keychain (macOS Keychain / Windows Credential Manager / libsecret on Linux) when available. If the OS keychain is unavailable, SRGNT falls back to encrypted in-app storage — the token is always encrypted and never stored as plaintext. Users can choose their storage preference in Settings. The connector worker receives the token only at spawn time via a memory-only channel — it is never written to disk, stored in workspace files or settings JSON, or included in logs.

See [DEC-0017](../../04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary.md) for the full design.

## Configuration

The connector is configured through `JiraConnectorSettings` in `@srgnt/contracts`:

```typescript
interface JiraConnectorSettings {
  connectorId: 'jira';
  siteUrl: string;             // e.g. 'https://your-company.atlassian.net'
  accountEmail: string;        // e.g. 'you@example.com'
  scopeMode: 'projects' | 'jql';
  projectKeys?: string[];      // required when scopeMode is 'projects'
  jql?: string;                // required when scopeMode is 'jql'
  extractionToggles?: JiraExtractionToggles;
}
```

### Extraction Toggles

```typescript
interface JiraExtractionToggles {
  includeComments: boolean;            // default: false — render full comment content in markdown
  includeIssueLinks: boolean;          // default: false — include issue link metadata
  includeSubtasks: boolean;           // default: false — extract subtasks into providerMetadata.subtasks
  includeSprintData: boolean;          // default: false — include sprint information
  includeWorklogSummary: boolean;      // default: false — include work log summary
  includeAttachmentMetadata: boolean;  // default: false — store attachment metadata (names, sizes); does NOT download files
  includeChangelogSummary: boolean;   // default: false — include change history summary
}
```

## Setup and Installation

1. **Install the Jira connector** from the Connectors panel in srgnt Settings.
2. Enter your Jira site URL and account email.
3. The first time you connect, you will be prompted for your Jira API token.  
   Generate one at `https://id.atlassian.com/manage-profile/security/api-tokens`.  
   The token is stored via the host credential adapter and never touches disk.
4. Select your sync scope: either a list of project keys or a custom JQL query.
5. Click **Connect**. The connector will begin its first sync.

## Sync Behavior

On each **sync** the connector:

1. Validates settings and credentials — fails closed before any network call if anything is missing.
2. Fetches issues from Jira matching the configured scope via the Jira REST API v3 with automatic pagination (max 500 issues per sync by default).
3. Maps each Jira issue to a srgnt `Task` entity with provider metadata.
4. Writes each issue as a markdown file under `.jira/{projectKey}/{issueKey}.md`.
5. Archives issues that no longer appear in the scope by marking them `is_archived: true` in-place (their frontmatter is updated; the file is not deleted or moved).
6. If any write fails, the sync returns `success: false` with a descriptive error.

### Markdown Output Location

```
{workspaceRoot}/.jira/{projectKey}/{issueKey}.md
```

For example: `~/.srgnt/workspace/.jira/PROJ/PROJ-123.md`

The `providerId` for every synced task is set to the Jira issue key (e.g. `PROJ-123`).

### Stale / Archive Behavior (ARCH-0009)

Issues that no longer match the configured sync scope are **archived in place**:

- The original `.jira/{projectKey}/{issueKey}.md` file is kept at its stable path.
- Frontmatter is updated to set `is_archived: true` and `archived_reason: left_scope`.
- The issue key remains in `.jira/.index.json` with `archived: true`.
- If the issue returns to scope, the frontmatter is updated back to `is_archived: false` and `archived_reason` is cleared.

This approach ensures:
- No broken external links to workspace notes
- No data loss from accidental renames
- Deterministic, auditable state

## Token Rotation

To rotate your Jira API token:

1. Go to `https://id.atlassian.com/manage-profile/security/api-tokens` and generate a new token.
2. In the srgnt desktop app, open **Settings → Connectors → Jira**.
3. Re-enter your email and the new token. The token replaces the previous value in the host credential store.

## Connect and Disconnect

- **Connect**: Registers the Jira package with the desktop host, spawns the worker thread, and runs the initial sync.
- **Disconnect**: Stops the worker and returns the connector to the installed-but-disconnected state. Your markdown files and Jira settings are preserved.

## Troubleshooting

### "Connector jira is not installed" on connect

Make sure you have installed the connector first from **Settings → Connectors**.

### Sync fails with "Credential missing: token"

The Jira API token was not found in the host credential store. Go to **Settings → Connectors → Jira** and re-enter your token.

### Sync succeeds but no markdown files appear

Check that `workspace.root` is accessible. The `.jira/` directory is created automatically. If the connector has no `files` capability (e.g. running outside the desktop host), files cannot be written.

### Very slow first sync

Large Jira projects can return many issues. Pagination fetches up to 500 by default. Use a JQL filter to narrow the scope if initial sync is slow.

## Future Work

The following are **intentionally not implemented** in this phase and represent the honest baseline for future planning:

- [ ] **Atlassian OAuth (2.0)**: Currently only API token auth is supported. OAuth would enable token refresh without re-entry but requires browser redirect handling — future phase.
- [ ] **Delta / incremental sync**: Currently fetches all matching issues on every sync. A persistent cursor (Jira `since` parameter or last-updated JQL filter) would reduce API load on large scopes.
- [ ] **Attachment file download**: `includeAttachmentMetadata: true` stores attachment names and sizes only; actual binary download and local storage of attachments is not implemented.
- [ ] **Comment threading in markdown**: `includeComments: true` renders comment content in markdown; threaded discussion UI or nested rendering is not implemented.
- [ ] **Per-project sync controls**: All configured projects are synced together. Per-project enable/disable or schedule is not yet available.
- [ ] **Dashboard / analytics**: Issue counts, sync history, and connector health dashboard are not yet in the UI.
- [ ] **Multiple Jira sites**: Only one Jira site per srgnt installation is supported.
- [ ] **Custom field type rendering**: Custom field values are included as-is in provider metadata; typed rendering (date pickers, select menus, etc.) is not implemented.
- [ ] **Shared rate limit budget across restarts**: The shared `HttpClient` retries on 429 and network errors with exponential backoff per request, but does not track a shared rate limit budget across connector restarts or correlate with Jira's per-tenant rate limits.
- [ ] **Dedicated OS keychain adapter**: ✅ Implemented in BUG-0019. The credential adapter now supports explicit OS keychain preference with graceful fallback to encrypted in-app storage. Users can choose their storage preference in Settings, and tokens can be migrated between backends.

## Architecture

See [`ARCH-0009`](../../01_Architecture/Jira_Connector_Package_and_Markdown_Persistence.md) for the full architecture document covering markdown persistence, the `FileAdapter` interface, archive-in-place semantics, and the worker/host boundary.
