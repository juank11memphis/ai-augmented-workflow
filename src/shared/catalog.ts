import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NpmVersionLookupMode } from './types.js';

export const SIBU_PACKAGE_NAME = '@juancr11/sibu';
export const SIBU_VERSION = readPackageVersion();
export const STATE_RELATIVE_PATH = '.sibu/state.json';
export const NPM_VERSION_LOOKUP_MODE_ENV = 'SIBU_NPM_LOOKUP_MODE';
export const NPM_VERSION_OVERRIDE_ENV = 'SIBU_NPM_LATEST_VERSION';
export const SIBU_CACHE_HOME_ENV = 'SIBU_CACHE_HOME';
export const SUPPORTED_NPM_LOOKUP_MODES: NpmVersionLookupMode[] = ['live', 'offline'];
function readPackageVersion(): string {
  const packageJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as unknown;

  if (!isPackageJsonWithVersion(packageJson)) {
    throw new Error(`Could not read Sibu version from ${packageJsonPath}.`);
  }

  return packageJson.version;
}

function isPackageJsonWithVersion(value: unknown): value is { version: string } {
  return Boolean(value && typeof value === 'object' && typeof (value as { version?: unknown }).version === 'string');
}
