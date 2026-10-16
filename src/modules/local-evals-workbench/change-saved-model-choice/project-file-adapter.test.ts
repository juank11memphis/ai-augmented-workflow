import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { NodeProjectSuiteChoiceFile } from './project-file-adapter.js';

async function fixture(): Promise<{ root: string; file: string; before: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-choice-'));
  await mkdir(path.join(root, 'evals'));
  const file = path.join(root, 'evals', 'suite.json');
  const before = JSON.stringify({ version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Safe suite.',
    target: { id: 'target', kind: 'agent', path: 'src/target.ts' }, coverage: { categories: [{ id: 'happy', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runners/runner.mjs'], requiredEnvironment: [] },
    testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: 'Safe input.' }],
      assertions: [{ id: 'output', type: 'output-contains', expected: 'safe' }], graders: [] }] }, null, 2) + '\n';
  await writeFile(file, before);
  return { root, file, before };
}

it('sets, changes, and resets one field, preserving unrelated bytes and semantics', async () => {
  const { root, file, before } = await fixture();
  try {
    const adapter = new NodeProjectSuiteChoiceFile(root);
    let snapshot = await adapter.read('suite');
    assert.ok('token' in snapshot);
    if (!('token' in snapshot)) return;
    const first = await adapter.save('suite', 'tested', 'X', snapshot.token);
    assert.equal(first.status, 'saved');
    const tested = await readFile(file, 'utf8');
    assert.equal(tested.replace(',"defaultTestedModel": "X"', ''), before);
    snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) return;
    assert.equal((await adapter.save('suite', 'judge', 'J', snapshot.token)).status, 'saved');
    const both = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    assert.equal(both.defaultTestedModel, 'X');
    assert.equal(both.defaultJudgeModel, 'J');
    snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) return;
    assert.equal((await adapter.save('suite', 'tested', 'Y', snapshot.token)).status, 'saved');
    snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) return;
    assert.equal((await adapter.save('suite', 'judge', null, snapshot.token)).status, 'saved');
    const final = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    assert.equal(final.defaultTestedModel, 'Y');
    assert.equal(Object.hasOwn(final, 'defaultJudgeModel'), false);
    assert.deepEqual(Object.fromEntries(Object.entries(final).filter(([key]) => !key.startsWith('default'))), JSON.parse(before));
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('sets, changes, and resets case roles without changing suite defaults or unrelated bytes', async () => {
  const { root, file, before } = await fixture();
  try {
    const adapter = new NodeProjectSuiteChoiceFile(root);
    let original = before;
    for (const [role, first, second, field] of [
      ['tested', 'X', 'Y', 'testedModel'], ['judge', 'J', 'K', 'judgeModel'],
    ] as const) {
      for (const modelId of [first, second, null]) {
        const snapshot = await adapter.read('suite');
        if (!('token' in snapshot)) assert.fail('fixture must be valid');
        const result = await adapter.save('suite', role, modelId, snapshot.token, 'case');
        assert.equal(result.status, 'saved');
        if (result.status === 'saved') assert.equal(result.caseId, 'case');
        const current = await readFile(file, 'utf8');
        const parsed = JSON.parse(current) as { testCases: Record<string, unknown>[]; defaultTestedModel?: string; defaultJudgeModel?: string };
        assert.equal(parsed.testCases[0]?.[field], modelId ?? undefined);
        assert.equal(parsed.defaultTestedModel, undefined);
        assert.equal(parsed.defaultJudgeModel, undefined);
        if (modelId === null) assert.equal(current, original);
      }
      original = await readFile(file, 'utf8');
    }
    assert.equal(await readFile(file, 'utf8'), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('preserves another case role and existing suite defaults during one case edit', async () => {
  const { root, file, before } = await fixture();
  try {
    const source = before.replace('"testCases": [', '"defaultTestedModel": "A", "defaultJudgeModel": "B", "testCases": [')
      .replace('"name": "Case",', '"name": "Case", "judgeModel": "J",');
    await writeFile(file, source);
    const adapter = new NodeProjectSuiteChoiceFile(root);
    const snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) assert.fail('fixture must be valid');
    assert.equal((await adapter.save('suite', 'tested', 'X', snapshot.token, 'case')).status, 'saved');
    const current = await readFile(file, 'utf8');
    assert.equal(current.replace(',"testedModel": "X"', ''), source);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('refuses malformed and oversized suites, direct path attacks, and symlink escapes', async () => {
  const { root, file, before } = await fixture();
  try {
    const adapter = new NodeProjectSuiteChoiceFile(root);
    for (const id of ['../suite', 'nested/suite', '..']) assert.deepEqual(await adapter.read(id), { status: 'blocked', reason: 'path-unsafe' });
    await symlink(file, path.join(root, 'evals', 'link.json'));
    assert.deepEqual(await adapter.read('link'), { status: 'blocked', reason: 'path-unsafe' });
    const symlinkRoot = path.join(root, 'root-link');
    await symlink(root, symlinkRoot);
    assert.deepEqual(await new NodeProjectSuiteChoiceFile(symlinkRoot).read('suite'), { status: 'blocked', reason: 'path-unsafe' });
    await writeFile(file, '{bad');
    assert.deepEqual(await adapter.read('suite'), { status: 'blocked', reason: 'suite-invalid' });
    await writeFile(file, ' '.repeat(1_000_001));
    assert.deepEqual(await adapter.read('suite'), { status: 'blocked', reason: 'suite-invalid' });
    await writeFile(file, before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('detects stale token and controlled edit before atomic replacement without losing bytes', async () => {
  const { root, file, before } = await fixture();
  try {
    const changed = before.replace('Safe suite.', 'Manually edited.');
    const adapter = new NodeProjectSuiteChoiceFile(root, async () => { await writeFile(file, changed); });
    const snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) assert.fail('fixture must be valid');
    assert.deepEqual(await adapter.save('suite', 'tested', 'X', 'b'.repeat(64)), { status: 'conflict', reason: 'suite-changed' });
    assert.deepEqual(await adapter.save('suite', 'tested', 'X', snapshot.token), { status: 'conflict', reason: 'suite-changed' });
    assert.equal(await readFile(file, 'utf8'), changed);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('keeps prior bytes intact on injected failure', async () => {
  const { root, file, before } = await fixture();
  try {
    const adapter = new NodeProjectSuiteChoiceFile(root, async () => { throw new Error('injected'); });
    const snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) assert.fail('fixture must be valid');
    assert.deepEqual(await adapter.save('suite', 'judge', 'J', snapshot.token), { status: 'blocked', reason: 'write-failed' });
    assert.equal(await readFile(file, 'utf8'), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('keeps case bytes intact for invalid case, stale token, concurrent edit, and failed write', async () => {
  const { root, file, before } = await fixture();
  try {
    const adapter = new NodeProjectSuiteChoiceFile(root);
    const snapshot = await adapter.read('suite');
    if (!('token' in snapshot)) assert.fail('fixture must be valid');
    assert.deepEqual(await adapter.save('suite', 'tested', 'X', snapshot.token, 'absent'), { status: 'blocked', reason: 'case-unavailable' });
    assert.deepEqual(await adapter.save('suite', 'tested', 'X', 'b'.repeat(64), 'case'), { status: 'conflict', reason: 'suite-changed' });
    assert.equal(await readFile(file, 'utf8'), before);
    const edited = before.replace('Safe suite.', 'Edited suite.');
    const concurrent = new NodeProjectSuiteChoiceFile(root, async () => { await writeFile(file, edited); });
    assert.deepEqual(await concurrent.save('suite', 'tested', 'X', snapshot.token, 'case'), { status: 'conflict', reason: 'suite-changed' });
    assert.equal(await readFile(file, 'utf8'), edited);
    const failed = new NodeProjectSuiteChoiceFile(root, async () => { throw new Error('injected'); });
    const next = await failed.read('suite');
    if (!('token' in next)) assert.fail('fixture must be valid');
    assert.deepEqual(await failed.save('suite', 'judge', 'J', next.token, 'case'), { status: 'blocked', reason: 'write-failed' });
    assert.equal(await readFile(file, 'utf8'), edited);
  } finally { await rm(root, { recursive: true, force: true }); }
});
