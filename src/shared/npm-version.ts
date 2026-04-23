import fs from 'node:fs';
import path from 'node:path';

import { NPM_VERSION_LOOKUP_MODE_ENV, NPM_VERSION_OVERRIDE_ENV, SIBU_PACKAGE_NAME, SIBU_VERSION, SUPPORTED_NPM_LOOKUP_MODES } from './catalog.js';
import { getNpmVersionCachePath } from './paths.js';
import type { NpmVersionCacheRecord, NpmVersionCheckResult, NpmVersionLiveStatus, NpmVersionLookupMode, NpmVersionResultSource, NpmVersionUnavailableReason } from './types.js';

const NPM_VERSION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

type FetchLike = typeof fetch;

type CheckOptions = {
  now?: Date;
  fetchImpl?: FetchLike;
};

type CacheReadResult =
  | { ok: true; record: NpmVersionCacheRecord }
  | { ok: false; reason: 'missing' | 'invalid' };

export async function checkForLatestSibuVersion(options: CheckOptions = {}): Promise<NpmVersionCheckResult> {
  const now = options.now ?? new Date();
  const overrideResult = readOverrideResult(now);
  if (overrideResult) {
    return overrideResult;
  }

  const cachedRecord = readCachedNpmVersionResult();
  if (cachedRecord.ok && isFreshCacheRecord(cachedRecord.record, now)) {
    return {
      ...cachedRecord.record,
      source: 'cache',
    };
  }

  const liveOutcome = await fetchLatestVersionOutcome({
    fetchImpl: options.fetchImpl ?? fetch,
    now,
  });

  writeCachedNpmVersionResult(liveOutcome);
  return liveOutcome;
}

async function fetchLatestVersionOutcome({ fetchImpl, now }: { fetchImpl: FetchLike; now: Date }): Promise<NpmVersionCheckResult> {
  try {
    const response = await fetchImpl(`${NPM_REGISTRY_URL}/${encodeURIComponent(SIBU_PACKAGE_NAME)}/latest`, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      return buildUnavailableOutcome({ checkedAt: now.toISOString(), reason: 'network-error' });
    }

    const payload = (await response.json()) as unknown;
    const latestVersion = getLatestVersionFromPayload(payload);
    if (!latestVersion) {
      return buildUnavailableOutcome({ checkedAt: now.toISOString(), reason: 'invalid-response' });
    }

    return buildVersionedOutcome({
      checkedAt: now.toISOString(),
      latestVersion,
      source: 'live',
      status: compareVersions(latestVersion, SIBU_VERSION) > 0 ? 'update-available' : 'up-to-date',
    });
  } catch {
    return buildUnavailableOutcome({ checkedAt: now.toISOString(), reason: 'network-error' });
  }
}

function readOverrideResult(now: Date): NpmVersionCheckResult | undefined {
  const overrideMode = readLookupModeOverride();
  if (overrideMode === 'offline') {
    return buildUnavailableOutcome({
      checkedAt: now.toISOString(),
      reason: 'override',
      source: 'override',
    });
  }

  const overrideVersion = process.env[NPM_VERSION_OVERRIDE_ENV]?.trim();
  if (!overrideVersion) {
    return undefined;
  }

  return buildVersionedOutcome({
    checkedAt: now.toISOString(),
    latestVersion: overrideVersion,
    source: 'override',
    status: compareVersions(overrideVersion, SIBU_VERSION) > 0 ? 'update-available' : 'up-to-date',
  });
}

function readLookupModeOverride(): NpmVersionLookupMode | undefined {
  const value = process.env[NPM_VERSION_LOOKUP_MODE_ENV]?.trim().toLowerCase();
  if (!value) {
    return undefined;
  }

  return SUPPORTED_NPM_LOOKUP_MODES.find((mode) => mode === value as NpmVersionLookupMode);
}

function readCachedNpmVersionResult(): CacheReadResult {
  const cachePath = getNpmVersionCachePath();
  if (!fs.existsSync(cachePath)) {
    return { ok: false, reason: 'missing' };
  }

  try {
    const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as unknown;
    if (!isNpmVersionCacheRecord(payload)) {
      return { ok: false, reason: 'invalid' };
    }

    return { ok: true, record: payload };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

function writeCachedNpmVersionResult(result: NpmVersionCheckResult): void {
  const cachePath = getNpmVersionCachePath();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

function isFreshCacheRecord(record: NpmVersionCacheRecord, now: Date): boolean {
  const checkedAt = Date.parse(record.checkedAt);
  if (Number.isNaN(checkedAt)) {
    return false;
  }

  return now.getTime() - checkedAt < NPM_VERSION_CACHE_TTL_MS;
}

function getLatestVersionFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const version = (payload as { version?: unknown }).version;
  return typeof version === 'string' && version.trim() ? version.trim() : undefined;
}

function buildVersionedOutcome({
  checkedAt,
  latestVersion,
  source,
  status,
}: {
  checkedAt: string;
  latestVersion: string;
  source: NpmVersionResultSource;
  status: NpmVersionLiveStatus;
}): Extract<NpmVersionCheckResult, { status: 'up-to-date' | 'update-available' }> {
  return {
    checkedAt,
    currentVersion: SIBU_VERSION,
    latestVersion,
    packageName: SIBU_PACKAGE_NAME,
    source,
    status,
  };
}

function buildUnavailableOutcome({
  checkedAt,
  reason,
  source = 'live',
}: {
  checkedAt: string;
  reason: NpmVersionUnavailableReason;
  source?: NpmVersionResultSource;
}): Extract<NpmVersionCheckResult, { status: 'unavailable' }> {
  return {
    checkedAt,
    packageName: SIBU_PACKAGE_NAME,
    reason,
    source,
    status: 'unavailable',
  };
}

function compareVersions(left: string, right: string): number {
  const leftParts = splitVersion(left);
  const rightParts = splitVersion(right);
  const maxLength = Math.max(leftParts.core.length, rightParts.core.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts.core[index] ?? 0;
    const rightValue = rightParts.core[index] ?? 0;

    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1;
    }
  }

  if (leftParts.prerelease === rightParts.prerelease) {
    return 0;
  }

  if (!leftParts.prerelease) {
    return 1;
  }

  if (!rightParts.prerelease) {
    return -1;
  }

  return leftParts.prerelease.localeCompare(rightParts.prerelease);
}

function splitVersion(version: string): { core: number[]; prerelease?: string } {
  const [core, prerelease] = version.trim().split('-', 2);

  return {
    core: core.split('.').map((part) => Number.parseInt(part, 10) || 0),
    prerelease,
  };
}

function isNpmVersionCacheRecord(value: unknown): value is NpmVersionCacheRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<NpmVersionCacheRecord>;
  if (record.status === 'unavailable') {
    return (
      typeof record.checkedAt === 'string' &&
      typeof record.packageName === 'string' &&
      typeof record.reason === 'string' &&
      typeof record.source === 'string'
    );
  }

  return (
    (record.status === 'up-to-date' || record.status === 'update-available') &&
    typeof record.checkedAt === 'string' &&
    typeof record.currentVersion === 'string' &&
    typeof record.latestVersion === 'string' &&
    typeof record.packageName === 'string' &&
    typeof record.source === 'string'
  );
}
