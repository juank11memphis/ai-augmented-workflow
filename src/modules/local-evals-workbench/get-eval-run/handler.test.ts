import assert from 'node:assert/strict';
import { it } from 'node:test';
import { getEvalRun } from './handler.js';
import type { Outcome, RunDetail, ArtifactEvent } from '../run-history/contracts.js';
import { queued } from '../run-history/test-fixtures.js';
it('validates selection and preserves unavailable/corrupt outcomes', async () => {
  let calls = 0;
  const dependencies = { reader: { async list() { return { status: 'ok' as const, value: [] }; }, async get() { calls++; return { status: 'blocked' as const, reason: 'corrupt' as const }; } }, logger: { emit() {} } };
  assert.equal((await getEvalRun({ suiteId: 'suite', runId: 'run', selection: { caseId: 'case', attempt: 0 } }, dependencies)).status, 'blocked'); assert.equal(calls, 0);
  assert.deepEqual(await getEvalRun({ suiteId: 'suite', runId: 'run' }, dependencies), { status: 'blocked', reason: 'corrupt' });
});
it('keeps failed run, read fault, and selected-evidence warning separate with quiet recovery', async () => {
  const events: ArtifactEvent[] = [];
  const summary: RunDetail['summary'] = { ...queued(), state: 'completed', outcome: 'failed', diagnostics: ['assertion-failed'] };
  const responses: Outcome<RunDetail>[] = [
    { status: 'ok', value: { summary, evidenceStatus: 'not-requested' } },
    { status: 'ok', value: { summary, evidenceStatus: 'not-requested' } },
    { status: 'blocked', reason: 'corrupt' }, { status: 'blocked', reason: 'corrupt' },
    { status: 'blocked', reason: 'unavailable' },
    { status: 'ok', value: { summary, evidenceStatus: 'not-requested' } },
  ];
  const dependencies = { reader: { async get() { return responses.shift()!; }, async list() { return { status: 'ok' as const, value: [] }; } }, logger: { emit(event: ArtifactEvent) { events.push(event); } } };
  const command = { suiteId: 'suite', runId: 'run' };
  assert.equal((await getEvalRun(command, dependencies)).status, 'ok');
  assert.equal((await getEvalRun(command, dependencies)).status, 'ok');
  assert.deepEqual(await getEvalRun(command, dependencies), { status: 'blocked', reason: 'corrupt' });
  assert.equal((await getEvalRun(command, dependencies)).status, 'blocked');
  assert.deepEqual(await getEvalRun(command, dependencies), { status: 'blocked', reason: 'unavailable' });
  const recovered = await getEvalRun(command, dependencies);
  assert.equal(recovered.status === 'ok' && recovered.value.summary.outcome, 'failed');
  assert.deepEqual(events, [{ event: 'artifact-blocked', reason: 'corrupt' }, { event: 'artifact-blocked', reason: 'unavailable' }, { event: 'artifact-recovered' }]);
});
it('leaves summary readable for missing selected evidence and contains thrown reader/logger', async () => {
  const summary: RunDetail['summary'] = { ...queued(), state: 'completed', outcome: 'passed' };
  const events: ArtifactEvent[] = [];
  const command = { suiteId: 'suite', runId: 'run', selection: { caseId: 'case', attempt: 1 } };
  let available = false;
  const reader = { async get(): Promise<Outcome<RunDetail>> { return available
    ? { status: 'ok', value: { summary, evidenceStatus: 'available' } }
    : { status: 'ok', value: { summary, evidenceStatus: 'unavailable' }, warnings: ['index-stale', 'not-found'] }; }, async list() { return { status: 'ok' as const, value: [] }; } };
  const logger = { emit(event: ArtifactEvent) { events.push(event); } };
  const result = await getEvalRun(command, { reader, logger });
  assert.equal(result.status === 'ok' && result.value.summary.state, 'completed');
  assert.equal(result.status === 'ok' && result.value.evidenceStatus, 'unavailable');
  assert.deepEqual(events, [{ event: 'artifact-blocked', reason: 'not-found' }]);
  await getEvalRun(command, { reader, logger });
  available = true;
  assert.equal((await getEvalRun(command, { reader, logger })).status, 'ok');
  assert.deepEqual(events, [{ event: 'artifact-blocked', reason: 'not-found' }, { event: 'artifact-recovered' }]);
  assert.deepEqual(await getEvalRun(command, { reader: { ...reader, async get() { throw new Error('SECRET'); } }, logger: { emit() { throw new Error('SECRET'); } } }), { status: 'blocked', reason: 'unavailable' });
  available = false;
  assert.deepEqual(await getEvalRun(command, { reader, logger: { emit() { throw new Error('SECRET'); } } }), result);
});
