import { describe, it, expect } from 'vitest';
import { fredVersion } from './index.js';

describe('fred', () => {
  it('exports fredVersion', () => {
    expect(fredVersion).toBe('0.0.0');
  });
});
