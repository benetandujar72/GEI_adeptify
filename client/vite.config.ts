import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  build: {
    outDir: '../dist/client',
    sourcemap: false, // Deshabilitar sourcemaps en producción
    emptyOutDir: true, // Limpiar el directorio de salida
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Configuraciones adicionales para Docker
    target: 'es2015',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
  define: {
    'process.env': {},
  },
  // Configuración para evitar problemas en Docker
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter', '@tanstack/react-query', 'sonner']
  }
}); 