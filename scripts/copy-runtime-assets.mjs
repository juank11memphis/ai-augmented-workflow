#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

copyRuntimeAssets(path.resolve('src'), path.resolve('bin'));

function copyRuntimeAssets(sourceRoot, targetRoot) {
  if (!existsSync(sourceRoot)) return;
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const targetPath = path.join(targetRoot, entry.name);
    if (entry.isDirectory()) {
      copyRuntimeAssets(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith('.md') || entry.name === 'model-recommendations.json')) {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      cpSync(sourcePath, targetPath);
    }
  }
}
