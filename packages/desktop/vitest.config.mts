import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    root: __dirname,
    setupFiles: ['src/test-setup.ts'],
    environmentMatchGlobs: [
      ['src/main/**/*.test.ts', 'node'],
      ['src/renderer/**/*.test.tsx', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'src/renderer/**/*.{ts,tsx}'],
      exclude: [
        'src/main/index.ts',
        'src/preload/index.ts',
        'src/renderer/main.tsx',
        'src/renderer/index.ts',
        'src/renderer/test-utils.tsx',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/e2e/**',
        'src/**/*.d.ts',
        'src/**/*.config.ts',
        'src/**/*.config.js',
      ],
    },
  },
});
