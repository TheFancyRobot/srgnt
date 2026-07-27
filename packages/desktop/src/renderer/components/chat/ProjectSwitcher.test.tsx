/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectSwitcher } from './ProjectSwitcher.js';
import { ProjectsProvider, useProjects } from './ProjectsContext.js';

afterEach(cleanup);

const projectA = {
  id: 'aaa111',
  name: 'app',
  rootDir: '/checkouts/one/app',
  additionalDirectories: [] as readonly string[],
  createdAt: '2026-07-20T10:00:00.000Z',
};
const projectB = {
  id: 'bbb222',
  // Same basename as A on purpose: only the rootDir hint tells them apart.
  name: 'app',
  rootDir: '/checkouts/two/app',
  additionalDirectories: [] as readonly string[],
  createdAt: '2026-07-20T11:00:00.000Z',
};

let listed: Array<typeof projectA>;
type AnyMock = ReturnType<typeof vi.fn>;
let api: {
  getWorkspaceRoot: AnyMock;
  projectList: AnyMock;
  projectRename: AnyMock;
  projectMerge: AnyMock;
};

beforeEach(() => {
  listed = [projectA, projectB];
  api = {
    // The provider preselects the project whose rootDir IS the workspace root.
    getWorkspaceRoot: vi.fn(async () => projectA.rootDir) as AnyMock,
    projectList: vi.fn(async () => ({ projects: listed, skipped: [] })) as AnyMock,
    projectRename: vi.fn(async (projectId: string, name: string) => {
      listed = listed.map((project) => (project.id === projectId ? { ...project, name } : project));
      return listed.find((project) => project.id === projectId)!;
    }) as AnyMock,
    projectMerge: vi.fn(async (sourceProjectId: string) => {
      listed = listed.filter((project) => project.id !== sourceProjectId);
      return listed[0]!;
    }) as AnyMock,
  };
  (globalThis as { window: { srgnt: unknown } }).window.srgnt = api;
});

function renderSwitcher() {
  return render(
    <ProjectsProvider>
      <ProjectSwitcher />
    </ProjectsProvider>,
  );
}

/** Row lookup by project id — names are deliberately ambiguous in these fixtures. */
function row(projectId: string): HTMLElement {
  return screen
    .getAllByTestId('project-row')
    .find((entry) => entry.getAttribute('data-project-id') === projectId)!;
}

describe('ProjectSwitcher', () => {
  it("lists every project with its rootDir hint and marks the workspace's own active", async () => {
    renderSwitcher();

    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());
    expect(screen.getAllByTestId('project-row')).toHaveLength(2);
    // Same name, different directory: the hint is the only disambiguator.
    expect(row(projectA.id)).toHaveTextContent('/checkouts/one/app');
    expect(row(projectB.id)).toHaveTextContent('/checkouts/two/app');
    expect(row(projectA.id).getAttribute('data-active')).toBe('true');
    expect(row(projectB.id).getAttribute('data-active')).toBe('false');
  });

  it('switches the active project on click', async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectB.id)).getByTestId('project-select'));

    expect(row(projectB.id).getAttribute('data-active')).toBe('true');
    expect(row(projectA.id).getAttribute('data-active')).toBe('false');
    expect(within(row(projectB.id)).getByTestId('project-select')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renames inline and reflects the new name immediately', async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectA.id)).getByTestId('project-rename'));
    const input = screen.getByTestId('project-rename-input');
    fireEvent.change(input, { target: { value: 'Command Center' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(api.projectRename).toHaveBeenCalledWith(projectA.id, 'Command Center');
    await waitFor(() => expect(row(projectA.id)).toHaveTextContent('Command Center'));
  });

  it('does not call rename for an unchanged or blank name', async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectA.id)).getByTestId('project-rename'));
    fireEvent.change(screen.getByTestId('project-rename-input'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByTestId('project-rename-input'), { key: 'Enter' });

    expect(api.projectRename).not.toHaveBeenCalled();
  });

  it('abandons a rename on Escape', async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectA.id)).getByTestId('project-rename'));
    fireEvent.change(screen.getByTestId('project-rename-input'), { target: { value: 'Nope' } });
    fireEvent.keyDown(screen.getByTestId('project-rename-input'), { key: 'Escape' });

    expect(api.projectRename).not.toHaveBeenCalled();
    expect(screen.queryByTestId('project-rename-input')).not.toBeInTheDocument();
  });

  it('requires an explicit confirm before merging, and can be cancelled', async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    // Nothing selected → no confirm, no way to fire the irreversible action.
    expect(screen.queryByTestId('project-merge-confirm')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('project-merge-source'), { target: { value: projectB.id } });
    const confirm = screen.getByTestId('project-merge-confirm');
    // The confirm names both sides and says it cannot be undone.
    expect(confirm).toHaveTextContent('/checkouts/two/app'.split('/').pop()!);
    expect(confirm).toHaveTextContent('cannot be undone');

    fireEvent.click(screen.getByTestId('project-merge-cancel'));
    expect(api.projectMerge).not.toHaveBeenCalled();
    expect(screen.queryByTestId('project-merge-confirm')).not.toBeInTheDocument();
  });

  it('merges into the active project and drops the source from the list', async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('project-merge-source'), { target: { value: projectB.id } });
    fireEvent.click(screen.getByTestId('project-merge-apply'));

    expect(api.projectMerge).toHaveBeenCalledWith(projectB.id, projectA.id);
    await waitFor(() => expect(screen.getAllByTestId('project-row')).toHaveLength(1));
    expect(row(projectA.id).getAttribute('data-active')).toBe('true');
    // With only one project left there is nothing to merge in.
    expect(screen.queryByTestId('project-merge')).not.toBeInTheDocument();
  });

  it('surfaces a failed mutation instead of silently doing nothing', async () => {
    api.projectRename.mockRejectedValueOnce(new Error('Project name cannot be empty.'));
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectA.id)).getByTestId('project-rename'));
    fireEvent.change(screen.getByTestId('project-rename-input'), { target: { value: 'x' } });
    fireEvent.keyDown(screen.getByTestId('project-rename-input'), { key: 'Enter' });

    await waitFor(() => expect(screen.getByTestId('project-error')).toHaveTextContent('cannot be empty'));
  });

  it('shows an empty state rather than a broken panel with no projects', async () => {
    listed = [];
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('project-merge')).not.toBeInTheDocument();
  });

  it('degrades to the empty state when the preload has no project bridge', async () => {
    (globalThis as { window: { srgnt: unknown } }).window.srgnt = { getWorkspaceRoot: async () => '' };
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId('project-empty')).toBeInTheDocument());
  });
});

