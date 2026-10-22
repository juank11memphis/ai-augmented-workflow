import assert from 'node:assert/strict';
import test from 'node:test';
import { lstat, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config } from './test-fixtures.js';
import { FileArtifactReader } from './file-artifact-reader.js';

test('rejected stdout is ignored, private, byte-addressable, and path-safe', async () => {
  const p = await project();
  try {
    const a = fixture(p.root);
    const created = await a.store.create(config);
    if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
    const runId = created.value.runId;
    assert.equal((await a.store.start('suite', runId)).status, 'ok');
    const raw = Buffer.from('PRIVATE_PROTOCOL_BODY');
    const saved = await a.store.saveProtocolRejection({ suiteId: 'suite', runId, bytes: raw });
    if (saved.status !== 'ok') return assert.fail(JSON.stringify(saved));
    const locator = saved.value;
    const metadata = { sequence: 2, eventType: 'non-protocol-stdout', code: 'invalid-json',
      byteCount: raw.length, capturedByteCount: raw.length, locator };
    assert.equal((await a.store.finalize('suite', runId, 'error', ['runner-protocol-invalid'],
      { stage: 'protocol-rejection', protocolRejection: metadata })).status, 'ok');
    const target = path.join(p.root, 'evals/artifacts', locator);
    assert.equal((await lstat(target)).mode & 0o777, 0o600);
    assert.equal(p.git('check-ignore', '-q', target), '');
    assert.deepEqual(await readFile(target), raw);
    const reader = new FileArtifactReader(a.paths, a.reader);
    const first = await reader.protocolRejectionRange('suite', runId, locator, 0, 7);
    if (first.status !== 'ok') return assert.fail(JSON.stringify(first));
    assert.deepEqual(Buffer.from(first.value.bytes), raw.subarray(0, 7));
    assert.equal(first.value.nextOffset, 7);
    assert.deepEqual(await reader.protocolRejectionRange('suite', runId, '../outside', 0),
      { status: 'blocked', reason: 'not-found' });
    assert.deepEqual(await reader.protocolRejectionRange('suite', runId, locator, 0, 1025),
      { status: 'blocked', reason: 'invalid-input' });
    await unlink(target);
    await symlink('/tmp/outside-private', target);
    assert.deepEqual(await reader.protocolRejectionRange('suite', runId, locator, 0),
      { status: 'blocked', reason: 'unsafe-path' });
  } finally { await p.cleanup(); }
});

test('unignored or tracked artifact roots refuse rejected output before publication', async () => {
  const p = await project(false);
  try {
    const a = fixture(p.root);
    const created = await a.store.create(config);
    assert.deepEqual(created, { status: 'blocked', reason: 'not-ignored' });
    await writeFile(path.join(p.root, '.gitignore'), '/evals/artifacts/\n');
    const ready = await a.store.create(config);
    if (ready.status !== 'ok') return assert.fail(JSON.stringify(ready));
    assert.equal((await a.store.start('suite', ready.value.runId)).status, 'ok');
    const target = path.join(p.root, 'evals/artifacts', a.paths.run('suite', ready.value.runId));
    p.git('add', '-f', path.relative(p.root, target));
    assert.deepEqual(await a.store.saveProtocolRejection({ suiteId: 'suite', runId: ready.value.runId,
      bytes: Buffer.from('private') }), { status: 'blocked', reason: 'tracked-artifacts' });
  } finally { await p.cleanup(); }
});
