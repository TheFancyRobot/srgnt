/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import * as semanticSearch from './index.js';

describe('semantic-search index exports', () => {
  it('re-exports the host factory', () => {
    expect(typeof semanticSearch.createSemanticSearchHost).toBe('function');
  });
});
