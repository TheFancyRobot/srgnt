import React from 'react';

/**
 * The renderer's view of the project list and which one is active
 * (PHASE-24, STEP-24-02).
 *
 * The active project lives here rather than in main because main stays
 * stateless about it: `chat:session:new` takes a `projectId` per call, so a
 * second window (or a reload) can never inherit a stale "current project" that
 * nobody chose. Absent id = "let main derive one from the workspace cwd", which
 * is the auto-create path a user who never opens the switcher lives on.
 */

export interface RendererProject {
  readonly id: string;
  readonly name: string;
  readonly rootDir: string;
  readonly additionalDirectories: readonly string[];
  readonly defaultHarnessId?: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface ProjectsContextValue {
  readonly projects: readonly RendererProject[];
  /** `null` until the first project is chosen or the list first loads. */
  readonly activeProjectId: string | null;
  readonly activeProject: RendererProject | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly setActiveProjectId: (projectId: string) => void;
  readonly refresh: () => Promise<void>;
  readonly renameProject: (projectId: string, name: string) => Promise<void>;
  /** Irreversible. Callers must confirm first. */
  readonly mergeProjects: (sourceProjectId: string, targetProjectId: string) => Promise<void>;
  readonly dismissError: () => void;
}

const ProjectsContext = React.createContext<ProjectsContextValue | null>(null);

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function ProjectsProvider({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  const [projects, setProjects] = React.useState<readonly RendererProject[]>([]);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    // An older preload has no project bridge: degrade to an empty list rather
    // than crashing the whole chat side panel.
    if (window.srgnt.projectList === undefined) {
      setLoading(false);
      return;
    }
    try {
      const [result, workspaceRoot] = await Promise.all([
        window.srgnt.projectList(),
        window.srgnt.getWorkspaceRoot().catch(() => ''),
      ]);
      setProjects(result.projects);
      setActiveProjectId((current) => {
        // A merged-away or deleted project must not stay selected, or the next
        // session would be created against an id main no longer knows.
        if (current !== null && result.projects.some((project) => project.id === current)) return current;
        // The default is the workspace's OWN project, never "whichever sorted
        // first". Picking an arbitrary project would silently redirect sessions
        // into someone else's directory — and would keep pointing at a stale
        // checkout that has since been deleted. `null` is the honest answer when
        // nothing matches: it tells main to derive the project from the cwd.
        return result.projects.find((project) => project.rootDir === workspaceRoot)?.id ?? null;
      });
      setError(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const renameProject = React.useCallback(
    async (projectId: string, name: string) => {
      try {
        await window.srgnt.projectRename?.(projectId, name);
        setError(null);
      } catch (cause) {
        setError(messageOf(cause));
      }
      await refresh();
    },
    [refresh],
  );

  const mergeProjects = React.useCallback(
    async (sourceProjectId: string, targetProjectId: string) => {
      try {
        await window.srgnt.projectMerge?.(sourceProjectId, targetProjectId);
        // Point at the survivor before the list reloads, so the switcher never
        // shows a moment with the merged-away project still selected.
        setActiveProjectId(targetProjectId);
        setError(null);
      } catch (cause) {
        setError(messageOf(cause));
      }
      await refresh();
    },
    [refresh],
  );

  const value = React.useMemo<ProjectsContextValue>(
    () => ({
      projects,
      activeProjectId,
      activeProject: projects.find((project) => project.id === activeProjectId) ?? null,
      loading,
      error,
      setActiveProjectId,
      refresh,
      renameProject,
      mergeProjects,
      dismissError: () => setError(null),
    }),
    [projects, activeProjectId, loading, error, refresh, renameProject, mergeProjects],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

/**
 * Returns `null` outside a provider rather than throwing: the chat session
 * provider reads the active project id and must keep working in the Phase-23
 * tests (and any surface) that mount it without projects.
 */
export function useProjectsOptional(): ProjectsContextValue | null {
  return React.useContext(ProjectsContext);
}

export function useProjects(): ProjectsContextValue {
  const value = React.useContext(ProjectsContext);
  if (value === null) throw new Error('useProjects must be used inside a ProjectsProvider');
  return value;
}
