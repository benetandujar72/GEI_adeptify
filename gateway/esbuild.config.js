import { build } from 'esbuild';

build({
    entryPoints: ['index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/index.js',
    sourcemap: true,
    external: Object.keys(require('./package.json').dependencies),
}).catch(() => process.exit(1));