describe('ProjectsProvider', () => {
  function ActiveProbe(): React.ReactElement {
    const { activeProjectId } = useProjects();
    return <span data-testid="active">{activeProjectId ?? 'none'}</span>;
  }

  it('keeps the merge survivor selected', async () => {
    render(
      <ProjectsProvider>
        <ProjectSwitcher />
        <ActiveProbe />
      </ProjectsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectB.id)).getByTestId('project-select'));
    expect(screen.getByTestId('active')).toHaveTextContent(projectB.id);

    fireEvent.change(screen.getByTestId('project-merge-source'), { target: { value: projectA.id } });
    fireEvent.click(screen.getByTestId('project-merge-apply'));

    await waitFor(() => expect(screen.getAllByTestId('project-row')).toHaveLength(1));
    expect(screen.getByTestId('active')).toHaveTextContent(projectB.id);
  });

  it('drops a selection whose project vanished from the list', async () => {
    render(
      <ProjectsProvider>
        <ProjectSwitcher />
        <ActiveProbe />
      </ProjectsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());

    fireEvent.click(within(row(projectB.id)).getByTestId('project-select'));
    expect(screen.getByTestId('active')).toHaveTextContent(projectB.id);

    // B disappears out from under the selection (merged away by another window,
    // workspace re-rooted). The next refresh must not leave an id main no longer
    // knows selected, or the next session would be created against nothing.
    listed = [projectA];
    fireEvent.click(within(row(projectA.id)).getByTestId('project-rename'));
    fireEvent.change(screen.getByTestId('project-rename-input'), { target: { value: 'Alpha' } });
    fireEvent.keyDown(screen.getByTestId('project-rename-input'), { key: 'Enter' });

    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent(projectA.id));
  });
});

describe('active project selection', () => {
  function ActiveProbe(): React.ReactElement {
    const { activeProjectId } = useProjects();
    return <span data-testid="active">{activeProjectId ?? 'none'}</span>;
  }

  it('selects nothing when no project matches the workspace root', async () => {
    // Picking an arbitrary project here would silently redirect the next session
    // into an unrelated directory — possibly a checkout that no longer exists.
    api.getWorkspaceRoot.mockResolvedValue('/somewhere/unrelated');
    render(
      <ProjectsProvider>
        <ProjectSwitcher />
        <ActiveProbe />
      </ProjectsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('project-list')).toBeInTheDocument());
    expect(screen.getByTestId('active')).toHaveTextContent('none');
    expect(screen.queryByTestId('project-active-name')).not.toBeInTheDocument();
  });

  it('selects the project whose rootDir is the workspace root', async () => {
    api.getWorkspaceRoot.mockResolvedValue(projectB.rootDir);
    render(
      <ProjectsProvider>
        <ProjectSwitcher />
        <ActiveProbe />
      </ProjectsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent(projectB.id));
  });
});
