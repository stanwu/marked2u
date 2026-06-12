import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: ['es2021', 'chrome97'],
    outDir: '../dist',
    emptyOutDir: true,
    minify: true,
    sourcemap: false,
  },
})
