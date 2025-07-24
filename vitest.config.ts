import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        'client/src/tests/**',
        'scripts/**'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    include: [
      'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'client/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/',
      'client/dist/'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@server': path.resolve(__dirname, './server'),
      '@client': path.resolve(__dirname, './client/src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@shared': path.resolve(__dirname, './shared')
    }
  }
}); 