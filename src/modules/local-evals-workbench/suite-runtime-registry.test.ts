import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectSuiteRuntimeRegistry } from './suite-runtime-registry.js';

const suite = {
  version: 2, kind: 'sibu-eval-suite', id: 'good', name: 'Good', description: 'Synthetic',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], assertions: [{ id: 'contains', type: 'output-contains', expected: 'Hi' }], toolMocks: [], graders: [] }],
};
test('registry freshly validates one suite; invalid neighbors and changed symlinks do not contaminate it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-preview-registry-'));
  try {
    await mkdir(path.join(root, 'evals')); await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/target.mjs'), 'export const target = null;');
    await writeFile(path.join(root, 'evals/runner.mjs'), 'process.exit(0);');
    await writeFile(path.join(root, 'evals/good.json'), JSON.stringify(suite));
    await writeFile(path.join(root, 'evals/bad.json'), JSON.stringify({ ...suite, id: 'bad', version: 1 }));
    const registry = new ProjectSuiteRuntimeRegistry(root);
    assert.equal((await registry.load('good'))?.id, 'good');
    assert.equal(await registry.load('bad'), undefined);
    await rm(path.join(root, 'evals/runner.mjs'));
    await symlink('/etc/hosts', path.join(root, 'evals/runner.mjs'));
    assert.equal(await registry.load('good'), undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
