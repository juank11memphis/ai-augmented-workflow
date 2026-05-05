import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SIBU_VERSION } from './catalog.js';

describe('SIBU_VERSION', () => {
  it('reports the package.json version as the Sibu version', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as { version: string };

    assert.equal(SIBU_VERSION, packageJson.version);
  });
});
