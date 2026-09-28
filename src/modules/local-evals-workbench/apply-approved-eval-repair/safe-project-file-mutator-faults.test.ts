import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { readProjectFileState } from '../repair-context/project-file-state.js';
import { NodeSafeProjectFileMutator } from './safe-project-file-mutator.js';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-repair-fault-'));
  const target = path.join(root, 'prompt.md');
  await fs.writeFile(target, 'original\n');
  const state = await readProjectFileState(root, 'prompt.md');
  assert.equal(state.status, 'ok');
  if (state.status !== 'ok') throw new Error('Fixture target unavailable');
  return { root, target, state: state.value };
}

function injected(operation: 'writeFile' | 'chmod' | 'rename', failure: 'before' | 'after-write' = 'before'): typeof fs {
  return new Proxy(fs, { get(target, key) {
    if (key !== operation) return Reflect.get(target, key);
    return async (...args: Parameters<typeof fs.writeFile>) => {
      if (failure === 'after-write' && operation === 'writeFile') await fs.writeFile(args[0], 'partial');
      throw new Error(`Injected ${operation} failure`);
    };
  } });
}

for (const [operation, failure] of [['writeFile', 'before'], ['writeFile', 'after-write'], ['chmod', 'before'], ['rename', 'before']] as const) {
  test(`${operation} ${failure} leaves original bytes and no temporary file`, async () => {
    const { root, target, state } = await fixture();
    try {
      const result = await new NodeSafeProjectFileMutator(injected(operation, failure)).applyApprovedChange({
        projectRoot: root, targetPaths: ['prompt.md'], targetPrecondition: state,
        approvedChange: { kind: 'replacement', representation: 'approved\n' },
      });
      assert.equal(result.status, 'failed');
      assert.equal(await fs.readFile(target, 'utf8'), 'original\n');
      assert.deepEqual(await fs.readdir(root), ['prompt.md']);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
}

test('changed target during temporary write is not overwritten', async () => {
  const { root, target, state } = await fixture();
  try {
    const files = new Proxy(fs, { get(base, key) {
      if (key !== 'writeFile') return Reflect.get(base, key);
      return async (...args: Parameters<typeof fs.writeFile>) => {
        await fs.writeFile(...args);
        await fs.writeFile(target, 'concurrent\n');
      };
    } });
    const result = await new NodeSafeProjectFileMutator(files).applyApprovedChange({
      projectRoot: root, targetPaths: ['prompt.md'], targetPrecondition: state,
      approvedChange: { kind: 'replacement', representation: 'approved\n' },
    });
    assert.equal(result.status, 'failed');
    assert.equal(await fs.readFile(target, 'utf8'), 'concurrent\n');
    assert.deepEqual(await fs.readdir(root), ['prompt.md']);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('postpublication exception reports the known changed target', async () => {
  const { root, target, state } = await fixture();
  try {
    const files = new Proxy(fs, { get(base, key) {
      if (key !== 'rename') return Reflect.get(base, key);
      return async (...args: Parameters<typeof fs.rename>) => { await fs.rename(...args); throw new Error('lost completion'); };
    } });
    const result = await new NodeSafeProjectFileMutator(files).applyApprovedChange({ projectRoot: root, targetPaths: ['prompt.md'],
      targetPrecondition: state, approvedChange: { kind: 'replacement', representation: 'approved\n' } });
    assert.equal(result.status, 'failed');
    assert.deepEqual(result.changedFiles, [{ path: 'prompt.md' }]);
    assert.equal(await fs.readFile(target, 'utf8'), 'approved\n');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('cleanup failure reports a temporary path rather than claiming no changes', async () => {
  const { root, target, state } = await fixture();
  try {
    const files = new Proxy(fs, { get(base, key) {
      if (key === 'rename' || key === 'unlink') return async () => { throw new Error('injected failure'); };
      return Reflect.get(base, key);
    } });
    const result = await new NodeSafeProjectFileMutator(files).applyApprovedChange({ projectRoot: root, targetPaths: ['prompt.md'],
      targetPrecondition: state, approvedChange: { kind: 'replacement', representation: 'approved\n' } });
    assert.equal(result.status, 'failed');
    assert.equal(result.changedFiles.length, 1);
    assert.match(result.changedFiles[0]!.path, /^prompt\.md\.sibu-.*\.tmp$/);
    assert.equal(await fs.readFile(target, 'utf8'), 'original\n');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
