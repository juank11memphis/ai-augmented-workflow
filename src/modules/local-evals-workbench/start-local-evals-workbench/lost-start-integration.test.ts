import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { withOfflineWorkbench } from './local-server-starter-test-fixture.js';
import { createRunHistory } from '../run-history/composition.js';
import { ArtifactPaths } from '../run-history/artifact-paths.js';
import { evidence } from '../run-history/test-fixtures.js';

const references = {
  old: '123e4567-e89b-42d3-a456-426614174011',
  lost: '123e4567-e89b-42d3-a456-426614174012',
  unrelated: '123e4567-e89b-42d3-a456-426614174013',
  absent: '123e4567-e89b-42d3-a456-426614174014',
};
const secret = /SYNTHETIC_SECRET_SENTINEL|sk-synthetic-secret|private synthetic prompt|private synthetic runner content/;
const selection = { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake/available' };
type Workbench = Parameters<Parameters<typeof withOfflineWorkbench>[0]>[0];

async function reviewedStart(workbench: Workbench, reference: string) {
  const preview = await workbench.post('/api/eval-runs/preview', selection);
  assert.equal(preview.code, 200);
  const { selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost } = preview.payload;
  const accepted = await workbench.post('/api/eval-runs/start', { ...selection,
    review: { selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost },
  }, reference);
  assert.equal(accepted.code, 202);
  assert.equal(accepted.payload.reference, reference);
  return String(accepted.payload.runId);
}

async function savedEvidence(workbench: Workbench, runId: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const status = await workbench.get(`/api/eval-runs/status?suiteId=offline&runId=${runId}`);
    if (status.code === 422) { await delay(20); continue; }
    assert.equal(status.code, 200);
    const summary = (status.payload.value as { summary: { state: string } }).summary;
    if (summary.state === 'completed') {
      const detail = await workbench.get(`/api/eval-runs/status?suiteId=offline&runId=${runId}&caseId=first&attempt=1`);
      assert.equal(detail.code, 200);
      assert.equal(detail.payload.status, 'ok');
      return (detail.payload.value as { evidenceStatus: string; evidence: { output: string } });
    }
    assert.ok(['queued', 'running'].includes(summary.state), `Unexpected saved state: ${summary.state}`);
    await delay(20);
  }
  assert.fail('Disposable run did not save evidence');
}

async function awaitFinishedEvents(lines: readonly string[], runIds: readonly string[]) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const finished = new Set(lines.flatMap(line => {
      try {
        const event = JSON.parse(line) as { event?: string; runId?: string };
        return event.event === 'eval_run_finished' && event.runId ? [event.runId] : [];
      } catch { return []; }
    }));
    if (runIds.every(runId => finished.has(runId))) return;
    await delay(20);
  }
  assert.fail('All disposable runs must finish persisting before fixture cleanup');
}

async function terminalStatus(workbench: Workbench, runId: string) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const response = await workbench.get(`/api/eval-runs/status?suiteId=offline&runId=${runId}`);
    if (response.code === 422) { await delay(50); continue; }
    assert.equal(response.code, 200);
    const summary = (response.payload.value as { summary: { state: string; outcome: string; diagnostics: string[] } }).summary;
    if (!['queued', 'running'].includes(summary.state)) return { response, summary };
    await delay(50);
  }
  assert.fail(`Run ${runId} did not reach a terminal state`);
}

