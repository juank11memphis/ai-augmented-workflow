import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { readProjectFileState } from './project-file-state.js';

describe('readProjectFileState', () => {
  it('distinguishes verified absence from present content and detects changes', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-repair-state-'));
    try {
      const absent = await readProjectFileState(root, 'prompts/agent.md');
      assert.equal(absent.status, 'ok');
      if (absent.status === 'ok') assert.equal(absent.value.status, 'absent');
      await fs.mkdir(path.join(root, 'prompts'));
      await fs.writeFile(path.join(root, 'prompts/agent.md'), 'first');
      const first = await readProjectFileState(root, 'prompts/agent.md');
      await fs.writeFile(path.join(root, 'prompts/agent.md'), 'second');
      const second = await readProjectFileState(root, 'prompts/agent.md');
      assert.equal(first.status, 'ok');
      assert.equal(second.status, 'ok');
      if (first.status === 'ok' && second.status === 'ok' && first.value.status === 'present' && second.value.status === 'present') assert.notEqual(first.value.digest, second.value.digest);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
  it('denies traversal, artifacts, secret paths, symlink escapes and oversized files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-repair-state-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-repair-state-outside-'));
    try {
      await fs.symlink(outside, path.join(root, 'linked'));
      await fs.mkdir(path.join(root, 'evals', 'artifacts'), { recursive: true });
      await fs.writeFile(path.join(root, 'large.txt'), 'x'.repeat(33 * 1024));
      for (const target of ['../escape', '.env.local', 'config/token.txt', 'evals/artifacts/run.json', 'linked/new/file.txt', 'large.txt']) {
        const result = await readProjectFileState(root, target);
        assert.equal(result.status, 'blocked', target);
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(outside, { recursive: true, force: true });
    }
  });
});
