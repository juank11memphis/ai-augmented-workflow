import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { NodeSafeProjectFileMutator } from './safe-project-file-mutator.js';

describe('NodeSafeProjectFileMutator', () => {
  it('blocks traversal, absolute outside-root paths, secret/env/private-key files, and symlink escapes before writing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-outside-'));
    await fs.mkdir(path.join(root, 'linked'), { recursive: true });
    await fs.symlink(outside, path.join(root, 'linked', 'escape'));

    const mutator = new NodeSafeProjectFileMutator();
    for (const target of ['../outside.md', path.join(outside, 'file.md'), '.env', 'config/private-key.pem', 'linked/escape/file.md']) {
      const result = await mutator.validateTargets(root, [target]);
      assert.equal(result.status, 'blocked', target);
      assert.deepEqual((await mutator.applyApprovedChange({ projectRoot: root, targetPaths: [target], approvedChange: { kind: 'replacement', representation: 'MUST NOT WRITE' } })).status, 'failed', target);
    }
    await assert.rejects(fs.readFile(path.join(outside, 'file.md'), 'utf8'));
  });

  it('writes only a valid in-root replacement target and reports safe metadata', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    const mutator = new NodeSafeProjectFileMutator();

    const result = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: ['prompts/skill.md'], approvedChange: { kind: 'replacement', representation: 'new approved content' } });

    assert.equal(result.status, 'applied');
    if (result.status === 'applied') assert.deepEqual(result.changedFiles, [{ path: 'prompts/skill.md' }]);
    assert.equal(await fs.readFile(path.join(root, 'prompts/skill.md'), 'utf8'), 'new approved content');
  });

  it('applies a simple approved unified diff only when it matches current file content', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    await fs.mkdir(path.join(root, 'prompts'), { recursive: true });
    await fs.writeFile(path.join(root, 'prompts/skill.md'), 'before\nkeep\n', 'utf8');
    const mutator = new NodeSafeProjectFileMutator();

    const result = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: ['prompts/skill.md'], approvedChange: { kind: 'unified-diff', representation: '--- a/prompts/skill.md\n+++ b/prompts/skill.md\n@@\n-before\n+after' } });

    assert.equal(result.status, 'applied');
    assert.equal(await fs.readFile(path.join(root, 'prompts/skill.md'), 'utf8'), 'after\nkeep\n');
  });
});
