/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Markdown } from './Markdown.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderMd(source: string): HTMLElement {
  const { container } = render(<Markdown source={source} />);
  return container;
}

describe('Markdown — GFM block coverage', () => {
  it('renders headings at the right level', () => {
    renderMd('# One\n\n## Two\n\n### Three\n');
    expect(screen.getByRole('heading', { level: 1, name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Two' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Three' })).toBeInTheDocument();
  });

  it('renders bullet and ordered lists', () => {
    const container = renderMd('- alpha\n- beta\n\n1. first\n2. second\n');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('renders GFM task list items as checkboxes reflecting their state', () => {
    const container = renderMd('- [x] done\n- [ ] todo\n');
    const boxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.checked).toBe(true);
    expect(boxes[1]!.checked).toBe(false);
    // Read-only: the transcript is a record, not an editor.
    expect(boxes[0]!.readOnly).toBe(true);
  });

  it('renders fenced code with its language and preserves the body verbatim', () => {
    const container = renderMd('```ts\nconst x = 1;\nif (x < 2) { }\n```\n');
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.getAttribute('data-language')).toBe('ts');
    expect(pre!.textContent).toContain('const x = 1;');
    expect(pre!.textContent).toContain('if (x < 2) { }');
    // Markdown inside a fence must stay literal.
    expect(container.querySelector('pre em')).toBeNull();
  });

  it('renders a GFM table with header and body cells', () => {
    const container = renderMd('| File | Lines |\n| --- | --- |\n| index.ts | 42 |\n');
    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(container.querySelectorAll('thead th')).toHaveLength(2);
    expect(container.querySelectorAll('tbody td')).toHaveLength(2);
    expect(screen.getByText('index.ts')).toBeInTheDocument();
  });

  it('wraps tables in a horizontally scrollable container so the panel never scrolls', () => {
    const container = renderMd('| a | b |\n| --- | --- |\n| 1 | 2 |\n');
    expect(container.querySelector('.chat-md-table-scroll')).not.toBeNull();
  });

  it('renders blockquotes and horizontal rules', () => {
    const container = renderMd('> quoted line\n\n---\n');
    expect(container.querySelector('blockquote')?.textContent).toContain('quoted line');
    expect(container.querySelectorAll('hr')).toHaveLength(1);
  });
});

describe('Markdown — GFM inline coverage', () => {
  it('renders emphasis, strong, strikethrough, and inline code', () => {
    const container = renderMd('*em* **strong** ~~gone~~ `code`\n');
    expect(container.querySelector('em')?.textContent).toBe('em');
    expect(container.querySelector('strong')?.textContent).toBe('strong');
    expect(container.querySelector('del')?.textContent).toBe('gone');
    expect(container.querySelector('code')?.textContent).toBe('code');
  });

  it('keeps plain text between inline nodes', () => {
    const container = renderMd('before **bold** after\n');
    expect(container.textContent).toBe('before bold after');
  });

  it('renders a link and opens it externally instead of navigating', () => {
    const openExternal = vi.fn(async () => {});
    (window as unknown as { srgnt: unknown }).srgnt = { openExternal };
    renderMd('[docs](https://example.com/page)\n');
    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    fireEvent.click(link);
    expect(openExternal).toHaveBeenCalledWith('https://example.com/page');
  });

  it('renders a bare GFM autolink without losing its text', () => {
    // The autolink extension emits a bare `URL` node straight under the
    // paragraph — no `Autolink` wrapper. Treating `URL` as a syntax mark
    // everywhere deleted the address from the message body entirely.
    const container = renderMd('visit https://example.com/docs now\n');
    const link = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(container.textContent).toBe('visit https://example.com/docs now');
  });

  it('renders an angle-bracket autolink as a link', () => {
    renderMd('<https://example.com/x>\n');
    expect(screen.getByRole('link', { name: 'https://example.com/x' })).toHaveAttribute(
      'href',
      'https://example.com/x',
    );
  });

  it('keeps a link target out of its own label', () => {
    const container = renderMd('[docs](https://example.com/page)\n');
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.textContent).toBe('docs');
  });

  it('does not throw when the renderer has no openExternal bridge', () => {
    (window as unknown as { srgnt: unknown }).srgnt = {};
    renderMd('[docs](https://example.com/page)\n');
    expect(() => fireEvent.click(screen.getByRole('link', { name: 'docs' }))).not.toThrow();
  });

  it('renders an unsafe link scheme as inert text, not an anchor', () => {
    const container = renderMd('[click](javascript:alert(1))\n');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('click');
  });
});

describe('Markdown — untrusted agent output', () => {
  it('renders raw HTML as literal text, never as markup', () => {
    const container = renderMd('<script>window.pwned = 1</script>\n');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>');
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
  });

  it('renders an inline HTML tag as text', () => {
    const container = renderMd('hello <b>not bold</b> world\n');
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>');
  });

  it('renders images as alt text rather than fetching a remote URL', () => {
    const container = renderMd('![a diagram](https://example.com/x.png)\n');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('a diagram');
  });
});

describe('Markdown — streaming edge cases', () => {
  it('renders empty and whitespace-only sources without crashing or emitting content', () => {
    expect(renderMd('').textContent).toBe('');
    expect(renderMd('   \n\n  ').textContent?.trim()).toBe('');
  });

  it('renders a partially streamed document (unterminated fence) without throwing', () => {
    const container = renderMd('Here is code:\n\n```ts\nconst partial = ');
    expect(container.textContent).toContain('Here is code:');
    expect(container.textContent).toContain('const partial =');
  });

  it('renders a partially streamed table row without throwing', () => {
    const container = renderMd('| a | b |\n| --- |');
    expect(container.textContent).toContain('a');
  });

  it('handles a very long message without dropping the tail', () => {
    const source = Array.from({ length: 2000 }, (_, index) => `line ${index}`).join('\n\n');
    const container = renderMd(source);
    expect(container.textContent).toContain('line 1999');
  });

  it('uses no hardcoded colors (semantic tokens only, so both themes work)', () => {
    const container = renderMd('# Title\n\n`code` and [a link](https://example.com)\n');
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(container.innerHTML).not.toMatch(/rgba?\(/i);
  });
});
