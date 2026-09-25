import assert from 'node:assert/strict';
import { it } from 'node:test';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { GitArtifactSafety } from './git-artifact-safety.js';
import { project } from './test-project.js';
it('checks ignored future destinations and detects tracked files even after deletion', async () => {
  const p = await project(); try {
    const safety = new GitArtifactSafety(p.root); assert.equal((await safety.check()).status, 'ok');
    await mkdir(path.join(p.root, 'evals/artifacts'), { recursive: true });
    await writeFile(path.join(p.root, 'evals/artifacts/private'), 'synthetic'); p.git('add', '-f', 'evals/artifacts/private');
    assert.deepEqual(await safety.check(), { status: 'blocked', reason: 'tracked-artifacts' });
    await unlink(path.join(p.root, 'evals/artifacts/private'));
    assert.deepEqual(await safety.check(), { status: 'blocked', reason: 'tracked-artifacts' });
  } finally { await p.cleanup(); }
});
it('blocks missing root exclusion, descendant negations and unavailable Git', async () => {
  const p = await project(false); try {
    const safety = new GitArtifactSafety(p.root); assert.deepEqual(await safety.check(), { status: 'blocked', reason: 'not-ignored' });
    await writeFile(path.join(p.root, '.gitignore'), '/evals/artifacts/*\n!/evals/artifacts/public/\n');
    assert.equal((await safety.check(['public/run.json'])).status, 'blocked');
    const absent = new GitArtifactSafety(p.root, async () => { throw new Error('SECRET stderr'); });
    assert.deepEqual(await absent.check(), { status: 'blocked', reason: 'git-unavailable' });
    const nested = path.join(p.root, 'nested'); await mkdir(nested);
    assert.deepEqual(await new GitArtifactSafety(nested).check(), { status: 'blocked', reason: 'unverifiable-root' });
  } finally { await p.cleanup(); }
});
it('fails closed for subprocess timeout/error statuses, repository mismatch and missing permission evidence', async () => {
  const root = '/synthetic';
  for (const reason of ['timeout', 'EACCES', 'ENOENT']) {
    assert.deepEqual(await new GitArtifactSafety(root, async () => { throw new Error(reason); }).check(), { status: 'blocked', reason: 'git-unavailable' });
  }
  assert.deepEqual(await new GitArtifactSafety(root, async () => ({ code: 128, stdout: 'SECRET' })).check(), { status: 'blocked', reason: 'unverifiable-root' });
  assert.deepEqual(await new GitArtifactSafety(root, async args => args[0] === 'rev-parse' ? { code: 0, stdout: root } : { code: 128, stdout: 'SECRET' }).check(), { status: 'blocked', reason: 'git-unavailable' });
});
