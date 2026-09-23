import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

interface RootPackageJson {
  scripts: {
    build: string;
    check: string;
    test: string;
    'test:compiled': string;
    verify: string;
  };
}

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as RootPackageJson;

describe('package script composition', () => {
  it('keeps build and standalone check responsibilities explicit', () => {
    assert.equal(packageJson.scripts.build, 'tsc && node ./scripts/copy-runtime-assets.mjs && chmod +x bin/sibu.js');
    assert.equal(packageJson.scripts.check, 'tsc --noEmit');
  });

  it('keeps the internal compiled-test runner build-free', () => {
    assert.equal(packageJson.scripts['test:compiled'], 'node ./scripts/run-tests.mjs');
  });

  it('builds once before compiled tests in each public validation workflow', () => {
    assert.equal(packageJson.scripts.test, 'pnpm build && pnpm test:compiled');
    assert.equal(packageJson.scripts.verify, 'pnpm build && pnpm test:compiled');
    assert.equal(countDirectScriptCalls(packageJson.scripts.test, 'build'), 1);
    assert.equal(countDirectScriptCalls(packageJson.scripts.verify, 'build'), 1);
    assert.equal(countDirectScriptCalls(packageJson.scripts.verify, 'test'), 0);
    assert.equal(countDirectScriptCalls(packageJson.scripts.verify, 'check'), 0);
  });
});

function countDirectScriptCalls(script: string, dependency: string): number {
  const directCall = `pnpm ${dependency}`;

  return script.split(' && ').filter((step) => step === directCall).length;
}
