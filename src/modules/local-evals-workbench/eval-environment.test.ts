import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadEvalEnvironment } from './eval-environment.js';
import { createWorkbenchDependencies } from './workbench-composition.js';

function withProject(files: Record<string, string>, check: (projectRoot: string) => void): void {
  const projectRoot = mkdtempSync(join(tmpdir(), 'sibu-eval-env-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(projectRoot, name), content);
    }
    check(projectRoot);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

test('uses .env when it contains OPENAI_API_KEY', () => {
  withProject({ '.env': 'OPENAI_API_KEY="from env"\nSUITE_SETTING=env\n', '.env.local': 'OPENAI_API_KEY=from-local\nSUITE_SETTING=local\n' }, projectRoot => {
    const environment = loadEvalEnvironment(projectRoot, {});
    assert.equal(environment.OPENAI_API_KEY, 'from env');
    assert.equal(environment.SUITE_SETTING, 'env');
  });
});

test('uses .env.local when .env is missing, lacks the key, or has a blank key', () => {
  for (const envFile of [undefined, 'SUITE_SETTING=env\n', 'OPENAI_API_KEY="   "\nSUITE_SETTING=env\n']) {
    const files = { '.env.local': 'OPENAI_API_KEY=from-local\nSUITE_SETTING=local\n', ...(envFile === undefined ? {} : { '.env': envFile }) };
    withProject(files, projectRoot => {
      const environment = loadEvalEnvironment(projectRoot, {});
      assert.equal(environment.OPENAI_API_KEY, 'from-local');
      assert.equal(environment.SUITE_SETTING, 'local');
    });
  }
});

test('preserves non-empty exported values without mutating the inherited environment', () => {
  withProject({ '.env': 'OPENAI_API_KEY=file-key\nSUITE_SETTING=file\n' }, projectRoot => {
    const inheritedEnvironment = { OPENAI_API_KEY: 'exported-key', SUITE_SETTING: 'exported' };
    const environment = loadEvalEnvironment(projectRoot, inheritedEnvironment);
    assert.equal(environment.OPENAI_API_KEY, 'exported-key');
    assert.equal(environment.SUITE_SETTING, 'exported');
    assert.deepEqual(inheritedEnvironment, { OPENAI_API_KEY: 'exported-key', SUITE_SETTING: 'exported' });
  });
});

test('a blank exported key does not hide a key from the selected file', () => {
  withProject({ '.env': 'OPENAI_API_KEY=file-key\n' }, projectRoot => {
    assert.equal(loadEvalEnvironment(projectRoot, { OPENAI_API_KEY: '' }).OPENAI_API_KEY, 'file-key');
  });
});

test('leaves the key unavailable when neither file provides it', () => {
  withProject({ '.env': 'SUITE_SETTING=env\n' }, projectRoot => {
    const environment = loadEvalEnvironment(projectRoot, {});
    assert.equal(environment.OPENAI_API_KEY, undefined);
    assert.equal(environment.SUITE_SETTING, undefined);
  });
});

test('workbench assistance receives the selected project key', () => {
  withProject({ '.env.local': 'OPENAI_API_KEY=project-key\n' }, projectRoot => {
    const dependencies = createWorkbenchDependencies({
      projectRoot,
      initialDiscoveryResult: { status: 'ready', suites: [], diagnostics: [], definitions: [] },
    });
    assert.equal(dependencies.analysis.assistanceConfig.getConfig().apiKey, 'project-key');
  });
});
