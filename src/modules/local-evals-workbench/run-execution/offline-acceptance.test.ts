import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from '../start-local-evals-workbench/local-server-starter.js';
import { offlineProject } from './offline-project-fixture.js';

test('offline target execution persists real output and changed integration changes assertion verdict', async () => {
  const project = await offlineProject();
  try {
    const discovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot: project.root },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
    assert.equal(discovery.status, 'ready');
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: project.root, initialDiscoveryResult: discovery });
    const post = async (url: string, body: unknown) => {
      const response = await fetch(new URL(url, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { code: response.status, value: await response.json() as Record<string, unknown> };
    };
    const get = async (suiteId: string, runId: string, caseId?: string) => {
      const query = new URLSearchParams({ suiteId, runId, ...(caseId ? { caseId, attempt: '1' } : {}) });
      const response = await fetch(new URL('/api/eval-runs/status?' + query, server.url));
      return await response.json() as { status: string; value: { summary: { state: string }; evidence?: { output: string; outcome: string;
        assertions: { id: string; outcome: string; diagnostics: string[] }[] } } };
    };
    const terminal = async (runId: string) => {
      for (let tries = 0; tries < 150; tries++) {
        const status = await get('offline', runId);
        if (status.status === 'ok' && !['queued', 'running'].includes(status.value.summary.state)) {
          try {
            const index = JSON.parse(await readFile(path.join(project.root, 'evals/artifacts/offline/index.json'), 'utf8')) as {
              entries: { runId: string; state: string }[];
            };
            if (index.entries.some(entry => entry.runId === runId && entry.state === status.value.summary.state)) return status;
          } catch { /* Atomic index update is still in flight. */ }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.fail('Run did not reach a persisted terminal state.');
    };
    const before = project.git('status', '--porcelain');
    try {
      const command = { suiteId: 'offline', scope: { type: 'all' }, model: 'fake', repeats: 1, judgeModel: null };
      const preview = await post('/api/eval-runs/preview', command);
      assert.equal(preview.code, 200);
      const review = preview.value;
      const start = await post('/api/eval-runs/start', { ...command, review: { selectedCaseIds: review.selectedCaseIds, targetCalls: review.targetCalls,
        judgeCalls: review.judgeCalls, totalCalls: review.totalCalls, cost: review.cost } });
      assert.equal(start.code, 202, JSON.stringify(start.value));
      const runId = start.value.runId as string;
      const oneCommand = { ...command, scope: { type: 'test_case', testCaseId: 'first' } };
      const onePreview = await post('/api/eval-runs/preview', oneCommand);
      assert.equal(onePreview.code, 200);
      const oneReview = onePreview.value;
      const parallelStart = await post('/api/eval-runs/start', { ...oneCommand, review: { selectedCaseIds: oneReview.selectedCaseIds,
        targetCalls: oneReview.targetCalls, judgeCalls: oneReview.judgeCalls, totalCalls: oneReview.totalCalls, cost: oneReview.cost } });
      assert.equal(parallelStart.code, 202);
      assert.notEqual(parallelStart.value.runId, runId);
      const status = await terminal(runId);
      assert.equal(status.value.summary.state, 'completed');
      const detail = await get('offline', runId, 'first');
      assert.match(detail.value.evidence!.output, /fake:GOOD:SYNTHETIC_SECRET_SENTINEL-first/);
      assert.equal(detail.value.evidence!.outcome, 'passed');
      const schemaDetail = await get('offline', runId, 'schema');
      assert.match(schemaDetail.value.evidence!.output, /SYNTHETIC_SECRET_SENTINEL-schema/);
      assert.deepEqual(schemaDetail.value.evidence!.assertions.map(({ id, outcome, diagnostics }) => ({ id, outcome, diagnostics })), [
        { id: 'basic', outcome: 'passed', diagnostics: [] },
        { id: 'unsupported', outcome: 'failed', diagnostics: ['unsupported-schema'] },
      ]);
      const one = await terminal(parallelStart.value.runId as string);
      assert.equal(one.value.summary.state, 'completed');
      await project.changeTarget();
      const second = await post('/api/eval-runs/start', { ...command, review: { selectedCaseIds: review.selectedCaseIds, targetCalls: review.targetCalls,
        judgeCalls: review.judgeCalls, totalCalls: review.totalCalls, cost: review.cost } });
      assert.equal(second.code, 202);
      assert.notEqual(second.value.runId, runId);
      const changed = await terminal(second.value.runId as string);
      assert.equal(changed.value.summary.state, 'completed');
      const changedDetail = await get('offline', second.value.runId as string, 'first');
      assert.match(changedDetail.value.evidence!.output, /fake:BAD:/);
      assert.equal(changedDetail.value.evidence!.outcome, 'failed');
      const changedSchema = await get('offline', second.value.runId as string, 'schema');
      assert.equal(changedSchema.value.evidence!.assertions.find(assertion => assertion.id === 'basic')?.outcome, 'failed');
      await project.crashOnSecond();
      const crashed = await post('/api/eval-runs/start', { ...command, review: { selectedCaseIds: review.selectedCaseIds, targetCalls: review.targetCalls,
        judgeCalls: review.judgeCalls, totalCalls: review.totalCalls, cost: review.cost } });
      assert.equal(crashed.code, 202);
      const partial = await terminal(crashed.value.runId as string);
      assert.equal(partial.value.summary.state, 'partial');
      const retained = await get('offline', crashed.value.runId as string, 'first');
      assert.equal(retained.value.evidence?.outcome, 'passed');
      assert.equal(project.git('status', '--porcelain').replace(' M src/target.mjs\n', ''), before);
    } finally { await server.stop?.(); }
  } finally { await project.cleanup(); }
});
