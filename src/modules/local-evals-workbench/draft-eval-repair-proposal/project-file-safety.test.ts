import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NodeSafeProjectFileReader, validateProjectFileTargets } from './project-file-safety.js';

describe('validateProjectFileTargets', () => {
  it('allows non-evals files inside the project root', () => {
    assert.deepEqual(validateProjectFileTargets('/repo', ['prompts/skill.md']).status, 'ok');
  });

  it('blocks traversal, outside absolute paths, secret targets, duplicates, and empty targets', () => {
    assert.equal(validateProjectFileTargets('/repo', ['../secret.txt']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['/tmp/outside.txt']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['.env']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['config/private-key.pem']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['config/api-key.txt']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['.ssh/id_ed25519']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['.ssh/id_ecdsa']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['a\\b.md']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['a//b.md']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', []).status, 'blocked');
    const duplicate = validateProjectFileTargets('/repo', ['prompts/a.md', 'prompts/a.md']);
    assert.equal(duplicate.status, 'ok');
    if (duplicate.status === 'ok') assert.deepEqual(duplicate.paths, ['prompts/a.md']);
  });

  it('never includes a private target or target content in the safety reason', () => {
    const result = validateProjectFileTargets('/repo', ['../PRIVATE_TARGET_CONTENT']);
    assert.equal(result.status, 'blocked');
    if (result.status === 'blocked') assert.doesNotMatch(result.reason, /PRIVATE_TARGET_CONTENT/);
  });

  it('never supplies conventional private-key content as provider context', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-proposal-private-key-'));
    try {
      await fs.mkdir(path.join(root, '.ssh'));
      const reader = new NodeSafeProjectFileReader();
      for (const target of ['.ssh/id_ed25519', '.ssh/id_ecdsa']) {
        await fs.writeFile(path.join(root, target), 'PRIVATE KEY SENTINEL');
        const result = await reader.readProjectFilePreviews(root, [target]);
        assert.equal(result.status, 'blocked', target);
        assert.equal((await reader.readTargetState(root, target)).status, 'blocked', target);
        assert.doesNotMatch(JSON.stringify(result), /PRIVATE KEY SENTINEL/);
      }
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  it('supplies complete bounded source for replacement review rather than a truncated preview', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-proposal-context-'));
    try {
      const source = `${'safe context\n'.repeat(400)}last line\n`;
      await fs.writeFile(path.join(root, 'prompt.md'), source);
      const result = await new NodeSafeProjectFileReader().readProjectFilePreviews(root, ['prompt.md']);
      assert.equal(result.status, 'ok');
      if (result.status === 'ok') assert.equal(result.files[0]?.preview, source);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
});
