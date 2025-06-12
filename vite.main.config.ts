import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '.vite/main',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/index.ts'),
      },
      output: {
        entryFileNames: 'main.js',
      },
      external: [
        'sqlite3',
        'fluent-ffmpeg',
        'node-record-lpcm16',
        'node-global-key-listener',
        'electron',
        /^node:/
      ]
    },
  },
  optimizeDeps: {
    exclude: ['sqlite3', 'fluent-ffmpeg', 'node-record-lpcm16', 'node-global-key-listener']
  },
  base: './',
}); 