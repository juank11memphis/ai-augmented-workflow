import assert from 'node:assert/strict';
import { it } from 'node:test';
import { mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { ArtifactPaths } from './artifact-paths.js';
import { logicalId } from './validation.js';
import { project } from './test-project.js';
it('rejects root/intermediate/broken symlinks and traversal without following them', async () => {
  const p = await project(); try {
    const paths = new ArtifactPaths(p.root);
    for (const input of ['../outside', '/outside', 'x/../../outside', 'x\\y', 'C:x', 'sibling-prefix/../x']) await assert.rejects(paths.verify(input));
    await mkdir(path.join(p.root, 'evals')); await symlink('/nonexistent-private', path.join(p.root, 'evals/artifacts'));
    await assert.rejects(paths.verify('suite/run/run.json'));
  } finally { await p.cleanup(); }
});
it('seed 0x51b0: 1000 generated accepted destinations remain contained', async () => {
  const p = await project(); try {
    const paths = new ArtifactPaths(p.root); let seed = 0x51b0;
    for (let i = 0; i < 1000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const id = `run-${seed.toString(16)}`; assert.ok(logicalId(id));
      const target = await paths.verify(paths.run('suite', id)); assert.ok(target.startsWith(paths.artifactRoot + path.sep));
      assert.throws(() => paths.run('suite', `${id}/../bad`));
    }
  } finally { await p.cleanup(); }
});
it('maps version-2 dot/uppercase/reserved IDs without case-insensitive collisions', async () => {
  const { component, componentIdentity } = await import('./artifact-paths.js');
  const values = ['suite', 'Suite', 'case.name', 'con', 'id-5375697465', 'id-case', 'CASE'];
  const components = values.map(component); assert.equal(new Set(components.map(v => v.toLowerCase())).size, values.length);
  values.forEach((value, i) => assert.equal(componentIdentity(components[i]!), value));
});
