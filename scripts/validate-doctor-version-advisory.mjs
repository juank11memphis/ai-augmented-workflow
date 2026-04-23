#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

const cacheRoot = mkdtempSync(path.join(os.tmpdir(), 'sibu-doctor-version-advisory-'));

try {
  const newerVersionOutput = runDoctorWithTty({
    SIBU_CACHE_HOME: path.join(cacheRoot, 'newer-version-cache'),
    SIBU_NPM_LATEST_VERSION: '9.9.9',
  });

  assertIncludes(newerVersionOutput, 'A newer Sibu version is available: 9.9.9 (0.1.0 installed).');
  assertIncludes(newerVersionOutput, 'Update with `npm install -g sibu`.');
  assertIncludes(newerVersionOutput, 'Workflow is healthy. No drift detected.');

  const offlineOutput = runDoctorWithTty({
    SIBU_CACHE_HOME: path.join(cacheRoot, 'offline-cache'),
    SIBU_NPM_LOOKUP_MODE: 'offline',
  });

  assertIncludes(offlineOutput, 'Workflow is healthy. No drift detected.');
  assertExcludes(offlineOutput, 'A newer Sibu version is available:');
  assertExcludes(offlineOutput, 'Update with `npm install -g sibu`.');

  console.log('Doctor version advisory validation passed.');
} finally {
  rmSync(cacheRoot, { recursive: true, force: true });
}

function runDoctorWithTty(extraEnv) {
  const envAssignments = Object.entries(extraEnv)
    .map(([key, value]) => `${key}=${shellEscape(value)}`)
    .join(' ');
  const command = `cd ${shellEscape(repoRoot())} && ${envAssignments} node ./bin/sibu.js doctor`;

  return execFileSync('script', ['-q', '-c', command, '/dev/null'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      TERM: process.env.TERM || 'xterm-256color',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function assertIncludes(output, expected) {
  if (!output.includes(expected)) {
    throw new Error(`Expected output to include: ${expected}\n\nActual output:\n${output}`);
  }
}

function assertExcludes(output, unexpected) {
  if (output.includes(unexpected)) {
    throw new Error(`Did not expect output to include: ${unexpected}\n\nActual output:\n${output}`);
  }
}

function repoRoot() {
  return path.resolve(new URL('..', import.meta.url).pathname);
}
