import assert from 'node:assert/strict';
import { it } from 'node:test';
import { mkdir, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { project } from './test-project.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { ArtifactPaths } from './artifact-paths.js';
it('enforces byte limits before parsing and rejects malformed, deep and symlink payloads', async () => {
  const p = await project(); try {
    const base = path.join(p.root, 'evals/artifacts'); await mkdir(base, { recursive: true }); const reader = new BoundedArtifactReader(new ArtifactPaths(p.root));
    const string = (v: unknown): v is string => typeof v === 'string';
    await writeFile(path.join(base, 'value.json'), '"é"'); assert.equal((await reader.read('value.json', 4, string)).status, 'ok');
    assert.deepEqual(await reader.read('value.json', 3, string), { status: 'blocked', reason: 'limit-exceeded' });
    await writeFile(path.join(base, 'value.json'), '{'); assert.deepEqual(await reader.read('value.json', 4, string), { status: 'blocked', reason: 'corrupt' });
    await symlink('/must-not-open', path.join(base, 'link.json')); assert.deepEqual(await reader.read('link.json', 100, string), { status: 'blocked', reason: 'unsafe-path' });
    await writeFile(path.join(base, 'value.json'), '['.repeat(14) + '0' + ']'.repeat(14)); assert.deepEqual(await reader.read('value.json', 100, string), { status: 'blocked', reason: 'corrupt' });
  } finally { await p.cleanup(); }
});
