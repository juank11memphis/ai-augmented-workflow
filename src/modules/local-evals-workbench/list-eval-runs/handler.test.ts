import assert from 'node:assert/strict';
import { it } from 'node:test';
import { listEvalRuns } from './handler.js';
import type { ArtifactEvent, HistoryEntry, Outcome } from '../run-history/contracts.js';
it('bounds requests before invoking the reader and masks infrastructure failures', async () => {
  let calls = 0;
  const dependencies = { reader: { async list() { calls++; throw new Error('SECRET'); }, async get() { throw new Error(); } }, logger: { emit() {} } };
  for (const command of [{ suiteId: '../x' }, { suiteId: 'suite', limit: 51 }, { suiteId: 'suite', limit: 0 }]) assert.equal((await listEvalRuns(command, dependencies)).status, 'blocked');
  assert.equal(calls, 0); assert.deepEqual(await listEvalRuns({ suiteId: 'suite' }, dependencies), { status: 'blocked', reason: 'unavailable' });
});
it('does not log repeated successful History polls or repeat faults; emits one recovery', async () => {
  const events: ArtifactEvent[] = [];
  const entry = { runId: 'run', state: 'completed', outcome: 'failed' } as HistoryEntry;
  const responses: Outcome<readonly HistoryEntry[]>[] = [
    { status: 'ok', value: [entry] }, { status: 'ok', value: [entry] },
    { status: 'blocked', reason: 'unavailable' }, { status: 'blocked', reason: 'unavailable' },
    { status: 'ok', value: [entry] }, { status: 'ok', value: [entry] },
  ];
  const dependencies = { reader: { async list() { return responses.shift()!; }, async get() { return { status: 'blocked' as const, reason: 'not-found' as const }; } }, logger: { emit(event: ArtifactEvent) { events.push(event); } } };
  const command = { suiteId: 'suite' };
  assert.equal((await listEvalRuns(command, dependencies)).status, 'ok');
  assert.equal((await listEvalRuns(command, dependencies)).status, 'ok');
  assert.deepEqual(await listEvalRuns(command, dependencies), { status: 'blocked', reason: 'unavailable' });
  assert.equal((await listEvalRuns(command, dependencies)).status, 'blocked');
  assert.deepEqual(await listEvalRuns(command, dependencies), { status: 'ok', value: [entry] });
  assert.equal((await listEvalRuns(command, dependencies)).status, 'ok');
  assert.deepEqual(events, [{ event: 'artifact-blocked', reason: 'unavailable' }, { event: 'artifact-recovered' }]);
});
it('contains thrown reader and logger without inventing empty History', async () => {
  const reader = { async list(): Promise<Outcome<readonly HistoryEntry[]>> { throw new Error('SECRET'); }, async get() { return { status: 'blocked' as const, reason: 'not-found' as const }; } };
  assert.deepEqual(await listEvalRuns({ suiteId: 'suite' }, { reader, logger: { emit() { throw new Error('SECRET'); } } }), { status: 'blocked', reason: 'unavailable' });
  const emptyReader = { ...reader, async list(): Promise<Outcome<readonly HistoryEntry[]>> { return { status: 'ok', value: [] }; } };
  assert.deepEqual(await listEvalRuns({ suiteId: 'suite' }, { reader: emptyReader, logger: { emit() { throw new Error('SECRET'); } } }), { status: 'ok', value: [] });
});
