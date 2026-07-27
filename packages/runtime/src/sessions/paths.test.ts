import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  SessionPathError,
  assertSafeId,
  isSafeId,
  projectSessionsDirectory,
  sessionPaths,
} from './paths.js';

const root = path.join('/tmp', 'srgnt-workspace');

describe('session paths', () => {
  it('derives the documented layout', () => {
    const paths = sessionPaths(root, 'proj-1', 'sess-1');
    expect(paths.directory).toBe(path.join(root, 'projects', 'proj-1', 'sessions', 'sess-1'));
    expect(paths.events).toBe(path.join(paths.directory, 'events.jsonl'));
    expect(paths.meta).toBe(path.join(paths.directory, 'meta.json'));
  });

  it('derives the project sessions directory', () => {
    expect(projectSessionsDirectory(root, 'proj-1')).toBe(
      path.join(root, 'projects', 'proj-1', 'sessions')
    );
  });

  it.each([
    ['empty', ''],
    ['dot', '.'],
    ['parent traversal', '..'],
    ['nested traversal', '../../etc'],
    ['absolute', '/etc/passwd'],
    ['forward slash', 'a/b'],
    ['backslash', 'a\\b'],
    ['leading dot', '.hidden'],
    ['leading dash', '-flag'],
    ['space', 'has space'],
    ['nul byte', `a${String.fromCharCode(0)}b`],
    ['newline', 'a\nb'],
    ['colon', 'a:b'],
    ['too long', 'a'.repeat(129)],
  ])('rejects a path-unsafe id (%s)', (_label, id) => {
    expect(isSafeId(id)).toBe(false);
    expect(() => assertSafeId('sessionId', id)).toThrow(SessionPathError);
    expect(() => sessionPaths(root, 'proj-1', id)).toThrow(SessionPathError);
    expect(() => sessionPaths(root, id, 'sess-1')).toThrow(SessionPathError);
  });

  it.each(['a', 'proj-1', 'sess_2026.07.27', 'A1', 'a'.repeat(128)])(
    'accepts a safe id (%s)',
    (id) => {
      expect(isSafeId(id)).toBe(true);
      expect(assertSafeId('projectId', id)).toBe(id);
    }
  );

  it('names the offending field on rejection', () => {
    const error = (() => {
      try {
        sessionPaths(root, '..', 'sess-1');
        return undefined;
      } catch (caught) {
        return caught;
      }
    })();
    expect(error).toBeInstanceOf(SessionPathError);
    expect((error as SessionPathError).field).toBe('projectId');
  });
});
