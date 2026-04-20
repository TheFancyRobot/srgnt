import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SDataAccessScope,
  SMinimizedPayload,
  SFredWorkflowRequest,
  SFredWorkflowResult,
} from './fred-request.js';

describe('SDataAccessScope', () => {
  it('accepts read, write, admin', () => {
    for (const scope of ['read', 'write', 'admin']) {
      expect(Schema.decodeUnknownSync(SDataAccessScope)(scope)).toBe(scope);
    }
  });

  it('rejects an unknown scope', () => {
    expect(() => Schema.decodeUnknownSync(SDataAccessScope)('root')).toThrow();
  });
});

describe('SMinimizedPayload', () => {
  it('round-trips a valid payload', () => {
    const payload = {
      id: 'entity-1',
      type: 'Task',
      size: 42,
      checksum: 'sha256:abc',
      fields: ['title', 'status'],
    };
    expect(Schema.decodeUnknownSync(SMinimizedPayload)(payload)).toEqual(payload);
  });

  it('rejects a missing checksum', () => {
    expect(() =>
      Schema.decodeUnknownSync(SMinimizedPayload)({
        id: 'x',
        type: 'y',
        size: 1,
        fields: [],
      }),
    ).toThrow();
  });

  it('rejects a non-array fields value', () => {
    expect(() =>
      Schema.decodeUnknownSync(SMinimizedPayload)({
        id: 'x',
        type: 'y',
        size: 1,
        checksum: 'h',
        fields: 'title',
      }),
    ).toThrow();
  });
});

describe('SFredWorkflowRequest', () => {
  const minimal = {
    workflowId: 'wf-1',
    userId: 'user-1',
    userConsent: true,
    dataAccessScope: 'read' as const,
  };

  it('applies documented defaults for omitted optional fields', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowRequest)(minimal);
    expect(parsed.resourceId).toBe('');
    expect(parsed.dryRun).toBe(false);
    expect(parsed.timeoutMs).toBe(30000);
    expect(parsed.minimizedPayload).toEqual({
      id: '',
      type: '',
      size: 0,
      checksum: '',
      fields: [],
    });
  });

  it('round-trips all fields when supplied explicitly', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowRequest)({
      ...minimal,
      resourceId: 'entity-99',
      dryRun: true,
      timeoutMs: 5000,
      minimizedPayload: {
        id: 'p',
        type: 't',
        size: 1,
        checksum: 'h',
        fields: ['a'],
      },
    });
    expect(parsed.dryRun).toBe(true);
    expect(parsed.timeoutMs).toBe(5000);
    expect(parsed.minimizedPayload.fields).toEqual(['a']);
  });

  it('rejects a request missing userConsent', () => {
    const { userConsent: _omit, ...rest } = minimal;
    expect(() => Schema.decodeUnknownSync(SFredWorkflowRequest)(rest)).toThrow();
  });

  it('rejects a non-boolean userConsent', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFredWorkflowRequest)({ ...minimal, userConsent: 'yes' }),
    ).toThrow();
  });
});

describe('SFredWorkflowResult', () => {
  it('applies defaults for optional fields', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowResult)({
      result: 'ok',
      confidence: 0.92,
      executionTimeMs: 120,
      status: 'success',
    });
    expect(parsed.artifacts).toEqual([]);
    expect(parsed.errorMessage).toBe('');
  });

  it('rejects an unknown status', () => {
    expect(() =>
      Schema.decodeUnknownSync(SFredWorkflowResult)({
        result: 'ok',
        confidence: 1,
        executionTimeMs: 1,
        status: 'running',
      }),
    ).toThrow();
  });

  it('round-trips artifacts and errorMessage', () => {
    const parsed = Schema.decodeUnknownSync(SFredWorkflowResult)({
      result: 'done',
      confidence: 0.5,
      artifacts: ['artifact-1'],
      executionTimeMs: 1,
      status: 'partial',
      errorMessage: 'partial result',
    });
    expect(parsed.artifacts).toEqual(['artifact-1']);
    expect(parsed.errorMessage).toBe('partial result');
  });
});
