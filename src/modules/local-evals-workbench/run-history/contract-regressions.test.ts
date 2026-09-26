import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Attempt, RunConfiguration } from './contracts.js';
import { attempt, configuration, historyIndex, manifest, record } from './validation.js';
import { compact } from './history-index.js';
import { config, evidence, queued } from './test-fixtures.js';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { createRunHistory } from './composition.js';
import { LIMITS } from './limits.js';

function replace(value: unknown, keys: readonly string[], replacement: unknown): unknown {
  const clone: unknown = JSON.parse(JSON.stringify(value));
  let parent = clone;
  for (const key of keys.slice(0, -1)) {
    assert.ok(record(parent) || Array.isArray(parent));
    parent = (parent as Record<string, unknown>)[key];
  }
  assert.ok(record(parent) || Array.isArray(parent));
  (parent as Record<string, unknown>)[keys.at(-1)!] = replacement;
  return JSON.parse(JSON.stringify(clone));
}
const running = { ...queued(), state: 'running', calls: 1, cost: 0,
  cases: [{ caseId: 'case', state: 'completed', attempts: [{ number: 1, outcome: 'passed', durationMs: 5, calls: 1, cost: 0 }] }] };
const withTurn = { ...evidence(), turns: [{ id: 'turn', role: 'assistant', content: 'synthetic' }] };
const enumBoundaries = [
  { validate: configuration, value: config, keys: ['scope'], literal: 'selected' },
  ...['state', 'scope', 'outcome'].map(key => ({ validate: manifest, value: queued(), keys: [key], literal: { state: 'queued', scope: 'selected', outcome: 'incomplete' }[key]! })),
  { validate: manifest, value: running, keys: ['cases', '0', 'state'], literal: 'completed' },
  { validate: manifest, value: running, keys: ['cases', '0', 'attempts', '0', 'outcome'], literal: 'passed' },
  ...['state', 'scope', 'outcome'].map(key => ({ validate: historyIndex, value: { version: 1, entries: [compact(queued())] }, keys: ['entries', '0', key], literal: { state: 'queued', scope: 'selected', outcome: 'incomplete' }[key]! })),
  { validate: attempt, value: withTurn, keys: ['outcome'], literal: 'passed' },
  { validate: attempt, value: withTurn, keys: ['turns', '0', 'role'], literal: 'assistant' },
  { validate: attempt, value: withTurn, keys: ['assertions', '0', 'kind'], literal: 'grader' },
  { validate: attempt, value: withTurn, keys: ['assertions', '0', 'outcome'], literal: 'passed' },
];

