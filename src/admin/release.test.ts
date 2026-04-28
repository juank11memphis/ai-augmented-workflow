import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReleaseArgs } from './release.js';

describe('parseReleaseArgs', () => {
  it('parses release planning flags', () => {
    const result = parseReleaseArgs(['--from', 'v1.2.3', '--to', 'HEAD', '--version', 'v1.3.0', '--date', '2026-04-27', '--dry-run', '--yes']);

    assert.deepEqual(result, {
      status: 'ok',
      command: {
        fromRef: 'v1.2.3',
        toRef: 'HEAD',
        version: 'v1.3.0',
        date: '2026-04-27',
        dryRun: true,
        assumeYes: true,
      },
    });
  });

  it('returns help output', () => {
    const result = parseReleaseArgs(['--help']);

    assert.equal(result.status, 'help');
    if (result.status !== 'help') {
      return;
    }

    assert.match(result.usage, /Usage: pnpm admin:release/);
  });

  it('blocks unknown flags with usage', () => {
    const result = parseReleaseArgs(['--wat']);

    assert.equal(result.status, 'error');
    if (result.status !== 'error') {
      return;
    }

    assert.match(result.message, /Unknown option `--wat`/);
    assert.match(result.usage, /Usage: pnpm admin:release/);
  });

  it('blocks missing flag values with usage', () => {
    const result = parseReleaseArgs(['--version']);

    assert.equal(result.status, 'error');
    if (result.status !== 'error') {
      return;
    }

    assert.match(result.message, /requires a value/);
    assert.match(result.usage, /Usage: pnpm admin:release/);
  });
});
