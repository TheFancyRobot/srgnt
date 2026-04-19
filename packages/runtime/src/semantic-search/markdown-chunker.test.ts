import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { UnsupportedFileError } from './errors.js';
import {
  parseFrontmatter,
  splitByHeadings,
  chunkOversizedSections,
  takeBlockOverlap,
  extractWikilinks,
  computeContentHash,
  chunkFile,
  splitIntoBlocks,
  stripYamlScalarQuotes,
} from './markdown-chunker.js';

describe('parseFrontmatter', () => {
  it('returns original content when no fence exists', () => {
    const result = parseFrontmatter('# Heading\n\nBody');
    expect(result).toEqual({ title: null, body: '# Heading\n\nBody' });
  });

  it('returns original content when opening fence has no newline', () => {
    const content = '---unterminated';
    expect(parseFrontmatter(content)).toEqual({ title: null, body: content });
  });

  it('returns original content when closing fence is missing', () => {
    const content = '---\ntitle: Broken\nbody: yes';
    expect(parseFrontmatter(content)).toEqual({ title: null, body: content });
  });

  it('extracts title and trims quoted values', () => {
    const content = `---\ntitle:  "  Semantic Search  "\nowner: team\n---\n## Intro\nBody`;
    expect(parseFrontmatter(content)).toEqual({
      title: 'Semantic Search',
      body: '## Intro\nBody',
    });
  });

  it('supports single-quoted titles and keeps body after final fence newline', () => {
    const content = `---\ntitle: ' Weekly Note '\n---\nBody`;
    expect(parseFrontmatter(content)).toEqual({ title: 'Weekly Note', body: 'Body' });
  });
});

describe('stripYamlScalarQuotes', () => {
  it('strips double quotes', () => {
    expect(stripYamlScalarQuotes('"Hello World"')).toBe('Hello World');
  });

  it('strips single quotes', () => {
    expect(stripYamlScalarQuotes("'Hello World'")).toBe('Hello World');
  });

  it('returns unquoted values unchanged', () => {
    expect(stripYamlScalarQuotes('Hello World')).toBe('Hello World');
  });
});

describe('splitIntoBlocks', () => {
  it('returns empty array for blank content', () => {
    expect(splitIntoBlocks(' \n\n\t ')).toEqual([]);
  });

  it('splits content on blank lines and trims each block', () => {
    expect(splitIntoBlocks(' alpha \n\n beta\n\n\n gamma ')).toEqual(['alpha', 'beta', 'gamma']);
  });
});

describe('splitByHeadings', () => {
  it('returns empty array for empty input', () => {
    expect(splitByHeadings('')).toEqual([]);
  });

  it('returns single preamble section when no headings exist', () => {
    expect(splitByHeadings('plain body')).toEqual([
      { level: 0, heading: '', content: 'plain body', headingPath: [] },
    ]);
  });

  it('handles heading-only content', () => {
    expect(splitByHeadings('# Top')).toEqual([
      { level: 1, heading: 'Top', content: '', headingPath: ['# Top'] },
    ]);
  });

  it('normalizes CRLF and builds heading paths with level stacking', () => {
    const sections = splitByHeadings('Intro\r\n\r\n## Section\r\nAlpha\r\n\r\n### Nested\r\nBeta\r\n\r\n## Other\r\nGamma');
    expect(sections).toEqual([
      { level: 0, heading: '', content: 'Intro', headingPath: [] },
      { level: 2, heading: 'Section', content: 'Alpha', headingPath: ['## Section'] },
      {
        level: 3,
        heading: 'Nested',
        content: 'Beta',
        headingPath: ['## Section', '### Nested'],
      },
      { level: 2, heading: 'Other', content: 'Gamma', headingPath: ['## Other'] },
    ]);
  });
});

describe('takeBlockOverlap', () => {
  it('returns content unchanged when overlap is zero', () => {
    expect(takeBlockOverlap('a\n\nb', 0)).toBe('a\n\nb');
  });

  it('returns content unchanged when content length is within overlap', () => {
    expect(takeBlockOverlap('short', 10)).toBe('short');
  });

  it('selects tail blocks until overlap threshold is met', () => {
    const content = 'alpha\n\nbeta beta\n\ngamma gamma gamma';
    expect(takeBlockOverlap(content, 12)).toBe('gamma gamma gamma');
    expect(takeBlockOverlap(content, 20)).toBe('beta beta\n\ngamma gamma gamma');
  });
});

