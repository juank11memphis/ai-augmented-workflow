import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STATE_RELATIVE_PATH } from './catalog.js';
import type { ManagedFilePath } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ProjectContext = {
  rootPath: string;
  statePath: string;
};

export function getProjectContext(): ProjectContext {
  const rootPath = process.cwd();

  return {
    rootPath,
    statePath: path.join(rootPath, STATE_RELATIVE_PATH),
  };
}

export function getTemplatesPath(): string {
  return path.join(__dirname, '..', '..', 'templates');
}

export function resolveManagedFilePath(rootPath: string, file: string): ManagedFilePath {
  const absolutePath = path.isAbsolute(file) ? path.resolve(file) : path.resolve(rootPath, file);
  const relativePath = path.relative(rootPath, absolutePath);

  if (relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Managed file path must be inside this project: ${file}`);
  }

  return {
    absolutePath,
    relativePath: relativePath.split(path.sep).join('/'),
  };
}

export function getSideTemplatePath(rootPath: string, relativePath: string, templateVersion: string): string {
  const safeName = relativePath.replace(/[\\/]/g, '__');
  return path.join(rootPath, '.echo', 'sync', `${safeName}.template-v${templateVersion}`);
}
