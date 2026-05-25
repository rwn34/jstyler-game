import { build } from 'esbuild';

await build({
  entryPoints: ['src/dashboard/main.jsx'],
  outfile: 'src/dashboard.bundle.js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  sourcemap: 'inline',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'text' },
});

console.log('✓ dashboard.bundle.js built');
