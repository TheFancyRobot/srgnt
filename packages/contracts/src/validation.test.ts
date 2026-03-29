import { describe, it, expect } from 'vitest';
import { parseSync } from './shared-schemas.js';
import {
  STask,
  SEvent,
  SMessage,
  SPerson,
  SArtifact,
  SEntityEnvelope,
  taskFixtures,
  eventFixtures,
  messageFixtures,
  personFixtures,
  artifactFixtures,
  validateEntity,
  v1EntityTypes,
} from './entities/index.js';
import {
  SSkillManifest,
  SSkillCapability,
  SApprovalRequirement,
  SSkillInput,
  SSkillOutput,
} from './skills/index.js';
import {
  SConnectorManifest,
  SConnectorCapability,
  SConnectorConfig,
  SConnectorCapabilityDef,
  SConnectorStatus,
  SConnectorHealth,
  SConnectorSession,
} from './connectors/index.js';
import {
  SExecutorManifest,
  SSkillRunInput,
  SSkillRunOutput,
  SSkillRunRecord,
  SRunStatus,
  SApprovalRequest,
  SExecutorContext,
  type SkillRunInput,
  type SkillRunOutput,
  type ExecutorManifest,
  type RunStatus,
  type ApprovalRequest,
  type ExecutorContext,
} from './executors/index.js';

