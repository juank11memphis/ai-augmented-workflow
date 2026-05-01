#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const testRoot = path.resolve('bin');
const testFiles = findTestFiles(testRoot);

if (testFiles.length === 0) {
  console.error('No compiled test files found under bin/**/*.test.js. Run `pnpm build` first.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function findTestFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findTestFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.test.js') ? [entryPath] : [];
    })
    .sort();
}
