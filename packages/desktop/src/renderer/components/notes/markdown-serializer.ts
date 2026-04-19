export interface ParsedNote {
  frontmatter: string | null;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(raw: string): ParsedNote {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return { frontmatter: null, body: raw };
  }
  const frontmatter = match[1]!.trim();
  const body = raw.slice(match[0].length);
  return { frontmatter, body };
}

export function serializeWithFrontmatter(frontmatter: string | null, body: string): string {
  if (!frontmatter) {
    return body;
  }
  return `---\n${frontmatter}\n---\n${body}`;
}

export function extractFrontmatterTitle(frontmatter: string | null): string | null {
  if (!frontmatter) return null;
  const match = /^title:\s*["']?(.+?)["']?\s*$/m.exec(frontmatter);
  return match ? match[1]! : null;
}

export function buildDefaultFrontmatter(title: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `title: "${title}"\ncreated: "${date}"`;
}