test('disposable execute, status and History agree on every terminal outcome and safe causes', async () => {
  const terminal: string[] = [];
  const originalInfo = console.info;
  console.info = (line: unknown) => { if (typeof line === 'string') terminal.push(line); };
  try {
    await withOfflineWorkbench(async workbench => {
      const runIds: string[] = [];
      const cases = [
        { mode: 'complete', state: 'completed', outcome: 'passed', reason: undefined },
        { mode: 'assertion-failed', state: 'completed', outcome: 'failed', reason: undefined },
        { mode: 'partial', state: 'partial', outcome: 'incomplete', reason: 'runner-exited' },
        { mode: 'interrupted', state: 'interrupted', outcome: 'incomplete', reason: undefined },
        { mode: 'protocol-invalid', state: 'error', outcome: 'incomplete', reason: 'runner-protocol-invalid' },
        { mode: 'timeout', state: 'error', outcome: 'incomplete', reason: 'runner-timeout' },
      ];
      for (const [index, item] of cases.entries()) {
        await workbench.setRunnerMode(item.mode);
        const reference = `123e4567-e89b-42d3-a456-4266141741${String(index).padStart(2, '0')}`;
        const runId = await reviewedStart(workbench, reference);
        runIds.push(runId);
        const { response, summary } = await terminalStatus(workbench, runId);
        assert.equal(summary.state, item.state, item.mode);
        assert.equal(summary.outcome, item.outcome, item.mode);
        assert.equal(summary.diagnostics.includes(item.reason ?? ''), item.reason !== undefined, item.mode);
        const history = await workbench.get('/api/eval-runs/history?suiteId=offline');
        assert.equal(history.code, 200);
        const row = (history.payload.value as { runId: string; state: string; outcome: string }[]).find(row => row.runId === runId);
        assert.equal(row?.state, item.state, item.mode);
        assert.equal(row?.outcome, item.outcome, item.mode);
        const confirmed = await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${reference}`);
        assert.equal(confirmed.payload.runId, runId);
        assert.equal(confirmed.payload.reference, reference);
        if (item.mode === 'assertion-failed') {
          const detail = await workbench.get(`/api/eval-runs/status?suiteId=offline&runId=${runId}&caseId=first&attempt=1`);
          assert.equal((detail.payload.value as { evidence: { outcome: string } }).evidence.outcome, 'failed');
          assert.ok(!summary.diagnostics.includes('runner-timeout') && !summary.diagnostics.includes('runner-protocol-invalid'));
        }
        if (item.reason) assert.notEqual(response.payload.issue && (response.payload.issue as { stage: string }).stage, 'status');
        assert.doesNotMatch(JSON.stringify(response.payload) + JSON.stringify(history.payload), secret);
      }
      await awaitFinishedEvents(terminal, runIds);
      const events = terminal.map(line => { try { return JSON.parse(line) as Record<string, unknown>; } catch { return {}; } });
      const finished = events.filter(event => event.event === 'eval_run_finished');
      assert.equal(finished.length, cases.length);
      assert.equal(new Set(finished.map(event => event.runId)).size, cases.length);
      assert.ok(finished.every(event => typeof event.reference === 'string' && typeof event.runId === 'string'));
      assert.doesNotMatch(terminal.join('\n'), secret);
    }, undefined, { syntheticSecretInputs: true });
  } finally { console.info = originalInfo; }
});

test('status and History read faults recover without rewriting previous or legacy evidence', async () => {
  await withOfflineWorkbench(async workbench => {
    await workbench.setRunnerMode('complete');
    const runId = await reviewedStart(workbench, references.old);
    const prior = await savedEvidence(workbench, runId);
    const history = createRunHistory(workbench.projectRoot);
    const legacy = await history.store.create({ suiteId: 'offline', caseIds: ['first'], scope: 'all', testedModel: 'fake/available', judgeModel: null, repeats: 1 });
    assert.equal(legacy.status, 'ok');
    if (legacy.status !== 'ok') return;
    const legacyId = legacy.value.runId;
    assert.equal((await history.store.start('offline', legacyId)).status, 'ok');
    assert.equal((await history.store.append('offline', legacyId, { ...evidence(legacyId), suiteId: 'offline', caseId: 'first', diagnostics: ['input-unsafe'] })).status, 'ok');
    assert.equal((await history.store.finalize('offline', legacyId, 'blocked', ['input-unsafe'])).status, 'ok');
    const paths = new ArtifactPaths(workbench.projectRoot);
    const manifest = path.join(paths.artifactRoot, paths.run('offline', legacyId));
    const attempt = path.join(paths.artifactRoot, paths.attempt('offline', legacyId, 'first', 1));
    const before = await Promise.all([readFile(manifest), readFile(attempt)]);
    const legacyGet = () => workbench.get(`/api/eval-runs/status?suiteId=offline&runId=${legacyId}&caseId=first&attempt=1`);
    const first = await legacyGet();
    assert.equal(first.code, 200);
    assert.deepEqual((first.payload.value as { summary: { diagnostics: string[] } }).summary.diagnostics, ['input-unsafe']);
    const listed = await workbench.get('/api/eval-runs/history?suiteId=offline');
    assert.ok((listed.payload.value as { runId: string }[]).some(row => row.runId === legacyId));
    await writeFile(manifest, '{corrupt synthetic manifest');
    const fault = await legacyGet();
    assert.equal(fault.payload.status, 'blocked');
    assert.equal((fault.payload.issue as { stage: string }).stage, 'status');
    assert.equal((await workbench.get(`/api/eval-runs/status?suiteId=offline&runId=${runId}`)).code, 200);
    assert.equal((await savedEvidence(workbench, runId)).evidence.output, prior.evidence.output);
    await writeFile(manifest, before[0]!);
    const recovered = await legacyGet();
    assert.equal(recovered.code, 200);
    assert.equal((recovered.payload.value as { evidence: { diagnostics: string[] } }).evidence.diagnostics[0], 'input-unsafe');
    assert.deepEqual(await Promise.all([readFile(manifest), readFile(attempt)]), before);
    assert.doesNotMatch(JSON.stringify(first.payload) + JSON.stringify(fault.payload) + JSON.stringify(recovered.payload), secret);
  }, undefined, { syntheticSecretInputs: true });
});

test('lost response keeps one saved run, exact History association and prior evidence', async () => {
  const terminal: string[] = [];
  const originalError = console.error;
  const originalInfo = console.info;
  console.error = (line: unknown) => { if (typeof line === 'string') terminal.push(line); };
  console.info = (line: unknown) => { if (typeof line === 'string') terminal.push(line); };
  try {
    await withOfflineWorkbench(async workbench => {
      await workbench.setRunnerMode('complete');
      const ordinaryHtml = await workbench.getHtml();
      assert.match(ordinaryHtml, /data-start-notice hidden|data-start-notice="" hidden/);
      assert.match(ordinaryHtml, /data-results-container/);
      assert.doesNotMatch(ordinaryHtml, secret);

      const oldRunId = await reviewedStart(workbench, references.old);
      const oldEvidence = await savedEvidence(workbench, oldRunId);
      assert.equal(oldEvidence.evidenceStatus, 'available');
      assert.match(oldEvidence.evidence.output, /private synthetic prompt payload/);

      let lostStartRequests = 0;
      let retainedReference = references.lost;
      async function browserStartWithLostResponse() {
        lostStartRequests++;
        await reviewedStart(workbench, retainedReference);
        throw new Error('Synthetic response discarded after server acceptance');
      }
      await assert.rejects(browserStartWithLostResponse);
      assert.equal(lostStartRequests, 1);

      const unrelatedRunId = await reviewedStart(workbench, references.unrelated);
      const wrong = await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${references.unrelated}`);
      assert.equal(wrong.payload.status, 'confirmed');
      assert.equal(wrong.payload.runId, unrelatedRunId);
      assert.notEqual(wrong.payload.reference, retainedReference);
      await savedEvidence(workbench, unrelatedRunId);
      const absent = await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${references.absent}`);
      assert.equal(absent.payload.status, 'unconfirmed');
      await assert.rejects(async () => { throw new Error('Synthetic browser connection break before fetch'); });
      assert.equal((await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${references.absent}`)).payload.status, 'unconfirmed');

      const correlation = await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${retainedReference}`);
      assert.equal(correlation.payload.status, 'confirmed');
      assert.equal(correlation.payload.reference, retainedReference);
      const lostRunId = String(correlation.payload.runId);
      assert.notEqual(lostRunId, oldRunId);
      assert.notEqual(lostRunId, unrelatedRunId);
      const newEvidence = await savedEvidence(workbench, lostRunId);
      assert.equal(newEvidence.evidenceStatus, 'available');
      assert.match(newEvidence.evidence.output, /private synthetic prompt payload/);
      assert.equal((await savedEvidence(workbench, oldRunId)).evidence.output, oldEvidence.evidence.output);

      const history = await workbench.get('/api/eval-runs/history?suiteId=offline');
      assert.equal(history.payload.status, 'ok');
      const rows = history.payload.value as { runId: string }[];
      assert.deepEqual(new Set(rows.map(row => row.runId)), new Set([oldRunId, lostRunId, unrelatedRunId]));
      const queued = terminal.map(line => { try { return JSON.parse(line) as Record<string, unknown>; } catch { return {}; } })
        .filter(event => event.event === 'local_evals_workbench_run_start_queued' && event.reference === retainedReference);
      assert.equal(queued.length, 1);
      assert.equal(queued[0]?.runId, lostRunId);
      const background = terminal.map(line => { try { return JSON.parse(line) as Record<string, unknown>; } catch { return {}; } })
        .filter(event => event.event === 'eval_run_started' && event.reference === retainedReference);
      assert.equal(background.length, 1);
      assert.equal(background[0]?.runId, lostRunId);
      assert.doesNotMatch(terminal.join('\n'), secret);
      const preview = await workbench.post('/api/eval-runs/preview', selection);
      assert.equal(preview.code, 200);
      await workbench.setRunnerMode('no-models');
      const { selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost } = preview.payload;
      const blocked = await workbench.post('/api/eval-runs/start', { ...selection,
        review: { selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost },
      }, references.absent);
      assert.equal(blocked.code, 422);
      assert.equal(blocked.payload.status, 'blocked');
      const issue = blocked.payload.issue as { stage: string; outcome: string; category: string; reference: string; recoveryAction: string };
      assert.equal(issue.stage, 'run-start');
      assert.equal(issue.outcome, 'blocked');
      assert.equal(issue.category, 'model-unavailable');
      assert.equal(issue.reference, references.absent);
      assert.equal(issue.recoveryAction, 'edit-suites');
      const copied = `Stage: ${issue.stage}\nOutcome: ${issue.outcome}\nCategory: ${issue.category}\nReference: ${issue.reference}`;
      assert.doesNotMatch(JSON.stringify(blocked.payload) + copied, secret);
      assert.equal((await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${references.absent}`)).payload.status, 'unconfirmed');
      retainedReference = references.absent;
      assert.equal((await workbench.get(`/api/eval-runs/history?suiteId=offline&reference=${retainedReference}`)).payload.status, 'unconfirmed');
      await awaitFinishedEvents(terminal, [oldRunId, lostRunId, unrelatedRunId]);
    }, undefined, { syntheticSecretInputs: true });
  } finally { console.error = originalError; console.info = originalInfo; }
});
