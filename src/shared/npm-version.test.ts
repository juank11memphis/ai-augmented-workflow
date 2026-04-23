import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { checkForLatestSibuVersion } from './npm-version.js';

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test('returns update-available when override version is newer', async () => {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-npm-version-test-'));
  process.env.SIBU_NPM_LATEST_VERSION = '9.9.9';
  process.env.SIBU_CACHE_HOME = cacheRoot;

  const result = await checkForLatestSibuVersion({ now: new Date('2026-01-01T00:00:00Z') });

  assert.equal(result.status, 'update-available');
  assert.equal(result.source, 'override');
  assert.equal(result.latestVersion, '9.9.9');
});

test('returns unavailable when override mode is offline', async () => {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-npm-version-test-'));
  process.env.SIBU_NPM_LOOKUP_MODE = 'offline';
  process.env.SIBU_CACHE_HOME = cacheRoot;

  const result = await checkForLatestSibuVersion({ now: new Date('2026-01-01T00:00:00Z') });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.source, 'override');
  assert.equal(result.reason, 'override');
});

test('reuses a fresh cached result without calling fetch', async () => {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-npm-version-test-'));
  process.env.SIBU_CACHE_HOME = cacheRoot;

  const firstResult = await checkForLatestSibuVersion({
    now: new Date('2026-01-01T00:00:00Z'),
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ version: '9.9.9' }),
    } as Response),
  });

  assert.equal(firstResult.status, 'update-available');

  let fetchWasCalled = false;
  const secondResult = await checkForLatestSibuVersion({
    now: new Date('2026-01-01T01:00:00Z'),
    fetchImpl: async () => {
      fetchWasCalled = true;
      throw new Error('fetch should not be called when cache is fresh');
    },
  });

  assert.equal(secondResult.status, 'update-available');
  assert.equal(secondResult.source, 'cache');
  assert.equal(fetchWasCalled, false);
});
