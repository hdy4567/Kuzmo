import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 🚀 Relative path for GitHub Pages and Capacitor Compatibility
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 9005,
    strictPort: true,
    host: '0.0.0.0',
  }
});