describe('chunkOversizedSections', () => {
  it('keeps small sections as a single chunk', () => {
    const chunks = chunkOversizedSections([
      { level: 1, heading: 'Top', content: 'short text', headingPath: ['# Top'] },
    ], 20, 5);

    expect(chunks).toEqual([{ headingPath: ['# Top'], text: 'short text' }]);
  });

  it('skips empty trimmed sections', () => {
    expect(
      chunkOversizedSections([
        { level: 1, heading: 'Empty', content: '   ', headingPath: ['# Empty'] },
      ])
    ).toEqual([]);
  });

  it('splits oversized single-block sections with overlap', () => {
    const chunks = chunkOversizedSections([
      { level: 2, heading: 'Section', content: 'abcdefghij', headingPath: ['## Section'] },
    ], 6, 2);

    expect(chunks).toEqual([
      { headingPath: ['## Section'], text: 'abcdef' },
      { headingPath: ['## Section'], text: 'efghij' },
    ]);
  });

  it('accumulates paragraph blocks and pushes the final current chunk', () => {
    const chunks = chunkOversizedSections([
      {
        level: 1,
        heading: 'Top',
        content: 'block one\n\nblock two\n\nblock three',
        headingPath: ['# Top'],
      },
    ], 19, 5);

    // chunkSize=19, each block is 9-11 chars
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.every((c) => c.headingPath[0] === '# Top')).toBe(true);
    expect(chunks[0]?.text).toBe('block one');
    expect(chunks[1]?.text).toBe('block two');
  });

  it('handles overlap=0 for oversized multi-block sections', () => {
    const chunks = chunkOversizedSections([
      {
        level: 1,
        heading: 'Top',
        content: 'alpha beta\n\ngamma delta',
        headingPath: ['# Top'],
      },
    ], 11, 0);

    expect(chunks).toEqual([
      { headingPath: ['# Top'], text: 'alpha beta' },
      { headingPath: ['# Top'], text: 'gamma delta' },
    ]);
  });

  it('handles blocks that individually exceed chunk size before later blocks trigger final push', () => {
    const chunks = chunkOversizedSections([
      {
        level: 2,
        heading: 'Oversized',
        content: 'ABCDEFGHIJKL\n\nsmall',
        headingPath: ['## Oversized'],
      },
    ], 6, 2);

    // 'ABCDEFGHIJKL' (12 chars) exceeds chunkSize=6, goes through character-based splitting
    // 'small' (5 chars) fits within chunkSize=6
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => c.headingPath[0] === '## Oversized')).toBe(true);
    // First chunks contain parts of the oversized block
    expect(chunks[0]?.text).toContain('ABCDEF');
  });
});

describe('extractWikilinks', () => {
  it('returns empty array when no wikilinks exist', () => {
    expect(extractWikilinks('plain text')).toEqual([]);
  });

  it('extracts plain, aliased, and anchored wikilinks', () => {
    expect(extractWikilinks('[[Alpha]] [[Beta|Alias]] [[Gamma#Heading]] [[Alpha]]')).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);
  });
});

describe('computeContentHash', () => {
  it('is deterministic and normalized for unicode', () => {
    expect(computeContentHash('Café')).toBe(computeContentHash('Cafe\u0301'));
  });

  it('returns a 16-character hexadecimal digest', () => {
    const hash = computeContentHash('content');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

describe('chunkFile', () => {
  it('prefers frontmatter title over filename fallback', () => {
    const chunks = chunkFile(
      {
        workspaceRelativePath: 'docs/example.md',
        content: `---\ntitle: Search Title\n---\n## Intro\n[[Alpha]] body text`,
        mtimeMs: 1700000000000,
      },
      { chunkSize: 100, overlap: 20, modelId: 'model-a' }
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      workspaceRelativePath: 'docs/example.md',
      fileName: 'example.md',
      title: 'Search Title',
      headingPath: ['## Intro'],
      wikilinks: ['Alpha'],
      mtimeMs: 1700000000000,
      modelId: 'model-a',
    });
  });

  it('falls back to filename-derived title when frontmatter title is absent', () => {
    const chunks = chunkFile({
      workspaceRelativePath: 'notes/weekly-review.markdown',
      content: 'Body without headings',
      mtimeMs: 1,
    });

    expect(chunks[0]).toMatchObject({
      title: 'weekly-review',
      headingPath: [],
      modelId: 'pending-embed',
    });
  });

  it('produces deterministic but unique ids for each chunk', () => {
    const input = {
      workspaceRelativePath: 'notes/multi.md',
      content: `## One\n${'a'.repeat(60)}\n\n## Two\n${'b'.repeat(60)}`,
      mtimeMs: 111,
    };

    const first = chunkFile(input, { chunkSize: 40, overlap: 5, modelId: 'model-a' });
    const second = chunkFile({ ...input, mtimeMs: 999 }, { chunkSize: 40, overlap: 5, modelId: 'model-a' });

    expect(first.map((chunk) => chunk.id)).toEqual(second.map((chunk) => chunk.id));
    expect(new Set(first.map((chunk) => chunk.id)).size).toBe(first.length);
    expect(first[0]?.mtimeMs).toBe(111);
    expect(second[0]?.mtimeMs).toBe(999);
    expect(first[0]?.id).toBe(
      createHash('sha256')
        .update(`${input.workspaceRelativePath}${first[0]?.contentHash}${0}`)
        .digest('hex')
        .slice(0, 16)
    );
  });

  it('extracts wikilinks per chunk', () => {
    const chunks = chunkFile(
      {
        workspaceRelativePath: 'notes/links.md',
        content: `## One\n[[Alpha]] ${'x'.repeat(50)}\n\n## Two\n[[Beta]] ${'y'.repeat(50)}`,
        mtimeMs: 1,
      },
      { chunkSize: 40, overlap: 5 }
    );

    expect(chunks.some((chunk) => chunk.wikilinks.includes('Alpha'))).toBe(true);
    expect(chunks.some((chunk) => chunk.wikilinks.includes('Beta'))).toBe(true);
    expect(chunks.every((chunk) => !(chunk.wikilinks.includes('Alpha') && chunk.wikilinks.includes('Beta')))).toBe(true);
  });

  it('throws UnsupportedFileError for unsupported file types', () => {
    expect(() =>
      chunkFile({ workspaceRelativePath: 'assets/image.png', content: 'binary', mtimeMs: 1 })
    ).toThrow(UnsupportedFileError);
  });

  it('returns empty array for empty markdown content', () => {
    expect(
      chunkFile({ workspaceRelativePath: 'notes/empty.md', content: '   \n\t', mtimeMs: 1 })
    ).toEqual([]);
  });
});
