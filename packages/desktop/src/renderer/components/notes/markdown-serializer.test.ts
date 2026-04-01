import { describe, expect, it } from 'vitest';
import { parseFrontmatter, serializeWithFrontmatter, extractFrontmatterTitle, buildDefaultFrontmatter } from './markdown-serializer.js';

describe('parseFrontmatter', () => {
  it('extracts YAML frontmatter and body', () => {
    const raw = '---\ntitle: "Test"\ncreated: "2026-04-01"\n---\n\nHello world';
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBe('title: "Test"\ncreated: "2026-04-01"');
    expect(result.body).toBe('\nHello world');
  });

  it('returns null frontmatter when none present', () => {
    const raw = 'Just some text\nwith no frontmatter';
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(raw);
  });

  it('handles CRLF line endings', () => {
    const raw = '---\r\ntitle: "Test"\r\n---\r\nBody text';
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBe('title: "Test"');
    expect(result.body).toBe('Body text');
  });

  it('handles empty body after frontmatter', () => {
    const raw = '---\ntitle: "Empty"\n---\n';
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBe('title: "Empty"');
    expect(result.body).toBe('');
  });

  it('does not match frontmatter not at start', () => {
    const raw = 'Some text\n---\ntitle: "Test"\n---\nMore text';
    const result = parseFrontmatter(raw);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(raw);
  });
});

describe('serializeWithFrontmatter', () => {
  it('reconstructs full markdown with frontmatter', () => {
    const result = serializeWithFrontmatter('title: "Test"', 'Body');
    expect(result).toBe('---\ntitle: "Test"\n---\nBody');
  });

  it('returns body only when no frontmatter', () => {
    const result = serializeWithFrontmatter(null, 'Just body');
    expect(result).toBe('Just body');
  });

  it('round-trips through parse and serialize', () => {
    const original = '---\ntitle: "Round Trip"\ncreated: "2026-04-01"\n---\nSome content here.';
    const parsed = parseFrontmatter(original);
    expect(parsed.frontmatter).toBe('title: "Round Trip"\ncreated: "2026-04-01"');
    expect(parsed.body).toBe('Some content here.');
    const reconstructed = serializeWithFrontmatter(parsed.frontmatter, parsed.body);
    expect(reconstructed).toBe(original);
  });
});

describe('extractFrontmatterTitle', () => {
  it('extracts quoted title', () => {
    expect(extractFrontmatterTitle('title: "My Note"')).toBe('My Note');
  });

  it('extracts unquoted title', () => {
    expect(extractFrontmatterTitle('title: My Note')).toBe('My Note');
  });

  it('extracts single-quoted title', () => {
    expect(extractFrontmatterTitle("title: 'My Note'")).toBe('My Note');
  });

  it('returns null for null frontmatter', () => {
    expect(extractFrontmatterTitle(null)).toBeNull();
  });

  it('returns null when title not present', () => {
    expect(extractFrontmatterTitle('created: "2026-04-01"')).toBeNull();
  });
});

describe('buildDefaultFrontmatter', () => {
  it('creates frontmatter with title and date', () => {
    const result = buildDefaultFrontmatter('New Note');
    expect(result).toContain('title: "New Note"');
    expect(result).toContain('created: "');
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