describe('Contract Validation Suite', () => {
  describe('Entity Contracts', () => {
    it('validates all entity types from fixtures', () => {
      expect(validateEntity(taskFixtures[0])).toBe(true);
      expect(validateEntity(eventFixtures[0])).toBe(true);
      expect(validateEntity(messageFixtures[0])).toBe(true);
      expect(validateEntity(personFixtures[0])).toBe(true);
      expect(validateEntity(artifactFixtures[0])).toBe(true);
    });

    it('rejects invalid entity types', () => {
      expect(validateEntity({ envelope: { id: 'x', canonicalType: 'InvalidType' } })).toBe(false);
    });

    it('has exactly 5 v1 entity types', () => {
      expect(v1EntityTypes.length).toBe(5);
    });

    it('entity envelope is used by all entities', () => {
      const entities = [taskFixtures[0], eventFixtures[0], messageFixtures[0], personFixtures[0], artifactFixtures[0]];
      for (const entity of entities) {
        expect(() => parseSync(SEntityEnvelope, (entity as { envelope?: unknown }).envelope)).not.toThrow();
      }
    });
  });

  describe('Skill Manifest Contract', () => {
    it('validates a complete skill manifest', () => {
      const manifest = {
        name: 'daily-briefing',
        version: '1.0.0',
        description: 'Generate daily briefing',
        purpose: 'Prepare daily summary',
        inputs: [{ name: 'date', type: 'date', required: false }],
        outputs: [{ name: 'briefing', contentType: 'markdown' }],
        requiredCapabilities: ['read:tasks', 'read:calendar'],
        approvalRequirements: [{ capability: 'read:tasks', reason: 'Need tasks' }],
        connectorDependencies: ['jira'],
      };
      expect(() => parseSync(SSkillManifest, manifest)).not.toThrow();
    });

    it('validates skill capabilities', () => {
      expect(() => parseSync(SSkillCapability, 'read:tasks')).not.toThrow();
      expect(() => parseSync(SSkillCapability, 'write:artifacts')).not.toThrow();
    });

    it('rejects invalid skill capabilities', () => {
      expect(() => parseSync(SSkillCapability, 'invalid')).toThrow();
    });
  });

  describe('Connector Manifest Contract', () => {
    it('validates a complete connector manifest', () => {
      const manifest = {
        id: 'jira-connector',
        name: 'Jira Connector',
        version: '1.0.0',
        description: 'Connector for Jira',
        provider: 'atlassian',
        authType: 'oauth2',
        config: {
          baseUrl: 'https://api.atlassian.com',
          timeout: 30000,
        },
        capabilities: [
          {
            capability: 'read',
            supportedOperations: ['getIssue', 'searchIssues'],
            entityMappings: [
              { canonicalType: 'Task', providerType: 'Issue' },
            ],
          },
        ],
        entityTypes: ['Task'],
        freshnessThresholdMs: 300000,
      };
      expect(() => parseSync(SConnectorManifest, manifest)).not.toThrow();
    });

    it('validates connector capabilities', () => {
      expect(() => parseSync(SConnectorCapability, 'query')).not.toThrow();
      expect(() => parseSync(SConnectorCapability, 'read')).not.toThrow();
      expect(() => parseSync(SConnectorCapability, 'write')).not.toThrow();
    });

    it('validates connector health status', () => {
      const health = {
        status: 'connected' as const,
        lastSyncAt: '2024-03-25T10:00:00Z',
        entityCounts: { Task: 10 },
      };
      expect(() => parseSync(SConnectorHealth, health)).not.toThrow();
    });

    it('validates connector session', () => {
      const session = {
        connectorId: 'jira-connector',
        authType: 'oauth2' as const,
        authenticatedAt: '2024-03-25T10:00:00Z',
      };
      expect(() => parseSync(SConnectorSession, session)).not.toThrow();
    });
  });

  describe('Executor and Run Contracts', () => {
    it('validates a complete skill run', () => {
      const input: SkillRunInput = {
        skillName: 'daily-briefing',
        skillVersion: '1.0.0',
        parameters: { date: '2024-03-25' },
        context: {
          workspaceRoot: '/Users/test/workspace',
          skillHome: '/Users/test/workspace/.command-center/skills',
          connectorHome: '/Users/test/workspace/.command-center/connectors',
          artifactHome: '/Users/test/workspace/.command-center/artifacts',
          runHistoryHome: '/Users/test/workspace/.command-center/runs',
          environment: { NODE_ENV: 'test' },
        },
      };
      expect(() => parseSync(SSkillRunInput, input)).not.toThrow();
    });

    it('validates skill run output', () => {
      const output: SkillRunOutput = {
        status: 'completed',
        result: { briefing: '# Daily Briefing' },
        artifacts: ['artifact-1', 'artifact-2'],
        approvals: [],
        logs: ['Started', 'Completed'],
        startedAt: '2024-03-25T10:00:00Z',
        completedAt: '2024-03-25T10:01:00Z',
        durationMs: 60000,
      };
      expect(() => parseSync(SSkillRunOutput, output)).not.toThrow();
    });

    it('validates executor manifest', () => {
      const manifest: ExecutorManifest = {
        name: 'default-executor',
        version: '1.0.0',
        description: 'Default skill executor',
        capabilities: ['execute', 'approve', 'cancel', 'query'],
        maxConcurrentRuns: 5,
        timeoutMs: 600000,
        metadata: {},
      };
      expect(() => parseSync(SExecutorManifest, manifest)).not.toThrow();
    });

    it('validates run status transitions', () => {
      const statuses: RunStatus[] = [
        'pending',
        'running',
        'waiting_for_approval',
        'completed',
        'failed',
        'cancelled',
      ];
      for (const status of statuses) {
        expect(() => parseSync(SRunStatus, status)).not.toThrow();
      }
    });

    it('validates approval request with all fields', () => {
      const request: ApprovalRequest = {
        id: 'approval-1',
        capability: 'read:tasks',
        reason: 'Need to read tasks for briefing',
        requestedAt: '2024-03-25T10:00:00Z',
        requestedBy: 'agent@srgnt.app',
        status: 'approved',
        resolvedAt: '2024-03-25T10:01:00Z',
        resolver: 'user@srgnt.app',
      };
      expect(() => parseSync(SApprovalRequest, request)).not.toThrow();
    });
  });

  describe('Cross-Contract Integration', () => {
    it('skill can reference connector capabilities it needs', () => {
      const skillManifest = {
        name: 'sync-tasks',
        version: '1.0.0',
        description: 'Sync tasks from Jira',
        purpose: 'Sync tasks from external system',
        requiredCapabilities: ['read:tasks', 'write:tasks'],
        connectorDependencies: ['jira'],
      };
      const connectorManifest = {
        id: 'jira',
        name: 'Jira Connector',
        version: '1.0.0',
        description: 'Jira',
        provider: 'atlassian',
        authType: 'oauth2',
        capabilities: [
          {
            capability: 'read',
            supportedOperations: ['getIssue', 'searchIssues'],
          },
          {
            capability: 'write',
            supportedOperations: ['updateIssue', 'createIssue'],
          },
        ],
      };

      expect(() => parseSync(SSkillManifest, skillManifest)).not.toThrow();
      expect(() => parseSync(SConnectorManifest, connectorManifest)).not.toThrow();

      const skillParsed = parseSync(SSkillManifest, skillManifest);
      const connectorParsed = parseSync(SConnectorManifest, connectorManifest);

      const skillCaps = skillParsed.requiredCapabilities;
      const connectorCaps = connectorParsed.capabilities.map((c) => c.capability);

      expect(skillCaps.every((cap) => {
        if (cap.startsWith('read:')) return connectorCaps.includes('read');
        if (cap.startsWith('write:')) return connectorCaps.includes('write');
        return false;
      })).toBe(true);
    });

    it('executor context is compatible with skill run', () => {
      const context: ExecutorContext = {
        workspaceRoot: '/Users/test/workspace',
        skillHome: '/Users/test/workspace/.command-center/skills',
        connectorHome: '/Users/test/workspace/.command-center/connectors',
        artifactHome: '/Users/test/workspace/.command-center/artifacts',
        runHistoryHome: '/Users/test/workspace/.command-center/runs',
        environment: {},
      };

      const runInput: SkillRunInput = {
        skillName: 'daily-briefing',
        skillVersion: '1.0.0',
        parameters: {},
        context,
      };

      expect(() => parseSync(SSkillRunInput, runInput)).not.toThrow();
    });
  });
});
