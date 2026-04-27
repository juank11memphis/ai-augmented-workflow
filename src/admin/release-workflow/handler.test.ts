import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSemverVersion } from '../generate-changelog/semver.js';
import { formatReleaseTagName, incrementSemverVersion } from './release-plan.js';

describe('incrementSemverVersion', () => {
  it('increments patch versions', () => {
    const version = parseVersion('1.2.3');

    assert.equal(incrementSemverVersion(version, 'patch').version, '1.2.4');
  });

  it('increments minor versions and resets patch', () => {
    const version = parseVersion('1.2.3');

    assert.equal(incrementSemverVersion(version, 'minor').version, '1.3.0');
  });

  it('increments major versions and resets minor and patch', () => {
    const version = parseVersion('1.2.3');

    assert.equal(incrementSemverVersion(version, 'major').version, '2.0.0');
  });
});

describe('formatReleaseTagName', () => {
  it('formats release tags with a leading v', () => {
    assert.equal(formatReleaseTagName('0.2.0'), 'v0.2.0');
  });
});

function parseVersion(value: string) {
  const result = parseSemverVersion(value);

  if (result.status !== 'ok') {
    throw new Error(result.message);
  }

  return result.version;
}
