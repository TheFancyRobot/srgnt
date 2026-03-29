import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SSkillManifest,
  SSkillCapability,
  SApprovalRequirement,
  SSkillInput,
  SSkillOutput,
  SSkillManifestBundle,
} from './manifest.js';

describe('SSkillCapability', () => {
  it('accepts valid capabilities', () => {
    expect(() => parseSync(SSkillCapability, 'read:tasks')).not.toThrow();
    expect(() => parseSync(SSkillCapability, 'write:artifacts')).not.toThrow();
    expect(() => parseSync(SSkillCapability, 'exec:shell')).not.toThrow();
  });

  it('rejects invalid capabilities', () => {
    expect(() => parseSync(SSkillCapability, 'invalid')).toThrow();
    expect(() => parseSync(SSkillCapability, 'read:unknown')).toThrow();
  });
});

describe('SSkillInput', () => {
  it('validates a minimal input', () => {
    const input = { name: 'date', type: 'date' as const };
    expect(() => parseSync(SSkillInput, input)).not.toThrow();
  });

  it('accepts all field types', () => {
    const types = ['string', 'number', 'boolean', 'date', 'array', 'object'] as const;
    for (const type of types) {
      expect(() => parseSync(SSkillInput, { name: 'test', type })).not.toThrow();
    }
  });

  it('rejects invalid type', () => {
    expect(() => parseSync(SSkillInput, { name: 'test', type: 'invalid' })).toThrow();
  });

  it('applies defaults', () => {
    const input = { name: 'test', type: 'string' as const };
    const parsed = parseSync(SSkillInput, input);
    expect(parsed.required).toBe(false);
  });
});

describe('SSkillOutput', () => {
  it('validates a minimal output', () => {
    const output = { name: 'result' };
    expect(() => parseSync(SSkillOutput, output)).not.toThrow();
  });

  it('accepts all content types with defaults', () => {
    const output = { name: 'result', contentType: 'markdown' as const };
    const parsed = parseSync(SSkillOutput, output);
    expect(parsed.contentType).toBe('markdown');
  });
});

describe('SApprovalRequirement', () => {
  it('validates a minimal approval requirement', () => {
    const req = { capability: 'read:tasks' };
    expect(() => parseSync(SApprovalRequirement, req)).not.toThrow();
  });

  it('accepts all fallback behaviors', () => {
    const behaviors = ['block', 'prompt', 'allow'] as const;
    for (const fallback of behaviors) {
      expect(() =>
        parseSync(SApprovalRequirement, {
          capability: 'read:tasks',
          fallbackBehavior: fallback,
        })
      ).not.toThrow();
    }
  });
});

describe('SSkillManifest', () => {
  it('validates a minimal manifest', () => {
    const manifest = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill',
      purpose: 'Testing',
    };
    expect(() => parseSync(SSkillManifest, manifest)).not.toThrow();
  });

  it('rejects invalid semver', () => {
    const manifest = {
      name: 'test-skill',
      version: 'invalid',
      description: 'A test skill',
      purpose: 'Testing',
    };
    expect(() => parseSync(SSkillManifest, manifest)).toThrow();
  });

  it('rejects name longer than 64 chars', () => {
    const manifest = {
      name: 'a'.repeat(65),
      version: '1.0.0',
      description: 'A test skill',
      purpose: 'Testing',
    };
    expect(() => parseSync(SSkillManifest, manifest)).toThrow();
  });

  it('applies defaults to optional fields', () => {
    const manifest = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill',
      purpose: 'Testing',
    };
    const parsed = parseSync(SSkillManifest, manifest);
    expect(parsed.inputs).toEqual([]);
    expect(parsed.outputs).toEqual([]);
    expect(parsed.requiredCapabilities).toEqual([]);
  });

  it('validates a full manifest', () => {
    const manifest = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill',
      purpose: 'Testing',
      inputs: [{ name: 'date', type: 'date', required: true }],
      outputs: [{ name: 'result', contentType: 'markdown' }],
      requiredCapabilities: ['read:tasks'],
      approvalRequirements: [
        { capability: 'read:tasks', reason: 'Need tasks' },
      ],
      connectorDependencies: ['jira'],
    };
    expect(() => parseSync(SSkillManifest, manifest)).not.toThrow();
  });
});

describe('SSkillManifestBundle', () => {
  it('validates a bundle with prompts', () => {
    const bundle = {
      manifest: {
        name: 'test-skill',
        version: '1.0.0',
        description: 'A test skill',
        purpose: 'Testing',
      },
      prompts: {
        'briefing.prompt': 'Generate a briefing for {{date}}',
      },
    };
    expect(() => parseSync(SSkillManifestBundle, bundle)).not.toThrow();
  });

  it('validates a bundle with templates', () => {
    const bundle = {
      manifest: {
        name: 'test-skill',
        version: '1.0.0',
        description: 'A test skill',
        purpose: 'Testing',
      },
      templates: {
        'output.md': '# {{title}}\n\n{{content}}',
      },
    };
    expect(() => parseSync(SSkillManifestBundle, bundle)).not.toThrow();
  });
});
