import { describe, it, expect } from 'vitest';
import { executorVersion } from './index.js';

describe('executors', () => {
  it('exports executorVersion', () => {
    expect(executorVersion).toBe('0.0.0');
  });
});
