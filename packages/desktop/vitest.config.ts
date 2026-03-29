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
  },
});
