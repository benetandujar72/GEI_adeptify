import * as esbuild from 'esbuild';
import path from 'path';

const externalDependencies = [
  // Dependencias de Node.js
  'path', 'fs', 'http', 'https', 'url', 'querystring', 'stream', 'util', 'events', 
  'buffer', 'process', 'os', 'child_process', 'cluster', 'worker_threads', 
  'perf_hooks', 'async_hooks', 'timers', 'punycode', 'domain', 'dns', 'dgram', 
  'tls', 'net', 'tty', 'readline', 'repl', 'vm', 'inspector', 'assert', 
  'constants', 'crypto', 'zlib', 'http2',
  
  // Dependencias de npm que deben ser externas
  'postgres', 'cors', 'helmet', 'compression', 'winston', 'express', 
  'express-session', 'passport', 'passport-google-oauth20', 'passport-local', 
  'bcryptjs', 'jsonwebtoken', 'express-fileupload', 'connect-pg-simple', 
  'memorystore', 'dotenv', 'ws', 'redis', 'socket.io', 'ioredis',
  
  // Dependencias de Drizzle
  'drizzle-orm', 'drizzle-orm/postgres-js', 'drizzle-orm/neon-serverless',
  
  // Dependencias de Google APIs - DESHABILITADO
  // 'googleapis',
  
  // Dependencias de AI
  '@anthropic-ai/sdk', '@google/generative-ai', 'openai',
  
  // Dependencias de WebSocket
  'ws',
  
  // Dependencias de CSV
  'csv-parse', 'csv-stringify'
];

esbuild.build({
  entryPoints: ['server/src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  external: externalDependencies,
  minify: false,
  sourcemap: false,
  target: 'node18',
  logLevel: 'info',
  alias: {
    '@': path.resolve(process.cwd()),
    '@/shared': path.resolve(process.cwd(), 'shared'),
    '@/server': path.resolve(process.cwd(), 'server'),
    '@/components': path.resolve(process.cwd(), 'client/src/components'),
    '@/lib': path.resolve(process.cwd(), 'client/src/lib'),
    '@/hooks': path.resolve(process.cwd(), 'client/src/hooks'),
    '@/context': path.resolve(process.cwd(), 'client/src/context'),
    '@/pages': path.resolve(process.cwd(), 'client/src/pages')
  }
}).catch(() => process.exit(1)); 