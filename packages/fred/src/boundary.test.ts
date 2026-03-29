import { describe, it, expect } from 'vitest';
import { parseSync, safeParse } from '@srgnt/contracts';
import {
  SFredFeature,
  SFredBoundary,
  SFredRequest,
  SFredResponse,
  defaultFredBoundary,
  premiumFredBoundary,
  enterpriseFredBoundary,
} from './boundary.js';

describe('SFredFeature', () => {
  it('accepts valid features', () => {
    expect(parseSync(SFredFeature, 'ai-summarization')).toBe('ai-summarization');
    expect(parseSync(SFredFeature, 'smart-scheduling')).toBe('smart-scheduling');
  });

  it('rejects invalid features', () => {
    expect(safeParse(SFredFeature, 'invalid').success).toBe(false);
  });
});

describe('SFredBoundary', () => {
  it('validates with defaults', () => {
    const result = parseSync(SFredBoundary, {});
    expect(result.canInvokeAi).toBe(false);
    expect(result.canModifyWorkspace).toBe(false);
    expect(result.canAccessExternalData).toBe(false);
  });

  it('validates the default boundary preset', () => {
    const result = parseSync(SFredBoundary, defaultFredBoundary);
    expect(result.canInvokeAi).toBe(true);
    expect(result.maxTokensPerRequest).toBe(4096);
  });
});

describe('SFredRequest', () => {
  it('validates a minimal request', () => {
    const result = parseSync(SFredRequest, { feature: 'ai-summarization' });
    expect(result.feature).toBe('ai-summarization');
    expect(result.context).toEqual({});
  });
});

describe('SFredResponse', () => {
  it('validates a response', () => {
    const result = parseSync(SFredResponse, {
      feature: 'ai-summarization',
      result: 'Summary text',
    });
    expect(result.feature).toBe('ai-summarization');
    expect(result.artifacts).toEqual([]);
  });
});

describe('boundary presets', () => {
  it('premium extends default', () => {
    expect(premiumFredBoundary.canInvokeAi).toBe(true);
    expect(premiumFredBoundary.canModifyWorkspace).toBe(true);
    expect(premiumFredBoundary.maxTokensPerRequest).toBe(16384);
  });

  it('enterprise extends premium', () => {
    expect(enterpriseFredBoundary.canModifyWorkspace).toBe(true);
    expect(enterpriseFredBoundary.maxTokensPerRequest).toBe(16384);
    expect(enterpriseFredBoundary.rateLimitPerMinute).toBe(60);
    expect(() => parseSync(SFredBoundary, enterpriseFredBoundary)).not.toThrow();
  });
});
