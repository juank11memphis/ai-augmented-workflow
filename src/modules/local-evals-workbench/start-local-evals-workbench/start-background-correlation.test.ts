import assert from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { withOfflineWorkbench } from './local-server-starter-test-fixture.js';

const reference = '123e4567-e89b-42d3-a456-426614174003';
const secret = 'OPENAI_API_KEY=sk-synthetic-secret';
const selection = { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake/available' };

async function reviewedStart(post: Parameters<Parameters<typeof withOfflineWorkbench>[0]>[0]['post']) {
  const preview = await post('/api/eval-runs/preview', selection);
  assert.equal(preview.code, 200);
  const { selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost } = preview.payload;
  return post('/api/eval-runs/start', { ...selection,
    review: { selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost },
  }, reference);
}

async function savedStatus(get: Parameters<Parameters<typeof withOfflineWorkbench>[0]>[0]['get'], runId: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const response = await get(`/api/eval-runs/status?suiteId=offline&runId=${runId}`);
    assert.equal(response.code, 200);
    assert.equal(response.payload.status, 'ok');
    const summary = (response.payload.value as { summary: { state: string } }).summary;
    if (summary.state !== 'queued' && summary.state !== 'running') return summary.state;
    await delay(20);
  }
  assert.fail('Background run did not reach a saved terminal status');
}

it('asserts the actual background terminal JSON start event matches the accepted HTTP reference and queued run ID', async () => {
  const originalInfo = console.info;
  const lines: string[] = [];
  console.info = (line: unknown) => { if (typeof line === 'string') lines.push(line); };
  try {
    await withOfflineWorkbench(async ({ post, get }) => {
      const accepted = await reviewedStart(post);
      assert.equal(accepted.code, 202);
      assert.equal(accepted.payload.reference, reference);
      assert.equal(accepted.headers.get('x-sibu-request-reference'), reference);
      const runId = String(accepted.payload.runId);
      assert.match(runId, /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
      assert.equal(await savedStatus(get, runId), 'error'); // The disposable runner rejects execute.

      const actualLine = lines.find(line => { try { return (JSON.parse(line) as { event?: string }).event === 'eval_run_started'; } catch { return false; } });
      assert.ok(actualLine, 'Actual background terminal start event was emitted');
      const event = JSON.parse(actualLine) as Record<string, unknown>;
      assert.deepEqual(Object.keys(event).sort(), ['durationMs', 'event', 'outcome', 'reference', 'runId', 'stage'].sort());
      assert.deepEqual({ event: event.event, stage: event.stage, outcome: event.outcome,
        reference: event.reference, runId: event.runId },
      { event: 'eval_run_started', stage: 'execution', outcome: 'started', reference: accepted.payload.reference, runId });
      assert.equal(typeof event.durationMs, 'number');
      assert.ok(typeof event.durationMs === 'number' && Number.isFinite(event.durationMs) && event.durationMs >= 0);
      assert.doesNotMatch(actualLine, /sk-synthetic-secret|OPENAI_API_KEY|private synthetic prompt|private synthetic runner content|credential|metadata/);
      process.stdout.write(`background-correlation ${JSON.stringify({ acceptedReference: accepted.payload.reference, queuedRunId: runId, parsedBackgroundEvent: event })}\n`);
    }, undefined, { syntheticSecretInputs: true });
  } finally { console.info = originalInfo; }
});

it('preserves the saved execution outcome when the background terminal sink throws', async () => {
  const originalInfo = console.info;
  let attempted = 0;
  console.info = (line: unknown) => {
    if (typeof line === 'string' && line.includes('"event":"eval_run_started"')) {
      attempted++;
      throw new Error(secret);
    }
  };
  try {
    await withOfflineWorkbench(async ({ post, get }) => {
      const accepted = await reviewedStart(post);
      assert.equal(accepted.code, 202);
      const runId = String(accepted.payload.runId);
      assert.equal(await savedStatus(get, runId), 'error');
      assert.equal(attempted, 1);
      const history = await get(`/api/eval-runs/history?suiteId=offline&reference=${reference}`);
      assert.deepEqual(history.payload, { status: 'confirmed', suiteId: 'offline', reference, runId });
    }, undefined, { syntheticSecretInputs: true });
  } finally { console.info = originalInfo; }
});
