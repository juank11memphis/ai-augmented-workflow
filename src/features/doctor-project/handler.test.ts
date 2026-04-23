import assert from 'node:assert/strict';
import test from 'node:test';

import { getDoctorSyncNextStepLines, getNpmVersionAdvisoryLines } from './handler.js';

test('returns advisory lines when a newer version is available', () => {
  const lines = getNpmVersionAdvisoryLines({
    checkedAt: '2026-01-01T00:00:00Z',
    currentVersion: '0.1.0',
    latestVersion: '0.2.0',
    packageName: 'sibu',
    source: 'live',
    status: 'update-available',
  });

  assert.deepEqual(lines, [
    'A newer Sibu version is available: 0.2.0 (0.1.0 installed).',
    'Update with `npm install -g sibu`.',
  ]);
});

test('returns no advisory lines when npm lookup is unavailable', () => {
  const lines = getNpmVersionAdvisoryLines({
    checkedAt: '2026-01-01T00:00:00Z',
    packageName: 'sibu',
    reason: 'network-error',
    source: 'live',
    status: 'unavailable',
  });

  assert.deepEqual(lines, []);
});

test('returns no advisory lines when current version is already up to date', () => {
  const lines = getNpmVersionAdvisoryLines({
    checkedAt: '2026-01-01T00:00:00Z',
    currentVersion: '0.1.0',
    latestVersion: '0.1.0',
    packageName: 'sibu',
    source: 'cache',
    status: 'up-to-date',
  });

  assert.deepEqual(lines, []);
});

test('returns explicit sync next-step lines for review-needed doctor output', () => {
  const lines = getDoctorSyncNextStepLines();

  assert.deepEqual(lines, [
    'Run `sibu sync` to review these workflow changes and choose whether to apply them.',
    'Sibu will not change project files until you explicitly run `sibu sync`.',
  ]);
});
