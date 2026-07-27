import React from 'react';
import { useProjectsOptional, type RendererProject } from './ProjectsContext.js';

/**
 * Project switcher (PHASE-24, STEP-24-02), rendered in the chat panel's side
 * panel above the plan.
 *
 * Two directories can share a basename — the id differs but the name does not —
 * so every row shows its `rootDir`. Without that hint two rows reading "app" are
 * indistinguishable and switching is a guess.
 *
 * Merge is irreversible (sessions move, the source project is deleted), so it
 * sits behind an explicit in-panel confirm naming both sides. Renaming is inline
 * and only touches `name`; the id is derived from the directory and never moves.
 */

function ProjectRow({
  project,
  active,
  onSelect,
  onRename,
}: {
  readonly project: RendererProject;
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly onRename: (name: string) => void;
}): React.ReactElement {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(project.name);

  const commit = (): void => {
    setEditing(false);
    if (draft.trim() !== '' && draft.trim() !== project.name) onRename(draft.trim());
    else setDraft(project.name);
  };

  return (
    <li className="project-row" data-testid="project-row" data-project-id={project.id} data-active={active}>
      {editing ? (
        <input
          className="input w-full text-xs"
          aria-label={`Rename ${project.name}`}
          data-testid="project-rename-input"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') {
              setDraft(project.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex-1 text-left"
            data-testid="project-select"
            aria-pressed={active}
            onClick={onSelect}
          >
            <span className="block text-xs truncate">{project.name}</span>
            {/* The disambiguator: two projects may legitimately share a name. */}
            <span className="block text-[11px] font-mono-data text-text-tertiary truncate" title={project.rootDir}>
              {project.rootDir}
            </span>
          </button>
          <button
            type="button"
            className="text-[11px] text-text-tertiary"
            data-testid="project-rename"
            aria-label={`Rename ${project.name}`}
            onClick={() => {
              setDraft(project.name);
              setEditing(true);
            }}
          >
            Rename
          </button>
        </div>
      )}
    </li>
  );
}

export function ProjectSwitcher(): React.ReactElement | null {
  // Optional provider: the plan panel is also rendered in isolation (and by any
  // surface that predates projects), where the switcher should simply not exist
  // rather than take the whole side panel down with it.
  const context = useProjectsOptional();
  const [mergeSourceId, setMergeSourceId] = React.useState('');
  // Re-read on mount: the list is stale whenever something changed while the
  // panel was closed — a session auto-created a project, or the workspace root
  // moved and main is now serving an entirely different set.
  const refresh = context?.refresh;
  React.useEffect(() => {
    void refresh?.();
  }, [refresh]);
  if (context === null) return null;
  const { projects, activeProjectId, activeProject, loading, error, setActiveProjectId, renameProject, mergeProjects, dismissError } =
    context;

  const mergeSource = projects.find((project) => project.id === mergeSourceId) ?? null;
  const mergeable = projects.filter((project) => project.id !== activeProjectId);

  return (
    <div className="p-3 border-b border-border-default space-y-2" data-testid="project-switcher">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-heading">Projects</h2>
        {activeProject !== null && (
          <span className="text-[11px] font-mono-data text-text-tertiary truncate" data-testid="project-active-name">
            {activeProject.name}
          </span>
        )}
      </div>

      {error !== null && (
        <p className="text-[11px] text-status-error" role="alert" data-testid="project-error" onClick={dismissError}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-text-tertiary" data-testid="project-loading">
          Loading projects...
        </p>
      ) : projects.length === 0 ? (
        <p className="text-xs text-text-tertiary" data-testid="project-empty">
          No projects yet. Starting a session creates one for the workspace directory.
        </p>
      ) : (
        <ul className="space-y-0.5" data-testid="project-list">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onSelect={() => setActiveProjectId(project.id)}
              onRename={(name) => void renameProject(project.id, name)}
            />
          ))}
        </ul>
      )}

      {mergeable.length > 0 && activeProject !== null && (
        <div className="space-y-1" data-testid="project-merge">
          <label className="block text-[11px] text-text-tertiary" htmlFor="project-merge-source">
            Merge another project into {activeProject.name}
          </label>
          <select
            id="project-merge-source"
            className="input w-full text-xs"
            data-testid="project-merge-source"
            value={mergeSourceId}
            onChange={(event) => setMergeSourceId(event.target.value)}
          >
            <option value="">Select a project...</option>
            {mergeable.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.rootDir})
              </option>
            ))}
          </select>
          {mergeSource !== null && (
            // Explicit confirm, not a `confirm()` dialog: the destructive action
            // has to name both sides on screen before it can be clicked.
            <div className="space-y-1" data-testid="project-merge-confirm">
              <p className="text-[11px] text-text-secondary">
                Move every session from <strong>{mergeSource.name}</strong> into{' '}
                <strong>{activeProject.name}</strong> and delete{' '}
                <strong>{mergeSource.name}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-secondary text-[11px]"
                  data-testid="project-merge-cancel"
                  onClick={() => setMergeSourceId('')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary text-[11px]"
                  data-testid="project-merge-apply"
                  onClick={() => {
                    const source = mergeSourceId;
                    setMergeSourceId('');
                    void mergeProjects(source, activeProjectId as string);
                  }}
                >
                  Merge
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
