import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/main',
    emptyOutDir: false,
    lib: {
      entry: 'src/preload.ts',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'preload.js',
      },
      external: [
        'electron',
        /^node:/
      ]
    },
  },
}); 