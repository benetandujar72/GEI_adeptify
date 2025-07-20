import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: './client',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./client/src', import.meta.url)),
      '@/components': fileURLToPath(new URL('./client/src/components', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./client/src/lib', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./client/src/hooks', import.meta.url)),
      '@/context': fileURLToPath(new URL('./client/src/context', import.meta.url)),
      '@/pages': fileURLToPath(new URL('./client/src/pages', import.meta.url)),
      '@/shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
}); 