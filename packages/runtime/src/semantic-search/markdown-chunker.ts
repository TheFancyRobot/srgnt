import { createHash } from 'crypto';
import * as path from 'path';
import { UnsupportedFileError } from './errors.js';
import type { ChunkMetadata } from './types.js';

export interface FrontmatterResult {
  title: string | null;
  body: string;
}

export interface HeadingSection {
  level: number;
  heading: string;
  content: string;
  headingPath: string[];
}

export interface ChunkInput {
  workspaceRelativePath: string;
  content: string;
  mtimeMs: number;
}

export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
  modelId?: string;
}

export interface TextChunk {
  headingPath: string[];
  text: string;
}

const WIKILINK_REGEX = /\[\[([^\[\]]+?)\]\]/g;
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;
const PLACEHOLDER_MODEL_ID = 'pending-embed';

export function parseFrontmatter(content: string): FrontmatterResult {
  if (!content.startsWith('---')) {
    return { title: null, body: content };
  }

  const newlineAfterFence = content.indexOf('\n');
  if (newlineAfterFence === -1) {
    return { title: null, body: content };
  }

  const closingFenceIndex = content.indexOf('\n---', newlineAfterFence);
  if (closingFenceIndex === -1) {
    return { title: null, body: content };
  }

  const closingFenceEnd = content.indexOf('\n', closingFenceIndex + 4);
  const bodyStart = closingFenceEnd === -1 ? content.length : closingFenceEnd + 1;
  const frontmatter = content.slice(newlineAfterFence + 1, closingFenceIndex);
  const body = content.slice(bodyStart);

  let title: string | null = null;
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^title\s*:\s*(.+)\s*$/i);
    if (!match) continue;

    title = stripYamlScalarQuotes(match[1].trim());
    break;
  }

  return { title, body };
}

export function splitByHeadings(body: string): HeadingSection[] {
  const normalized = body.replace(/\r\n/g, '\n');
  const matches = Array.from(normalized.matchAll(/^(#{1,6})\s+(.+)$/gm)).map((match) => ({
    index: match.index ?? 0,
    level: match[1].length,
    heading: match[2].trim(),
    marker: match[1],
  }));

  if (matches.length === 0) {
    const trimmed = normalized.trim();
    return trimmed
      ? [{ level: 0, heading: '', content: trimmed, headingPath: [] }]
      : [];
  }

  const sections: HeadingSection[] = [];
  const firstHeadingIndex = matches[0]?.index ?? 0;
  const preamble = normalized.slice(0, firstHeadingIndex).trim();
  if (preamble) {
    sections.push({ level: 0, heading: '', content: preamble, headingPath: [] });
  }

  const headingStack: Array<{ level: number; label: string }> = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const lineEnd = normalized.indexOf('\n', current.index);
    const contentStart = lineEnd === -1 ? normalized.length : lineEnd + 1;
    const contentEnd = next?.index ?? normalized.length;
    const sectionContent = normalized.slice(contentStart, contentEnd).trim();

    while (headingStack.length > 0 && headingStack[headingStack.length - 1]!.level >= current.level) {
      headingStack.pop();
    }

    const label = `${current.marker} ${current.heading}`;
    headingStack.push({ level: current.level, label });

    sections.push({
      level: current.level,
      heading: current.heading,
      content: sectionContent,
      headingPath: headingStack.map((entry) => entry.label),
    });
  }

  return sections;
}

export function chunkOversizedSections(
  sections: HeadingSection[],
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): TextChunk[] {
  const normalizedChunkSize = Math.max(1, chunkSize);
  const normalizedOverlap = Math.max(0, Math.min(overlap, normalizedChunkSize - 1));
  const chunks: TextChunk[] = [];

  for (const section of sections) {
    const sectionText = section.content.trim();
    if (!sectionText) {
      continue;
    }

    if (sectionText.length <= normalizedChunkSize) {
      chunks.push({ headingPath: [...section.headingPath], text: sectionText });
      continue;
    }

    const blocks = splitIntoBlocks(sectionText);
    if (blocks.some((block) => block.length > normalizedChunkSize)) {
      chunks.push(
        ...chunkTextWithOverlap(sectionText, section.headingPath, normalizedChunkSize, normalizedOverlap)
      );
      continue;
    }

    let current = '';
    for (const block of blocks) {
      const candidate = current ? `${current}\n\n${block}` : block;
      if (candidate.length <= normalizedChunkSize) {
        current = candidate;
        continue;
      }

      if (current) {
        chunks.push({ headingPath: [...section.headingPath], text: current });
      }

      current = block;
    }

    if (current) {
      chunks.push({ headingPath: [...section.headingPath], text: current });
    }
  }

  return chunks;
}

export function extractWikilinks(content: string): string[] {
  const matches = content.matchAll(WIKILINK_REGEX);
  const links = new Set<string>();

  for (const match of matches) {
    const target = (match[1] ?? '').split(/[|#]/)[0]?.trim();
    if (target) {
      links.add(target);
    }
  }

  return [...links];
}

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content.normalize('NFC')).digest('hex').slice(0, 16);
}

export function chunkFile(input: ChunkInput, options: Partial<ChunkOptions> = {}): ChunkMetadata[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const modelId = options.modelId ?? PLACEHOLDER_MODEL_ID;
  const { workspaceRelativePath, content, mtimeMs } = input;

  const extension = path.extname(workspaceRelativePath).toLowerCase();
  if (extension !== '.md' && extension !== '.markdown') {
    throw new UnsupportedFileError({
      message: `Unsupported file type for chunking: ${workspaceRelativePath}`,
      filePath: workspaceRelativePath,
      extension,
    });
  }

  if (!content.trim()) {
    return [];
  }

  const fileName = path.basename(workspaceRelativePath);
  const { title, body } = parseFrontmatter(content);
  const resolvedTitle = title ?? fileName.replace(/\.(md|markdown)$/i, '');
  const sections = splitByHeadings(body);
  const chunks = chunkOversizedSections(sections, chunkSize, overlap);

  return chunks.map((chunk, chunkIndex) => {
    const contentHash = computeContentHash(chunk.text);
    const id = createHash('sha256')
      .update(`${workspaceRelativePath}${contentHash}${chunkIndex}`)
      .digest('hex')
      .slice(0, 16);

    return {
      id,
      workspaceRelativePath,
      fileName,
      title: resolvedTitle,
      headingPath: chunk.headingPath,
      chunkIndex,
      chunkText: chunk.text,
      wikilinks: extractWikilinks(chunk.text),
      mtimeMs,
      contentHash,
      modelId,
    };
  });
}

export function stripYamlScalarQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

export function splitIntoBlocks(content: string): string[] {
  return content
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function takeBlockOverlap(content: string, overlap: number): string {
  if (overlap <= 0 || content.length <= overlap) {
    return content;
  }

  const blocks = splitIntoBlocks(content);
  const selected: string[] = [];
  let total = 0;

  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]!;
    selected.unshift(block);
    total += block.length;
    if (total >= overlap) {
      break;
    }
  }

  return selected.join('\n\n');
}

function chunkTextWithOverlap(
  content: string,
  headingPath: string[],
  chunkSize: number,
  overlap: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    const text = content.slice(start, end).trim();
    if (text) {
      chunks.push({ headingPath: [...headingPath], text });
    }

    if (end >= content.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
