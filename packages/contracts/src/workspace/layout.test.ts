import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SWorkspaceDirectoryType,
  SCommandCenterSubdirectory,
  SWorkspaceLayout,
  SWorkspaceRoot,
  SPersistenceContract,
  SFileBackedRecord,
  defaultWorkspaceLayout,
} from './layout.js';

describe('SWorkspaceDirectoryType', () => {
  it('accepts valid directory types', () => {
    const types = ['daily', 'projects', 'people', 'meetings', 'systems', 'dashboards', 'inbox'] as const;
    for (const type of types) {
      expect(() => parseSync(SWorkspaceDirectoryType, type)).not.toThrow();
    }
  });

  it('rejects invalid directory types', () => {
    expect(() => parseSync(SWorkspaceDirectoryType, 'invalid')).toThrow();
  });
});

describe('SCommandCenterSubdirectory', () => {
  it('accepts valid subdirectories', () => {
    const subs = ['config', 'skills', 'connectors', 'state', 'logs', 'cache', 'templates'] as const;
    for (const sub of subs) {
      expect(() => parseSync(SCommandCenterSubdirectory, sub)).not.toThrow();
    }
  });
});

describe('SWorkspaceLayout', () => {
  it('validates a minimal layout', () => {
    const layout = { version: '1.0.0' };
    expect(() => parseSync(SWorkspaceLayout, layout)).not.toThrow();
  });

  it('applies defaults', () => {
    const layout = { version: '1.0.0' };
    const parsed = parseSync(SWorkspaceLayout, layout);
    expect(parsed.rootDirectories).toEqual([]);
    expect(parsed.commandCenter.root).toBe('.command-center');
  });

  it('validates the default layout', () => {
    expect(() => parseSync(SWorkspaceLayout, defaultWorkspaceLayout)).not.toThrow();
  });

  it('rejects invalid semver', () => {
    expect(() => parseSync(SWorkspaceLayout, { version: 'invalid' })).toThrow();
  });
});

describe('SWorkspaceRoot', () => {
  it('validates a workspace root', () => {
    const root = {
      path: '/Users/test/workspace',
      layout: defaultWorkspaceLayout,
      createdAt: '2024-03-25T10:00:00Z',
      lastAccessedAt: '2024-03-25T10:00:00Z',
    };
    expect(() => parseSync(SWorkspaceRoot, root)).not.toThrow();
  });
});

describe('SPersistenceContract', () => {
  it('validates json format', () => {
    const contract = { format: 'json' as const, schema: 'Task', fileExtension: '.json' };
    expect(() => parseSync(SPersistenceContract, contract)).not.toThrow();
  });

  it('validates yaml format', () => {
    const contract = { format: 'yaml' as const, schema: 'Task', fileExtension: '.yaml' };
    expect(() => parseSync(SPersistenceContract, contract)).not.toThrow();
  });

  it('validates markdown format', () => {
    const contract = { format: 'markdown' as const, schema: 'Task', fileExtension: '.md' };
    expect(() => parseSync(SPersistenceContract, contract)).not.toThrow();
  });
});

describe('SFileBackedRecord', () => {
  it('validates a minimal record', () => {
    const record = {
      path: 'Daily/2024-03-25.md',
      format: 'markdown' as const,
      schema: 'Artifact',
      content: '# Daily Briefing',
      lastModified: '2024-03-25T10:00:00Z',
    };
    expect(() => parseSync(SFileBackedRecord, record)).not.toThrow();
  });

  it('validates with optional fields', () => {
    const record = {
      path: 'Daily/2024-03-25.md',
      format: 'markdown' as const,
      schema: 'Artifact',
      content: '# Daily Briefing',
      checksum: 'abc123',
      lastModified: '2024-03-25T10:00:00Z',
      metadata: { author: 'test' },
    };
    expect(() => parseSync(SFileBackedRecord, record)).not.toThrow();
  });
});

describe('defaultWorkspaceLayout', () => {
  it('has all required directory types', () => {
    const types = defaultWorkspaceLayout.rootDirectories.map(d => d.type);
    expect(types).toContain('daily');
    expect(types).toContain('projects');
    expect(types).toContain('people');
    expect(types).toContain('meetings');
    expect(types).toContain('systems');
    expect(types).toContain('dashboards');
    expect(types).toContain('inbox');
  });

  it('has all command center subdirectories', () => {
    const cc = defaultWorkspaceLayout.commandCenter;
    expect(cc.subdirectories.config).toBe('.command-center/config');
    expect(cc.subdirectories.skills).toBe('.command-center/skills');
    expect(cc.subdirectories.connectors).toBe('.command-center/connectors');
    expect(cc.subdirectories.state).toBe('.command-center/state');
    expect(cc.subdirectories.logs).toBe('.command-center/logs');
  });
});
