import { app } from 'electron';
import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeatureState =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'indexing'
  | 'disabled'
  | 'error';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// SemanticSearchHost
// ---------------------------------------------------------------------------

class SemanticSearchHostImpl implements SemanticSearchHost {
  private state: FeatureState = 'uninitialized';
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private currentWorkspaceRoot: string | null = null;

  // -- Public API -----------------------------------------------------------

  getStatus(): FeatureState {
    return this.state;
  }

  async initialize(workspaceRoot: string): Promise<void> {
    // Idempotent: same root = no restart
    if (this.state === 'ready' && this.currentWorkspaceRoot === workspaceRoot) {
      return;
    }

    // Concurrent init rejection
    if (this.state === 'initializing') {
      throw new Error('Semantic search is already initializing');
    }

    // If workspace root changed, tear down first
    if (
      this.currentWorkspaceRoot !== null &&
      this.currentWorkspaceRoot !== workspaceRoot &&
      this.state !== 'uninitialized'
    ) {
      await this.teardown();
    }

    this.state = 'initializing';
    this.currentWorkspaceRoot = workspaceRoot;

    try {
      const indexRoot = path.join(workspaceRoot, '.srgnt-semantic-search');
      await fs.mkdir(indexRoot, { recursive: true });

      const config = {
        workspaceRoot,
        indexRoot,
        modelAssetPath: app.isPackaged
          ? path.join(process.resourcesPath, 'model')
          : path.join(process.cwd(), 'node_modules/@huggingface/transformers/models/'),
        chunkSize: 1000,
        overlap: 200,
        batchSize: 32,
        exclusions: ['.agent-vault', '.command-center', '.srgnt-semantic-search'],
      };

      await this.spawnWorker();
      await this.sendToWorker('init', { config });

      this.state = 'ready';
      console.log('[semantic-search-host] initialized for', workspaceRoot);
    } catch (err) {
      this.state = 'error';
      this.terminateWorker();
      throw err;
    }
  }

  async teardown(): Promise<void> {
    console.log('[semantic-search-host] tearing down');

    for (const [, req] of this.pendingRequests) {
      req.reject(new Error('Host torn down'));
    }
    this.pendingRequests.clear();

    this.terminateWorker();
    this.state = 'uninitialized';
    this.currentWorkspaceRoot = null;
  }

  async enableForWorkspace(workspaceRoot: string): Promise<void> {
    if (this.state !== 'ready') {
      await this.initialize(workspaceRoot);
    }
  }

  async indexWorkspace(
    workspaceRoot?: string,
    force?: boolean,
  ): Promise<{
    indexedChunkCount: number;
    skippedCount: number;
    durationMs: number;
  }> {
    const root = workspaceRoot ?? this.currentWorkspaceRoot;
    if (!root) throw new Error('No workspace configured');

    if (this.state !== 'ready') {
      await this.initialize(root);
    }

    this.state = 'indexing';
    try {
      const result = await this.sendToWorker('index', {
        workspaceRoot: root,
        force,
      });
      this.state = 'ready';
      return result as {
        indexedChunkCount: number;
        skippedCount: number;
        durationMs: number;
      };
    } catch (err) {
      this.state = 'ready';
      throw err;
    }
  }

  async rebuildAll(
    workspaceRoot?: string,
  ): Promise<{ totalChunkCount: number; durationMs: number }> {
    const root = workspaceRoot ?? this.currentWorkspaceRoot;
    if (!root) throw new Error('No workspace configured');

    if (this.state !== 'ready') {
      await this.initialize(root);
    }

    this.state = 'indexing';
    try {
      const result = await this.sendToWorker('rebuild', {
        workspaceRoot: root,
      });
      this.state = 'ready';
      return result as { totalChunkCount: number; durationMs: number };
    } catch (err) {
      this.state = 'ready';
      throw err;
    }
  }

  async search(
    query: string,
    workspaceRoot?: string,
    maxResults?: number,
    minScore?: number,
  ): Promise<
    Array<{
      score: number;
      title: string;
      workspaceRelativePath: string;
      snippet: string;
    }>
  > {
    if (this.state !== 'ready') {
      const root = workspaceRoot ?? this.currentWorkspaceRoot;
      if (!root) throw new Error('Semantic search not initialized');
      await this.initialize(root);
    }

    const result = await this.sendToWorker('search', {
      query,
      workspaceRoot,
      maxResults,
      minScore,
    });

    return result as Array<{
      score: number;
      title: string;
      workspaceRelativePath: string;
      snippet: string;
    }>;
  }

  // -- Worker management ---------------------------------------------------

  private spawnWorker(): void {
    const workerPath = path.join(__dirname, 'worker.js');

    this.worker = new Worker(workerPath);

    this.worker.on('message', (msg: Record<string, unknown>) => {
      if (msg.type === 'ready') {
        console.log('[semantic-search-host] worker reported ready');
        return;
      }

      if (msg.type === 'result' || msg.type === 'error') {
        const id = msg.id as string | undefined;
        if (!id) return;

        const pending = this.pendingRequests.get(id);
        if (!pending) return;

        this.pendingRequests.delete(id);

        if (msg.type === 'error') {
          pending.reject(
            new Error((msg.error as string) ?? `Worker error for request ${id}`),
          );
        } else {
          pending.resolve(msg.data);
        }
      }
    });

    this.worker.on('error', (err) => {
      console.error('[semantic-search-host] worker error:', err);
      this.state = 'error';
      this.rejectAllPending('Worker error: ' + err.message);
    });

    this.worker.on('exit', (code) => {
      console.log('[semantic-search-host] worker exited with code', code);
      if (code !== 0 && this.state !== 'uninitialized') {
        this.state = 'error';
        this.rejectAllPending('Worker exited unexpectedly');
      }
    });
  }

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.removeAllListeners();
      this.worker.terminate().catch(() => {});
      this.worker = null;
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, req] of this.pendingRequests) {
      req.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  // -- Request / response --------------------------------------------------

  private sendToWorker(type: string, payload?: unknown): Promise<unknown> {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ type, id, ...(payload as object) });

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Worker request ${type} timed out`));
        }
      }, 30_000);

      // Store with timer cleanup
      const origResolve = resolve;
      const origReject = reject;
      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          origResolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          origReject(error);
        },
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface SemanticSearchHost {
  readonly getStatus: () => FeatureState;
  readonly initialize: (workspaceRoot: string) => Promise<void>;
  readonly teardown: () => Promise<void>;
  readonly enableForWorkspace: (workspaceRoot: string) => Promise<void>;
  readonly indexWorkspace: (
    workspaceRoot?: string,
    force?: boolean,
  ) => Promise<{
    indexedChunkCount: number;
    skippedCount: number;
    durationMs: number;
  }>;
  readonly rebuildAll: (
    workspaceRoot?: string,
  ) => Promise<{ totalChunkCount: number; durationMs: number }>;
  readonly search: (
    query: string,
    workspaceRoot?: string,
    maxResults?: number,
    minScore?: number,
  ) => Promise<
    Array<{
      score: number;
      title: string;
      workspaceRelativePath: string;
      snippet: string;
    }>
  >;
}

export function createSemanticSearchHost(): SemanticSearchHost {
  return new SemanticSearchHostImpl();
}
