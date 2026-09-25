import assert from 'node:assert/strict';
import { it } from 'node:test';
import { writeFile, mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { ArtifactPaths } from './artifact-paths.js';
import { ArtifactSafetyAdapter } from './artifact-safety-adapter.js';
import { project } from './test-project.js';
it('rechecks ignore changes and leaf/index/temp symlinks on every call', async () => {
  const p = await project(); try {
    const safety = new ArtifactSafetyAdapter(new ArtifactPaths(p.root)); assert.equal((await safety.check()).status, 'ok');
    await writeFile(path.join(p.root, '.gitignore'), ''); assert.equal((await safety.check()).status, 'blocked');
    await writeFile(path.join(p.root, '.gitignore'), '/evals/artifacts/\n'); await mkdir(path.join(p.root, 'evals/artifacts/suite'), { recursive: true });
    for (const leaf of ['index.json', 'tmp-file']) { await symlink('/not-to-read', path.join(p.root, 'evals/artifacts/suite', leaf)); assert.equal((await safety.check([`suite/${leaf}`])).status, 'blocked'); }
  } finally { await p.cleanup(); }
});
it('refuses a root replacement between readiness and the next write without outside mutation', async () => {
  const { rename, access } = await import('node:fs/promises');
  const { fixture } = await import('./store-fixture.js'); const { config } = await import('./test-fixtures.js');
  const p = await project(); const outside = await project(); try {
    const a = fixture(p.root); assert.equal((await a.safety.check()).status, 'ok');
    await mkdir(path.join(p.root, 'evals/artifacts'), { recursive: true });
    await rename(path.join(p.root, 'evals/artifacts'), path.join(p.root, 'evals/old-artifacts'));
    await symlink(outside.root, path.join(p.root, 'evals/artifacts'));
    assert.deepEqual(await a.store.create(config), { status: 'blocked', reason: 'unsafe-path' });
    await assert.rejects(access(path.join(outside.root, 'suite')));
  } finally { await p.cleanup(); await outside.cleanup(); }
});
it('refuses a regular-file artifact root and unwritable artifact directories', async () => {
  const { unlink, chmod } = await import('node:fs/promises'); const p = await project(); try {
    await mkdir(path.join(p.root, 'evals')); await writeFile(path.join(p.root, 'evals/artifacts'), 'synthetic');
    const safety = new ArtifactSafetyAdapter(new ArtifactPaths(p.root));
    assert.deepEqual(await safety.check(), { status: 'blocked', reason: 'unsafe-path' });
    await unlink(path.join(p.root, 'evals/artifacts')); await mkdir(path.join(p.root, 'evals/artifacts'));
    if (process.getuid?.() !== 0) {
      await chmod(path.join(p.root, 'evals/artifacts'), 0o500);
      try { assert.equal((await safety.check()).status, 'blocked'); }
      finally { await chmod(path.join(p.root, 'evals/artifacts'), 0o700); }
    }
  } finally { await p.cleanup(); }
});
