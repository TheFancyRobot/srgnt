import { describe, it, expect } from 'vitest';
import { parseSync, safeParse } from './shared-schemas.js';
import { SProject } from './project.js';

const validProject = {
  id: 'proj-1',
  name: 'srgnt',
  rootDir: '/Users/dev/srgnt',
  createdAt: '2026-07-12T10:00:00.000Z',
};

describe('SProject', () => {
  it('decodes a minimal project and applies defaults', () => {
    const project = parseSync(SProject, validProject);
    expect(project.additionalDirectories).toEqual([]);
    expect(project.defaultHarnessId).toBeUndefined();
  });

  it('decodes a fully-populated project', () => {
    const project = parseSync(SProject, {
      ...validProject,
      additionalDirectories: ['/Users/dev/srgnt-docs'],
      defaultHarnessId: 'pi',
      updatedAt: '2026-07-12T11:00:00.000Z',
    });
    expect(project.additionalDirectories).toEqual(['/Users/dev/srgnt-docs']);
    expect(project.defaultHarnessId).toBe('pi');
  });

  it('encodes back to a plain object (round-trip)', () => {
    const decoded = parseSync(SProject, validProject);
    const encoded = JSON.parse(JSON.stringify(decoded));
    expect(parseSync(SProject, encoded)).toEqual(decoded);
  });

  it('rejects a project without a rootDir', () => {
    const { rootDir: _omitted, ...rest } = validProject;
    expect(safeParse(SProject, rest).success).toBe(false);
  });

  it('rejects malformed createdAt timestamps', () => {
    expect(safeParse(SProject, { ...validProject, createdAt: 'today' }).success).toBe(false);
  });

  it('rejects non-string additionalDirectories entries', () => {
    expect(safeParse(SProject, { ...validProject, additionalDirectories: [42] }).success).toBe(false);
  });
});
