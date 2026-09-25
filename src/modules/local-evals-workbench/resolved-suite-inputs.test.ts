import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NormalizedEvalTestCase } from './discover-conventional-eval-suites/index.js';
import { resolveSuiteInputs } from './resolved-suite-inputs.js';

const testCase: NormalizedEvalTestCase = {
  id: 'case', name: 'Case',
  turns: [{ role: 'user', content: { type: 'file', path: 'inputs/request.txt' } }],
  fixture: { type: 'file', path: 'fixtures/data.json' },
  reference: { type: 'file', path: 'references/expected.txt' },
  toolMocks: [], assertions: [{ id: 'expected', type: 'output-equals', expected: { type: 'file', path: 'references/expected.txt' } }],
  graders: [{ id: 'rubric', type: 'rubric', rubric: { type: 'file', path: 'rubrics/safety.txt' }, threshold: 0.8 }],
};
async function fixture(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-preview-inputs-'));
  try {
    for (const folder of ['inputs', 'fixtures', 'references', 'rubrics'])
      await mkdir(path.join(root, 'evals', folder), { recursive: true });
    await writeFile(path.join(root, 'evals/inputs/request.txt'), 'Synthetic hello');
    await writeFile(path.join(root, 'evals/fixtures/data.json'), '{"id":"A"}');
    await writeFile(path.join(root, 'evals/references/expected.txt'), 'Accepted');
    await writeFile(path.join(root, 'evals/rubrics/safety.txt'), 'Use synthetic facts.');
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('resolves contained tagged text and JSON without exposing file paths to runner', async () => {
  await fixture(async (root) => {
    const result = await resolveSuiteInputs(root, [testCase]);
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    assert.deepEqual(result.value[0]?.turns[0]?.content, { type: 'inline', text: 'Synthetic hello' });
    assert.deepEqual(result.value[0]?.fixture, { type: 'inline', value: { id: 'A' } });
    assert.deepEqual(result.value[0]?.reference, { type: 'inline', text: 'Accepted' });
    assert.deepEqual(result.value[0]?.graders[0], { id: 'rubric', type: 'rubric', rubric: { type: 'inline', text: 'Use synthetic facts.' }, threshold: 0.8 });
  });
});
test('missing, oversized, sensitive and symlink-escaped references block', async () => {
  await fixture(async (root) => {
    const input = path.join(root, 'evals/inputs/request.txt');
    await writeFile(input, 'x'.repeat(100_001));
    assert.deepEqual(await resolveSuiteInputs(root, [testCase]), { status: 'blocked', reason: 'input-unsafe' });
    await writeFile(input, 'Bearer real-secret-token-value');
    assert.deepEqual(await resolveSuiteInputs(root, [testCase]), { status: 'blocked', reason: 'input-unsafe' });
    await rm(input);
    await symlink('/etc/hosts', input);
    assert.deepEqual(await resolveSuiteInputs(root, [testCase]), { status: 'blocked', reason: 'input-unsafe' });
    await rm(input);
    assert.deepEqual(await resolveSuiteInputs(root, [testCase]), { status: 'blocked', reason: 'input-unsafe' });
  });
});
