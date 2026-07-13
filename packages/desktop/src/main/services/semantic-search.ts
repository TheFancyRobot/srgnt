import { ipcMain } from 'electron';
import * as path from 'node:path';
import {
  ipcChannels,
  parseSync,
  SSemanticSearchInitRequest,
  SSemanticSearchEnableForWorkspaceRequest,
  SSemanticSearchIndexWorkspaceRequest,
  SSemanticSearchRebuildAllRequest,
  SSemanticSearchSearchRequest,
  SSemanticSearchStatusRequest,
} from '@srgnt/contracts';
import {
  createSemanticSearchHost,
  createWorkspaceWatcher,
  createEmptyStatus,
  createStatusFromIndexResult,
  createIndexingStatus,
  createErrorStatus,
  type SemanticSearchStatus,
  type WorkspaceWatcher,
} from '../semantic-search/index.js';

export interface SemanticSearchService {
  /** Initializes the host for a workspace root. Fails soft with a log — semantic search stays dormant. */
  initialize(workspaceRoot: string): Promise<void>;
  /** Stops the watcher and tears down the host when the workspace root changes. */
  handleWorkspaceRootChange(previousRoot: string, nextRoot: string): Promise<void>;
  registerIpcHandlers(): void;
}

export function createSemanticSearchService(deps: { getWorkspaceRoot(): string }): SemanticSearchService {
  const host = createSemanticSearchHost();
  let enabled = false;
  let watcher: WorkspaceWatcher | null = null;
  let status: SemanticSearchStatus = createEmptyStatus();

  async function initialize(workspaceRoot: string): Promise<void> {
    try {
      await host.initialize(workspaceRoot);
    } catch (err) {
      console.error('[main] failed to initialize semantic search:', err);
    }
  }

  async function handleWorkspaceRootChange(previousRoot: string, nextRoot: string): Promise<void> {
    if (watcher) {
      console.log('[main] stopping semantic search watcher');
      watcher.stop();
      watcher = null;
    }

    if (previousRoot !== '' && previousRoot !== nextRoot) {
      console.log('[main] workspace root changed, tearing down semantic search');
      await host.teardown();
      enabled = false;
    }
  }

  function registerIpcHandlers(): void {
    ipcMain.handle(ipcChannels.semanticSearchInit, async (_event, rawRequest) => {
      parseSync(SSemanticSearchInitRequest, rawRequest ?? {});
      try {
        await host.initialize(deps.getWorkspaceRoot());
        return { initialized: true };
      } catch {
        return { initialized: false };
      }
    });

    ipcMain.handle(ipcChannels.semanticSearchEnableForWorkspace, async (_event, rawRequest) => {
      const request = parseSync(SSemanticSearchEnableForWorkspaceRequest, rawRequest ?? {});
      try {
        await host.enableForWorkspace(request.workspaceRoot);

        // Start watching workspace for file changes
        if (!watcher) {
          const indexRoot = path.join(request.workspaceRoot, '.srgnt-semantic-search');
          watcher = createWorkspaceWatcher({
            workspaceRoot: request.workspaceRoot,
            indexRoot,
            debounceMs: 500,
            onFileChange: (relativePath, _event) => {
              console.log('[main] semantic search: file changed, triggering reindex:', relativePath);
              // Trigger incremental reindex for the changed file
              host.indexWorkspace(request.workspaceRoot, false).catch((err) => {
                console.error('[main] semantic search: reindex failed:', err);
              });
            },
          });
          watcher.start();
        }

        enabled = true;

        // Trigger first-time full indexing
        console.log('[main] semantic search: first enable, triggering full index');
        const result = await host.indexWorkspace(request.workspaceRoot, false);
        status = createStatusFromIndexResult(
          host.getStatus(),
          request.workspaceRoot,
          result,
          status,
        );

        return { enabled: true };
      } catch (err) {
        console.error('[main] semantic search enable failed:', err);
        return { enabled: false };
      }
    });

    ipcMain.handle(ipcChannels.semanticSearchIndexWorkspace, async (_event, rawRequest) => {
      const request = parseSync(SSemanticSearchIndexWorkspaceRequest, rawRequest ?? {});

      // Update status to indexing with progress
      status = createIndexingStatus(
        request.workspaceRoot,
        50, // mid-progress since we don't have real progress tracking yet
        status,
      );

      try {
        const result = await host.indexWorkspace(request.workspaceRoot, request.force);
        status = createStatusFromIndexResult(
          host.getStatus(),
          request.workspaceRoot,
          result,
          status,
        );
        return result;
      } catch (err) {
        status = createErrorStatus(
          request.workspaceRoot,
          err instanceof Error ? err.message : 'Indexing failed',
          status,
        );
        throw err;
      }
    });

    ipcMain.handle(ipcChannels.semanticSearchRebuildAll, async (_event, rawRequest) => {
      const request = parseSync(SSemanticSearchRebuildAllRequest, rawRequest ?? {});

      // Update status to indexing
      status = createIndexingStatus(request.workspaceRoot, 50, status);

      try {
        const result = await host.rebuildAll(request.workspaceRoot);
        status = {
          ...status,
          state: host.getStatus(),
          indexedFileCount: result.totalChunkCount,
          totalChunkCount: result.totalChunkCount,
          progressPercent: 100,
          lastIndexedAt: new Date().toISOString(),
        };
        return result;
      } catch (err) {
        status = createErrorStatus(
          request.workspaceRoot,
          err instanceof Error ? err.message : 'Rebuild failed',
          status,
        );
        throw err;
      }
    });

    ipcMain.handle(ipcChannels.semanticSearchSearch, async (_event, rawRequest) => {
      const request = parseSync(SSemanticSearchSearchRequest, rawRequest ?? {});
      const results = await host.search(
        request.query,
        request.workspaceRoot,
        request.maxResults,
        request.minScore,
      );
      return { results };
    });

    ipcMain.handle(ipcChannels.semanticSearchStatus, async (_event, rawRequest) => {
      const request = parseSync(SSemanticSearchStatusRequest, rawRequest ?? {});
      void request;

      // Get current state from host
      const hostState = host.getStatus();

      // Return current status with available information
      return {
        state: enabled ? hostState : 'disabled',
        indexedFileCount: status.indexedFileCount,
        totalChunkCount: status.totalChunkCount,
        progressPercent: status.progressPercent,
        lastIndexedAt: status.lastIndexedAt,
        error: status.error,
      };
    });
  }

  return { initialize, handleWorkspaceRootChange, registerIpcHandlers };
}
