import { ipcMain } from 'electron';
import {
  ipcChannels,
  parseSync,
  SProjectEnsureRequest,
  SProjectMergeRequest,
  SProjectRenameRequest,
  SProjectSetDefaultsRequest,
  type Project,
} from '@srgnt/contracts';
import { createProjectStore, type ListProjectsResult, type ProjectStore } from '@srgnt/runtime';

/**
 * Main-process owner of the project entity (PHASE-24, STEP-24-02).
 *
 * Bound to the current workspace root and rebuilt through the workspace hooks
 * when it changes, exactly like semantic search — a store still pointing at the
 * previous root would write projects into a workspace the user has left.
 *
 * `@srgnt/runtime` is CommonJS, so this is a plain static import; only
 * `@srgnt/harness` needs the lazy-ESM dance.
 */
export interface ProjectsService {
  /** Re-roots the store and rolls any crashed merge forward. Never throws. */
  setWorkspaceRoot(root: string): Promise<void>;
  /** The project for a directory, creating it on first use. */
  ensureForDir(rootDir: string): Promise<Project>;
  get(projectId: string): Promise<Project>;
  list(): Promise<ListProjectsResult>;
  registerIpcHandlers(): void;
}

export function createProjectsService(deps: { getWorkspaceRoot(): string }): ProjectsService {
  // Cached per root so repeated calls share one store (and one per-id lock map —
  // a fresh store per call would defeat the create-once serialization).
  let cachedRoot = '';
  let cachedStore: ProjectStore | undefined;

  function store(): ProjectStore {
    const root = deps.getWorkspaceRoot();
    if (root === '') {
      throw new Error('No workspace root: projects cannot be read or created yet.');
    }
    if (cachedStore === undefined || cachedRoot !== root) {
      cachedRoot = root;
      cachedStore = createProjectStore(root);
    }
    return cachedStore;
  }

  async function setWorkspaceRoot(root: string): Promise<void> {
    cachedRoot = root;
    cachedStore = root === '' ? undefined : createProjectStore(root);
    if (cachedStore === undefined) return;
    try {
      const recovery = await cachedStore.recoverMerges();
      if (recovery.resumed.length > 0) {
        console.log('[main] resumed interrupted project merges:', recovery.resumed.join(', '));
      }
      for (const failure of recovery.failed) {
        console.error('[main] could not resume project merge for', failure.targetProjectId, failure.reason);
      }
    } catch (error) {
      // A wedged journal must not stop the workspace from opening.
      console.error('[main] project merge recovery failed:', error);
    }
  }

  function registerIpcHandlers(): void {
    ipcMain.handle(ipcChannels.projectList, async () => store().list());

    ipcMain.handle(ipcChannels.projectEnsure, async (_event, payload: unknown) => {
      const { rootDir } = parseSync(SProjectEnsureRequest, payload);
      return store().ensureProjectForDir(rootDir);
    });

    ipcMain.handle(ipcChannels.projectRename, async (_event, payload: unknown) => {
      const { projectId, name } = parseSync(SProjectRenameRequest, payload);
      return store().rename(projectId, name);
    });

    ipcMain.handle(ipcChannels.projectMerge, async (_event, payload: unknown) => {
      const { sourceProjectId, targetProjectId } = parseSync(SProjectMergeRequest, payload);
      return store().merge(sourceProjectId, targetProjectId);
    });

    ipcMain.handle(ipcChannels.projectSetDefaults, async (_event, payload: unknown) => {
      const { projectId, defaultHarnessId, permissionPolicy } = parseSync(
        SProjectSetDefaultsRequest,
        payload,
      );
      return store().setDefaults(projectId, {
        ...(defaultHarnessId !== undefined ? { defaultHarnessId } : {}),
        ...(permissionPolicy !== undefined ? { permissionPolicy } : {}),
      });
    });
  }

  return {
    setWorkspaceRoot,
    ensureForDir: (rootDir) => store().ensureProjectForDir(rootDir),
    get: (projectId) => store().get(projectId),
    list: () => store().list(),
    registerIpcHandlers,
  };
}
