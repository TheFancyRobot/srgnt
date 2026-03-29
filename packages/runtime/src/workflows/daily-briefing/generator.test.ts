import { describe, it, expect, beforeEach } from 'vitest';
import { CanonicalStore } from '../../store/canonical.js';
import { createDailyBriefingGenerator, DailyBriefingGenerator } from './generator.js';

describe('DailyBriefingGenerator', () => {
  let store: CanonicalStore;
  let generator: DailyBriefingGenerator;

  beforeEach(() => {
    store = new CanonicalStore();
    generator = createDailyBriefingGenerator(store);
  });

  it('generates a briefing with runId and timestamps', () => {
    const briefing = generator.generate();

    expect(briefing.envelope.id).toMatch(/^briefing-/);
    expect(briefing.metadata.runId).toBeDefined();
    expect(briefing.metadata.generatedAt).toBeDefined();
  });

  it('generates markdown content with all sections', () => {
    const briefing = generator.generate();

    expect(briefing.content).toContain('# Daily Briefing');
    expect(briefing.content).toContain('## Priorities');
    expect(briefing.content).toContain('## Schedule');
    expect(briefing.content).toContain('## Attention Needed');
    expect(briefing.content).toContain('## Blockers / Watch-outs');
  });

  it('sources counts are reported correctly', () => {
    const briefing = generator.generate();

    expect(briefing.metadata.sources.tasks).toBe('0 loaded');
    expect(briefing.metadata.sources.events).toBe('0 loaded');
    expect(briefing.metadata.sources.messages).toBe('0 loaded');
  });

  it('uses custom runId when provided', () => {
    const customRunId = 'custom-run-123';
    const briefing = generator.generate({ runId: customRunId });

    expect(briefing.metadata.runId).toBe(customRunId);
    expect(briefing.content).toContain(customRunId);
  });

  it('uses custom date when provided', () => {
    const briefing = generator.generate({ date: '2026-03-22' });

    expect(briefing.envelope.id).toBe('briefing-2026-03-22');
    expect(briefing.content).toContain('2026-03-22');
  });

  it('creates briefing with metadata section', () => {
    const briefing = generator.generate();

    expect(briefing.content).toContain('## Metadata');
    expect(briefing.content).toContain('Run ID:');
    expect(briefing.content).toContain('Generated:');
    expect(briefing.content).toContain('Sources:');
  });

  it('registers briefing in artifact registry', () => {
    const briefing = generator.generate();
    generator.registerBriefing(briefing);

    expect(briefing.metadata.sources.tasks).toContain('loaded');
    expect(briefing.metadata.sources.events).toContain('loaded');
    expect(briefing.metadata.sources.messages).toContain('loaded');
  });

  it('handles empty store gracefully', () => {
    const briefing = generator.generate();

    expect(briefing.priorities.items).toEqual([]);
    expect(briefing.schedule.items).toEqual([]);
    expect(briefing.attentionNeeded.items).toEqual([]);
    expect(briefing.blockers.items).toContain('- No active blockers');
  });

  it('includes footer in markdown', () => {
    const briefing = generator.generate();

    expect(briefing.content).toContain('*This briefing was generated automatically');
  });

  it('content is non-empty string', () => {
    const briefing = generator.generate();

    expect(typeof briefing.content).toBe('string');
    expect(briefing.content.length).toBeGreaterThan(0);
  });
});