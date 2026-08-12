import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateProjectFileTargets } from './project-file-safety.js';

describe('validateProjectFileTargets', () => {
  it('allows non-evals files inside the project root', () => {
    assert.deepEqual(validateProjectFileTargets('/repo', ['prompts/skill.md']).status, 'ok');
  });

  it('blocks traversal, outside absolute paths, secret targets, duplicates, and empty targets', () => {
    assert.equal(validateProjectFileTargets('/repo', ['../secret.txt']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['/tmp/outside.txt']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['.env']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', ['config/private-key.pem']).status, 'blocked');
    assert.equal(validateProjectFileTargets('/repo', []).status, 'blocked');
    const duplicate = validateProjectFileTargets('/repo', ['prompts/a.md', 'prompts/a.md']);
    assert.equal(duplicate.status, 'ok');
    if (duplicate.status === 'ok') assert.deepEqual(duplicate.paths, ['prompts/a.md']);
  });
});
