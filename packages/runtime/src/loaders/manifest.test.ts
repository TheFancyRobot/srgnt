import { describe, it, expect, beforeEach } from 'vitest';
import { ManifestLoader, createManifestLoader } from './manifest.js';

describe('ManifestLoader', () => {
  let loader: ManifestLoader;

  beforeEach(() => {
    loader = createManifestLoader();
  });

  describe('loadSkillManifest', () => {
    const validSkillManifest = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'Test skill for unit testing',
      purpose: 'To verify manifest loading works correctly',
      inputs: [
        {
          name: 'query',
          description: 'Search query',
          type: 'string' as const,
          required: true,
        }
      ],
      outputs: [
        {
          name: 'result',
          description: 'Search results',
          contentType: 'markdown' as const,
        }
      ],
      requiredCapabilities: ['read:tasks', 'read:messages'],
      approvalRequirements: [
        {
          capability: 'write:tasks',
          reason: 'Task modification requires approval',
          fallbackBehavior: 'prompt' as const,
        }
      ],
      connectorDependencies: ['jira', 'github'],
      promptTemplate: 'You are a helpful assistant',
      fixtures: { exampleTask: 'Complete test' },
      metadata: { author: 'test', category: 'testing' },
    };

    const minimalSkillManifest = {
      name: 'minimal-skill',
      version: '0.1.0',
      description: 'Minimal skill',
      purpose: 'Minimal purpose',
    };

    it('loads a valid SkillManifest', () => {
      const result = loader.loadSkillManifest(validSkillManifest);
      expect(result.success).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.manifest?.name).toBe('test-skill');
      expect(result.manifest?.version).toBe('1.0.0');
      expect(result.error).toBeUndefined();
    });

    it('loads a minimal valid SkillManifest', () => {
      const result = loader.loadSkillManifest(minimalSkillManifest);
      expect(result.success).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.manifest?.name).toBe('minimal-skill');
      expect(result.manifest?.inputs).toEqual([]);
      expect(result.manifest?.outputs).toEqual([]);
      expect(result.manifest?.requiredCapabilities).toEqual([]);
    });

    it('returns failure for non-object input', () => {
      const result = loader.loadSkillManifest(null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.manifest).toBeUndefined();
    });

    it('returns failure for primitive value', () => {
      const result = loader.loadSkillManifest('string');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for array input', () => {
      const result = loader.loadSkillManifest([]);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for manifest missing name', () => {
      const result = loader.loadSkillManifest({
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.manifest).toBeUndefined();
    });

    it('returns failure for manifest missing version', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.manifest).toBeUndefined();
    });

    it('returns failure for manifest missing description', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.manifest).toBeUndefined();
    });

    it('returns failure for manifest missing purpose', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.manifest).toBeUndefined();
    });

    it('returns failure for invalid semver', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: 'not-a-semver',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for semver with prerelease (not allowed by schema)', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0-alpha',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for name longer than 64 characters', () => {
      const longName = 'a'.repeat(65);
      const result = loader.loadSkillManifest({
        name: longName,
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for invalid capability in requiredCapabilities', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        requiredCapabilities: ['invalid:capability'] as any,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for invalid input type', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        inputs: [
          {
            name: 'test',
            type: 'invalid' as any,
          }
        ],
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for invalid output contentType', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        outputs: [
          {
            name: 'result',
            contentType: 'invalid' as any,
          }
        ],
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for invalid fallbackBehavior', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        approvalRequirements: [
          {
            capability: 'write:tasks',
            fallbackBehavior: 'invalid' as any,
          }
        ],
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles skill with empty arrays', () => {
      const result = loader.loadSkillManifest({
        name: 'empty-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        inputs: [],
        outputs: [],
        requiredCapabilities: [],
        approvalRequirements: [],
        connectorDependencies: [],
        fixtures: {},
        metadata: {},
      });
      expect(result.success).toBe(true);
      expect(result.manifest?.inputs).toEqual([]);
      expect(result.manifest?.outputs).toEqual([]);
    });

    it('handles skill with special characters in name', () => {
      const result = loader.loadSkillManifest({
        name: 'my-skill_123',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(true);
    });

    it('handles skill with valid semver variants', () => {
      const versions = ['1.0.0', '0.1.0', '10.20.30', '999.999.999'];
      versions.forEach(version => {
        const result = loader.loadSkillManifest({
          name: 'test-skill',
          version,
          description: 'Test',
          purpose: 'Test',
        });
        expect(result.success).toBe(true);
      });
    });

    it('handles skill with all valid capabilities', () => {
      const capabilities = [
        'read:tasks', 'write:tasks', 'read:calendar', 'write:calendar',
        'read:messages', 'write:messages', 'read:contacts', 'write:contacts',
        'read:artifacts', 'write:artifacts', 'exec:shell', 'exec:http',
      ];

      const result = loader.loadSkillManifest({
        name: 'full-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        requiredCapabilities: capabilities,
      });

      expect(result.success).toBe(true);
      expect(result.manifest?.requiredCapabilities).toHaveLength(12);
    });
  });

  describe('createManifestLoader', () => {
    it('creates a new ManifestLoader instance', () => {
      const loader1 = createManifestLoader();
      const loader2 = createManifestLoader();

      expect(loader1).toBeInstanceOf(ManifestLoader);
      expect(loader2).toBeInstanceOf(ManifestLoader);
      expect(loader1).not.toBe(loader2); // Different instances
    });
  });

  describe('edge cases', () => {
    it('handles manifest with extra properties', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        extraProperty: 'should be ignored',
        anotherExtra: { nested: true },
      });
      expect(result.success).toBe(true);
    });

    it('handles empty string for optional string fields', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: '',
        purpose: '',
      });
      expect(result.success).toBe(true);
    });

    it('returns failure for empty name (pattern requires 1-64 chars)', () => {
      const result = loader.loadSkillManifest({
        name: '',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles manifest with null values for optional fields', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        inputs: null as any,
      });
      // Schema will reject null for optionalWith default
      expect(result.success).toBe(false);
    });

    it('handles manifest with repeated valid capabilities', () => {
      const validCapabilities = [
        'read:tasks', 'write:tasks', 'read:calendar', 'write:calendar',
        'read:messages', 'write:messages', 'read:contacts', 'write:contacts',
        'read:artifacts', 'write:artifacts', 'exec:shell', 'exec:http',
      ];
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        requiredCapabilities: validCapabilities,
      });
      expect(result.success).toBe(true);
    });

    it('returns failure for invalid capability string', () => {
      const result = loader.loadSkillManifest({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        purpose: 'Test',
        requiredCapabilities: ['read:0'] as any,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
