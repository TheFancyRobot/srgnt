import { describe, expect, it } from 'vitest';
import { stripAnsi } from './ghostty.js';

/**
 * `stripAnsi` only runs on the fallback path (no ghostty WASM), but that is
 * precisely when readable output matters most — so the escape handling is worth
 * pinning down directly rather than only through a component test.
 */

describe('stripAnsi', () => {
  it('removes SGR colour sequences and keeps the text', () => {
    expect(stripAnsi('\u001B[32mgreen\u001B[0m')).toBe('green');
    expect(stripAnsi('\u001B[1;31;40mbold red\u001B[0m')).toBe('bold red');
  });

  it('removes cursor and screen-control sequences', () => {
    expect(stripAnsi('\u001B[2J\u001B[Hcleared')).toBe('cleared');
    expect(stripAnsi('\u001B[?25lhidden cursor\u001B[?25h')).toBe('hidden cursor');
  });

  it('removes OSC sequences terminated by BEL or ST', () => {
    expect(stripAnsi('\u001B]0;window title\u0007done')).toBe('done');
    expect(stripAnsi('\u001B]0;window title\u001B\\done')).toBe('done');
  });

  it('normalizes CRLF and bare CR so overwritten lines do not collapse', () => {
    expect(stripAnsi('one\r\ntwo')).toBe('one\ntwo');
    expect(stripAnsi('progress 10%\rprogress 20%')).toBe('progress 10%\nprogress 20%');
  });

  it('leaves ordinary text, tabs and unicode untouched', () => {
    expect(stripAnsi('plain\ttext — ✓')).toBe('plain\ttext — ✓');
    expect(stripAnsi('')).toBe('');
  });
});
