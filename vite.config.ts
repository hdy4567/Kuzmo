import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 9005,
    strictPort: true,
    host: '0.0.0.0',
    // 🛡️ [SECURE-CONTEXT] Required for some browser AI/Media APIs
    https: false, 
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
