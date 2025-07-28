const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  external: ['pg-native'],
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': ""
  }
}).catch(() => process.exit(1));
