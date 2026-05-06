import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planPackageJsonVersionUpdate } from './package-json.js';

describe('planPackageJsonVersionUpdate', () => {
  it('plans a root package version update', () => {
    const packageJson = `{
  "name": "sibu",
  "version": "1.2.3"
}
`;

    const result = planPackageJsonVersionUpdate(packageJson, '1.2.4');

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.deepEqual(result.plan, {
      path: 'package.json',
      currentVersion: '1.2.3',
      targetVersion: '1.2.4',
      nextContent: `{
  "name": "sibu",
  "version": "1.2.4"
}
`,
    });
  });

  it('changes only the root version value when nested version fields exist', () => {
    const packageJson = `{
  "name": "sibu",
  "metadata": {
    "version": "keep-me"
  },
  "version": "1.2.3",
  "bin": {
    "sibu": "./bin/sibu.js"
  }
}
`;

    const result = planPackageJsonVersionUpdate(packageJson, '1.2.4');

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(
      result.plan.nextContent,
      `{
  "name": "sibu",
  "metadata": {
    "version": "keep-me"
  },
  "version": "1.2.4",
  "bin": {
    "sibu": "./bin/sibu.js"
  }
}
`
    );
  });

  it('preserves unrelated package metadata', () => {
    const packageJson = `{
  "name": "sibu",
  "version": "1.2.3",
  "scripts": {
    "build": "tsc"
  },
  "bin": {
    "sibu": "./bin/sibu.js"
  }
}
`;

    const result = planPackageJsonVersionUpdate(packageJson, '1.2.4');

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.deepEqual(JSON.parse(result.plan.nextContent), {
      name: 'sibu',
      version: '1.2.4',
      scripts: {
        build: 'tsc',
      },
      bin: {
        sibu: './bin/sibu.js',
      },
    });
  });

  it('blocks unreadable package JSON content', () => {
    const result = planPackageJsonVersionUpdate(undefined, '1.2.4');

    assertBlockedPackageJson(result, /could not be read/);
  });

  it('blocks malformed package JSON', () => {
    const result = planPackageJsonVersionUpdate('{ "version": ', '1.2.4');

    assertBlockedPackageJson(result, /could not be parsed as JSON/);
  });

  it('blocks package JSON without a version field', () => {
    const result = planPackageJsonVersionUpdate('{\n  "name": "sibu"\n}\n', '1.2.4');

    assertBlockedPackageJson(result, /string version field/);
  });

  it('blocks package JSON with a non-string version field', () => {
    const result = planPackageJsonVersionUpdate('{\n  "version": 123\n}\n', '1.2.4');

    assertBlockedPackageJson(result, /string version field/);
  });
});

type PackageJsonResult = ReturnType<typeof planPackageJsonVersionUpdate>;

function assertBlockedPackageJson(result: PackageJsonResult, messagePattern: RegExp): void {
  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') {
    return;
  }

  assert.match(result.message, messagePattern);
  assert.equal(result.warnings.some((warning) => warning.code === 'malformed-package-json'), true);
}
