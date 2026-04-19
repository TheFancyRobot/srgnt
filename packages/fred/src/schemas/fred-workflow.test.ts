import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SDataAccessScope,
  SFredWorkflowStep,
  SFredEntitlement,
  SFredWorkflowDefinition,
  SFredWorkflowContext,
  SFredWorkflowResult,
} from './fred-workflow.js';

describe('SDataAccessScope', () => {
  it('accepts read, write, admin and rejects others', () => {
    for (const s of ['read', 'write', 'admin']) {
      expect(Schema.decodeUnknownSync(SDataAccessScope)(s)).toBe(s);
    }
    expect(() => Schema.decodeUnknownSync(SDataAccessScope)('delete')).toThrow();
  });
});

describe('SFredEntitlement', () => {
  it('accepts free, premium, enterprise', () => {
    for (const t of ['free', 'premium', 'enterprise']) {
      expect(Schema.decodeUnknownSync(SFredEntitlement)(t)).toBe(t);
    }
  });

  it('rejects an unknown tier', () => {
    expect(() => Schema.decodeUnknownSync(SFredEntitlement)('business')).toThrow();
  });
});

describe('SFredWorkflowStep', () => {
  it('round-trips a valid step', () => {
    const step = {
      stepId: 's1',
      action: 'summarize',
      dataAccessScope: 'read' as const,
      expectedOutput: 'text',
    };
    expect(Schema.decodeUnknownSync(SFredWorkflowStep)(step)).toEqual(step);
  });

  it('rejects a missing action', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFredWorkflowStep)({
        stepId: 's1',
        dataAccessScope: 'read',
        expectedOutput: 't',
      }),
    ).toThrow();
  });
});

describe('SFredWorkflowDefinition', () => {
  it('parses a definition with an empty steps array', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowDefinition)({
      id: 'wf',
      name: 'Workflow',
      steps: [],
      entitlement: 'free',
    });
    expect(parsed.steps).toEqual([]);
  });

  it('parses a definition with nested steps', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowDefinition)({
      id: 'wf',
      name: 'Workflow',
      steps: [
        { stepId: 'a', action: 'read', dataAccessScope: 'read', expectedOutput: 'o1' },
        { stepId: 'b', action: 'summarize', dataAccessScope: 'read', expectedOutput: 'o2' },
      ],
      entitlement: 'premium',
    });
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.entitlement).toBe('premium');
  });

  it('rejects a step with an invalid dataAccessScope', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFredWorkflowDefinition)({
        id: 'wf',
        name: 'Workflow',
        steps: [{ stepId: 'a', action: 'x', dataAccessScope: 'god', expectedOutput: 'y' }],
        entitlement: 'free',
      }),
    ).toThrow();
  });
});

describe('SFredWorkflowContext', () => {
  it('applies default empty parameters', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowContext)({
      userId: 'u',
      userConsent: true,
      workflowId: 'wf',
      dataAccessScope: 'read',
    });
    expect(parsed.parameters).toEqual({});
  });

  it('round-trips parameters', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowContext)({
      userId: 'u',
      userConsent: true,
      workflowId: 'wf',
      dataAccessScope: 'write',
      parameters: { tone: 'formal', lang: 'en' },
    });
    expect(parsed.parameters).toEqual({ tone: 'formal', lang: 'en' });
  });

  it('rejects a context missing userConsent', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFredWorkflowContext)({
        userId: 'u',
        workflowId: 'wf',
        dataAccessScope: 'read',
      }),
    ).toThrow();
  });
});

describe('SFredWorkflowResult', () => {
  it('applies defaults', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowResult)({
      result: 'ok',
      confidence: 0.9,
      executionTimeMs: 1,
      status: 'success',
    });
    expect(parsed.artifacts).toEqual([]);
    expect(parsed.errorMessage).toBe('');
  });

  it('rejects an unknown status', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFredWorkflowResult)({
        result: 'x',
        confidence: 1,
        executionTimeMs: 1,
        status: 'pending',
      }),
    ).toThrow();
  });
});
