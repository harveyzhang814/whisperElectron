import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  root: path.resolve(__dirname, 'src/renderer'),
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
}) 