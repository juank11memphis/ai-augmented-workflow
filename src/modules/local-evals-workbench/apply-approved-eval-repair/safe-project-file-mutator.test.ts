import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { NodeSafeProjectFileMutator } from './safe-project-file-mutator.js';
import { readProjectFileState } from '../repair-context/project-file-state.js';

describe('NodeSafeProjectFileMutator', () => {
  it('blocks traversal, absolute outside-root paths, secret/env/private-key files, and symlink escapes before writing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-outside-'));
    await fs.mkdir(path.join(root, 'linked'), { recursive: true });
    await fs.symlink(outside, path.join(root, 'linked', 'escape'));

    const mutator = new NodeSafeProjectFileMutator();
    for (const target of ['../outside.md', path.join(outside, 'file.md'), '.env', 'config/private-key.pem', 'config/api-key.txt',
      'linked/escape/file.md', 'evals/artifacts/suite/run.json', 'a\\b.md', 'a//b.md', './prompt.md']) {
      const result = await mutator.validateTargets(root, [target]);
      assert.equal(result.status, 'blocked', target);
      assert.deepEqual((await mutator.applyApprovedChange({ projectRoot: root, targetPaths: [target], targetPrecondition: { status: 'absent', path: target }, approvedChange: { kind: 'replacement', representation: 'MUST NOT WRITE' } })).status, 'failed', target);
    }
    await assert.rejects(fs.readFile(path.join(outside, 'file.md'), 'utf8'));
  });

  it('rejects hardlinks and aliases into secret and artifact paths', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-alias-'));
    try {
      await fs.mkdir(path.join(root, 'evals/artifacts'), { recursive: true });
      await fs.writeFile(path.join(root, '.env'), 'secret');
      await fs.writeFile(path.join(root, 'ordinary.md'), 'safe');
      await fs.link(path.join(root, 'ordinary.md'), path.join(root, 'linked.md'));
      await fs.symlink(path.join(root, '.env'), path.join(root, 'secret-alias.md'));
      await fs.symlink(path.join(root, 'evals/artifacts'), path.join(root, 'artifact-alias'));
      const mutator = new NodeSafeProjectFileMutator();
      for (const target of ['ordinary.md', 'linked.md', 'secret-alias.md', 'artifact-alias/new.md']) {
        assert.equal((await mutator.validateTargets(root, [target])).status, 'blocked', target);
      }
      assert.equal(await fs.readFile(path.join(root, '.env'), 'utf8'), 'secret');
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  it('does not mutate conventional private-key targets even with a forged precondition', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-private-key-'));
    try {
      await fs.mkdir(path.join(root, '.ssh'));
      const mutator = new NodeSafeProjectFileMutator();
      for (const target of ['.ssh/id_ed25519', '.ssh/id_ecdsa']) {
        await fs.writeFile(path.join(root, target), 'PRIVATE KEY SENTINEL');
        const result = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: [target],
          targetPrecondition: { status: 'present', path: target, digest: 'forged', content: 'PRIVATE KEY SENTINEL', preview: 'PRIVATE KEY SENTINEL' },
          approvedChange: { kind: 'replacement', representation: 'MUST NOT WRITE' } });
        assert.equal(result.status, 'failed', target);
        assert.equal(await fs.readFile(path.join(root, target), 'utf8'), 'PRIVATE KEY SENTINEL');
      }
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  it('rejects absent replacement targets without creating a file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    const mutator = new NodeSafeProjectFileMutator();

    const result = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: ['prompts/skill.md'], targetPrecondition: { status: 'absent', path: 'prompts/skill.md' }, approvedChange: { kind: 'replacement', representation: 'new approved content' } });

    assert.equal(result.status, 'failed');
    await assert.rejects(fs.readFile(path.join(root, 'prompts/skill.md'), 'utf8'));
  });

  it('applies a simple approved unified diff only when it matches current file content', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    await fs.mkdir(path.join(root, 'prompts'), { recursive: true });
    await fs.writeFile(path.join(root, 'prompts/skill.md'), 'before\nkeep\n', 'utf8');
    const mutator = new NodeSafeProjectFileMutator();

    const state = await readProjectFileState(root, 'prompts/skill.md');
    assert.equal(state.status, 'ok');
    if (state.status !== 'ok') return;
    const result = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: ['prompts/skill.md'], targetPrecondition: state.value, approvedChange: { kind: 'unified-diff', representation: '--- a/prompts/skill.md\n+++ b/prompts/skill.md\n@@ -1,1 +1,1 @@\n-before\n+after' } });

    assert.equal(result.status, 'applied');
    assert.equal(await fs.readFile(path.join(root, 'prompts/skill.md'), 'utf8'), 'after\nkeep\n');
  });
  it('preserves executable and restricted modes on approved replacements', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-mode-'));
    const mutator = new NodeSafeProjectFileMutator();
    for (const [name, mode] of [['executable.sh', 0o755], ['private.md', 0o600]] as const) {
      const file = path.join(root, name);
      await fs.writeFile(file, 'before', { mode });
      await fs.chmod(file, mode);
      const state = await readProjectFileState(root, name);
      assert.equal(state.status, 'ok');
      if (state.status !== 'ok') continue;
      const result = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: [name],
        targetPrecondition: state.value, approvedChange: { kind: 'replacement', representation: 'after' } });
      assert.equal(result.status, 'applied');
      assert.equal((await fs.stat(file)).mode & 0o7777, mode);
      assert.equal(await fs.readFile(file, 'utf8'), 'after');
    }
  });
  it('refuses changed targets and multi-file changes without mutation', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-mutator-'));
    try {
      await fs.writeFile(path.join(root, 'agent.md'), 'before');
      const first = await readProjectFileState(root, 'agent.md');
      assert.equal(first.status, 'ok');
      if (first.status !== 'ok') return;
      await fs.writeFile(path.join(root, 'agent.md'), 'changed');
      const mutator = new NodeSafeProjectFileMutator();
      const stale = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: ['agent.md'],
        targetPrecondition: first.value, approvedChange: { kind: 'replacement', representation: 'approved' } });
      assert.equal(stale.status, 'failed');
      assert.equal(await fs.readFile(path.join(root, 'agent.md'), 'utf8'), 'changed');
      const multiple = await mutator.applyApprovedChange({ projectRoot: root, targetPaths: ['agent.md', 'other.md'],
        targetPrecondition: first.value, approvedChange: { kind: 'replacement', representation: 'approved' } });
      assert.equal(multiple.status, 'failed');
      await assert.rejects(fs.readFile(path.join(root, 'other.md')));
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
});