it('TECH-01: every enum boundary rejects JSON arrays, objects, nulls, numbers and booleans without coercion', () => {
  for (const boundary of enumBoundaries) {
    assert.ok(boundary.validate(replace(boundary.value, boundary.keys, boundary.literal)), boundary.keys.join('.'));
    for (const invalid of [[boundary.literal], { value: boundary.literal }, null, 1, true]) {
      assert.equal(boundary.validate(replace(boundary.value, boundary.keys, invalid)), false, `${boundary.keys.join('.')}: ${JSON.stringify(invalid)}`);
    }
  }
});
it('ARCH-01: assertion and grader thresholds are optional finite numbers without a grading-scale restriction', () => {
  for (const kind of ['assertion', 'grader']) {
    const value = replace(evidence(), ['assertions', '0', 'kind'], kind);
    assert.ok(attempt(value));
    for (const threshold of [0, 0.8, -10, 200, Number.MAX_VALUE]) assert.ok(attempt(replace(value, ['assertions', '0', 'threshold'], threshold)));
    for (const threshold of ['0.8', [0.8], {}, null, true]) assert.equal(attempt(replace(value, ['assertions', '0', 'threshold'], threshold)), false);
    for (const threshold of [NaN, Infinity, -Infinity, undefined]) {
      assert.equal(attempt({ ...evidence(), assertions: [{ ...evidence().assertions[0], kind, threshold }] }), false);
    }
  }
});
it('ARCH-01: reopened public selected reads retain assertion/grader thresholds and older threshold-free evidence', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const h = createRunHistory(p.root, { log() {} });
    const created = await h.store.create(config); assert.equal(created.status, 'ok'); if (created.status !== 'ok') return;
    const id = created.value.runId; assert.equal((await h.store.start('suite', id)).status, 'ok');
    const e = evidence(id); const assertion = e.assertions[0]!;
    const assertions = [{ ...assertion, threshold: -2 }, { ...assertion, id: 'grader', kind: 'grader' as const, threshold: 0.8 }, { ...assertion, id: 'legacy' }];
    assert.equal((await h.store.append('suite', id, { ...e, assertions })).status, 'ok');
    assert.equal((await h.store.finalize('suite', id, 'completed')).status, 'ok');
    const reopened = createRunHistory(p.root, { log() {} });
    const disk = JSON.parse(await readFile(path.join(a.paths.artifactRoot, a.paths.attempt('suite', id, 'case', 1)), 'utf8'));
    assert.deepEqual(disk.assertions, assertions);
    for (const selected of assertions) {
      const result = await reopened.get({ suiteId: 'suite', runId: id, selection: { caseId: 'case', attempt: 1, assertionId: selected.id } });
      assert.equal(result.status, 'ok'); if (result.status !== 'ok') continue;
      assert.equal(result.value.evidenceStatus, 'available');
      assert.deepEqual(result.value.evidence?.assertions, [selected]);
      assert.equal(result.value.evidence?.output, '');
    }
  } finally { await p.cleanup(); }
});
it('invalid thresholds and enums are rejected before evidence or temporary publication', async () => {
  const p = await project(); try {
    const a = fixture(p.root);
    assert.equal((await a.store.create(replace(config, ['scope'], ['selected']) as RunConfiguration)).status, 'blocked');
    await assert.rejects(readdir(a.paths.artifactRoot), { code: 'ENOENT' });
    const created = await a.store.create(config); assert.equal(created.status, 'ok'); if (created.status !== 'ok') return;
    const id = created.value.runId; await a.store.start('suite', id);
    const before = await readdir(a.paths.artifactRoot, { recursive: true });
    const manifestPath = path.join(a.paths.artifactRoot, a.paths.run('suite', id));
    const previous = await readFile(manifestPath, 'utf8');
    for (const [keys, invalid] of [
      [['outcome'], ['passed']], [['assertions', '0', 'outcome'], ['passed']],
      [['assertions', '0', 'kind'], ['assertion']], [['assertions', '0', 'threshold'], '0.8'],
    ] as const) assert.equal((await a.store.append('suite', id, replace(evidence(id), keys, invalid) as Attempt)).status, 'blocked');
    assert.equal((await a.store.append('suite', id, { ...evidence(id), assertions: [{ ...evidence(id).assertions[0]!, threshold: Infinity }] })).status, 'blocked');
    assert.deepEqual(await readdir(a.paths.artifactRoot, { recursive: true }), before);
    assert.equal(await readFile(manifestPath, 'utf8'), previous);
    assert.equal((await a.store.finalize('suite', id, 'completed')).status, 'blocked');
  } finally { await p.cleanup(); }
});
it('TECH-01: malformed persisted enum JSON is corrupt at index, manifest and attempt reads', async () => {
  const p = await project(); try {
    const a = fixture(p.root); await a.files.directory('suite');
    for (const boundary of enumBoundaries.filter(b => b.validate !== configuration)) {
      const relative = 'suite/malformed.json';
      await writeFile(path.join(a.paths.artifactRoot, relative), JSON.stringify(replace(boundary.value, boundary.keys, [boundary.literal])));
      assert.deepEqual(await a.reader.read(relative, LIMITS.manifestBytes, (v: unknown): v is unknown => boundary.validate(v)), { status: 'blocked', reason: 'corrupt' });
    }
  } finally { await p.cleanup(); }
});
