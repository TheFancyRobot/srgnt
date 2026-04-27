/**
 * Jira connector implementation
 *
 * Uses live Jira API sync via the shared sync module when settings + token are available.
 * Falls back to fixture-based sync for testing when no settings are configured.
 * Token is retrieved through the privileged host boundary (DEC-0017: main-process credential adapter).
 * Writes markdown files to a connector-owned workspace subtree after live sync.
 */
import { BaseConnector, type HostContext, type SyncResult } from '@srgnt/connectors';
import { jiraConnectorManifest, jiraFixtures, mapJiraIssueToTask } from './data.js';
import { syncJira, type JiraSyncOptions } from './sync.js';
import { writeIssues, type FileAdapter } from './persistence/writer.js';
import type { JiraConnectorSettings } from '@srgnt/contracts';

export class JiraConnectorImpl extends BaseConnector {
  private connected = false;
  private settings?: JiraConnectorSettings;
  private hostContext?: HostContext;
  private files?: FileAdapter;

  async connect(): Promise<void> {
    this.updateHealth('connecting');
    await new Promise((r) => setTimeout(r, 10));
    this.updateHealth('connected');
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.updateHealth('disconnected');
    this.connected = false;
  }

  async refresh(): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    this.updateHealth('refreshing');
    await new Promise((r) => setTimeout(r, 10));
    this.updateHealth('connected');
  }

  async sync(): Promise<SyncResult> {
    await this.refresh();

    // Live sync when settings + token are available (normal production path)
    if (this.settings) {
      const token = await this.getTokenFromHost();
      if (token) {
        return this.syncLive(token);
      }
    }

    // Fallback to fixture data for testing / unconfigured state
    const tasks = jiraFixtures.issues.map(mapJiraIssueToTask);
    return {
      success: true,
      entitiesAdded: tasks.length,
      entitiesUpdated: 0,
      entitiesRemoved: 0,
    };
  }

  private async syncLive(token: string): Promise<SyncResult> {
    const syncOptions: JiraSyncOptions = {
      settings: this.settings!,
      token,
      extractionToggles: this.settings!.extractionToggles ?? {},
      maxTotalResults: 500,
    };

    const result = await syncJira(syncOptions);

    // Persist tasks as markdown files to the connector-owned workspace subtree
    const workspaceRoot = this.getWorkspaceRoot();
    if (workspaceRoot && result.tasks.length > 0 && this.files) {
      const writeResult = await writeIssues(result.tasks, {
        workspaceRoot,
        siteUrl: this.settings!.siteUrl,
        archiveStale: true,
        files: this.files,
      });

      // Surface persistence failures into sync result
      // If writes failed, the sync is at best partial
      if (writeResult.errors.length > 0) {
        return {
          success: false,
          entitiesAdded: result.entitiesAdded,
          entitiesUpdated: result.entitiesUpdated,
          entitiesRemoved: result.entitiesRemoved,
          error: `Persistence failed: ${writeResult.errors.join('; ')}`,
        };
      }
    }

    return {
      success: result.success,
      entitiesAdded: result.entitiesAdded,
      entitiesUpdated: result.entitiesUpdated,
      entitiesRemoved: result.entitiesRemoved,
    };
  }

  /** Called by the host to provide settings after factory creation */
  setSettings(settings: JiraConnectorSettings): void {
    this.settings = settings;
  }

  /**
   * Retrieves the Jira API token via the privileged host capability.
   * DEC-0017: token is stored behind the Electron main-process credential adapter,
   * never in renderer state, workspace markdown, or desktop-settings.json.
   * Returns undefined when host integration is not yet wired.
   */
  private async getTokenFromHost(): Promise<string | undefined> {
    if (!this.hostContext?.capabilities.credentials?.getToken) {
      return undefined;
    }
    return this.hostContext.capabilities.credentials.getToken('jira');
  }

  /** Returns the workspace root from host capabilities, or undefined if not available */
  private getWorkspaceRoot(): string | undefined {
    return this.hostContext?.capabilities.workspace?.root;
  }
}

export async function createJiraConnector(host: HostContext): Promise<JiraConnectorImpl> {
  const connector = new JiraConnectorImpl(jiraConnectorManifest);
  // Store host context so the connector can call privileged host capabilities
  (connector as unknown as { hostContext: HostContext | undefined; files: FileAdapter | undefined }).hostContext = host;
  // Wire the file adapter from host capabilities (falls back to undefined in test environments)
  (connector as unknown as { files: FileAdapter | undefined }).files = host.capabilities.files;
  return connector;
}