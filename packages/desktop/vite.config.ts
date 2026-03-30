import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    // The Ghostty terminal runtime is intentionally isolated behind a lazy route.
    // Keep the warning threshold close to that chunk so startup bundle regressions still surface.
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/node_modules/ghostty-web/')) {
            return 'terminal-runtime';
          }
        },
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
