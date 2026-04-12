import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SBriefingSection,
  SBriefingMetadata,
  SDailyBriefing,
} from './briefing.js';

const validEnvelope = {
  id: 'entity-001',
  canonicalType: 'DailyBriefing',
  createdAt: '2026-01-15T10:00:00.000Z',
};

const validMetadata = {
  id: 'briefing-001',
  runId: 'run-001',
  generatedAt: '2026-01-15T10:00:00.000Z',
  sources: {},
};

const validSection = {
  title: 'Priorities',
  items: ['Task A', 'Task B'],
};

describe('SBriefingSection', () => {
  it('validates section with title and items', () => {
    expect(() => parseSync(SBriefingSection, validSection)).not.toThrow();
  });

  it('rejects missing title', () => {
    expect(() => parseSync(SBriefingSection, { items: ['a'] })).toThrow();
  });

  it('rejects missing items', () => {
    expect(() => parseSync(SBriefingSection, { title: 'Title' })).toThrow();
  });

  it('defaults to empty items array (empty array is valid)', () => {
    expect(() =>
      parseSync(SBriefingSection, { title: 'Title', items: [] }),
    ).not.toThrow();
  });
});

describe('SBriefingMetadata', () => {
  it('validates metadata with all fields', () => {
    expect(() => parseSync(SBriefingMetadata, validMetadata)).not.toThrow();
  });

  it('rejects invalid datetime for generatedAt', () => {
    expect(() =>
      parseSync(SBriefingMetadata, {
        ...validMetadata,
        generatedAt: 'not-a-datetime',
      }),
    ).toThrow();
  });

  it('accepts empty sources record', () => {
    expect(() =>
      parseSync(SBriefingMetadata, {
        ...validMetadata,
        sources: {},
      }),
    ).not.toThrow();
  });
});

describe('SDailyBriefing', () => {
  const validBriefing = {
    envelope: validEnvelope,
    metadata: validMetadata,
    priorities: validSection,
    schedule: validSection,
    attentionNeeded: validSection,
    blockers: validSection,
    content: 'Full briefing content here.',
  };

  it('validates complete daily briefing with all section fields', () => {
    expect(() => parseSync(SDailyBriefing, validBriefing)).not.toThrow();
  });

  it('rejects missing envelope', () => {
    const { envelope: _, ...rest } = validBriefing;
    expect(() => parseSync(SDailyBriefing, rest)).toThrow();
  });

  it('rejects missing metadata', () => {
    const { metadata: _, ...rest } = validBriefing;
    expect(() => parseSync(SDailyBriefing, rest)).toThrow();
  });
});
