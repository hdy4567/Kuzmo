import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@kzm': path.resolve(__dirname, './frontend-modules'),
      '@modules': path.resolve(__dirname, './frontend-modules/modules'),
    },
  },
  server: {
    port: 9005,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
