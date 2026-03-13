import fs from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'tsup';

/** Recursively copy src → dest, mirroring directory structure. */
function copyDir(src: string, dest: string, skip?: Set<string>): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip?.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, skip);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node24',
    clean: true,
    minify: false,
    splitting: false,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    onSuccess() {
      copyDir('src/skills', 'dist/skills');
      copyDir('src/boilerplate', 'dist/boilerplate', new Set(['node_modules', '.next']));
    },
  },
]);
