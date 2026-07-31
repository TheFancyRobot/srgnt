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

describe('SProject permissionPolicy (PHASE-24, STEP-24-02)', () => {
  it('decodes a per-kind policy', () => {
    const project = parseSync(SProject, {
      ...validProject,
      permissionPolicy: { read: 'allow', execute: 'ask', delete: 'reject' },
    });
    expect(project.permissionPolicy).toEqual({ read: 'allow', execute: 'ask', delete: 'reject' });
  });

  it('rejects a decision outside allow/reject/ask', () => {
    expect(
      safeParse(SProject, { ...validProject, permissionPolicy: { read: 'maybe' } }).success,
    ).toBe(false);
  });

  it('is absent by default — no policy means pure default-ask', () => {
    expect(parseSync(SProject, validProject).permissionPolicy).toBeUndefined();
  });

  it('rejects a blank or over-long name', () => {
    expect(safeParse(SProject, { ...validProject, name: '' }).success).toBe(false);
    expect(safeParse(SProject, { ...validProject, name: 'x'.repeat(121) }).success).toBe(false);
    expect(safeParse(SProject, { ...validProject, name: 'x'.repeat(120) }).success).toBe(true);
  });
});
