import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { Manifest } from '../run-history/contracts.js';
import { createWorkspaceViewModel } from './workspace-view-model.js';

const discovery: EvalSuiteDiscoveryResult = {
  status: 'ready', diagnostics: [], suites: [{
    id: 'suite', name: 'Support agent', description: 'Synthetic suite', readyTestCaseCount: 2,
    testCases: [{ id: 'safe', name: 'Safe response' }, { id: 'unsafe', name: 'Unsafe response' }],
    modelOptions: [], coverage: { categories: [{ id: 'safety', status: 'partly-covered', reason: 'No live tools.' }], gaps: [{ id: 'outage', reason: 'Synthetic tools only.' }] },
  }],
};
const run: Manifest = {
  version: 1, runId: 'run-1', suiteId: 'suite', caseIds: ['safe', 'unsafe'], scope: 'all',
  testedModel: 'one-model', judgeModel: null, repeats: 1, state: 'partial',
  owner: { pid: 1, token: 'x' }, createdAt: 1, updatedAt: 2, finishedAt: 2,
  outcome: 'incomplete', calls: null, cost: null, diagnostics: [],
  cases: [
    { caseId: 'safe', state: 'completed', attempts: [{ number: 1, outcome: 'passed', durationMs: 1, calls: 1, cost: null }] },
    { caseId: 'unsafe', state: 'not-run', attempts: [] },
  ],
};

it('models empty, ready, partial and read-only historical states without false passes', () => {
  assert.equal(createWorkspaceViewModel({ discovery: { status: 'blocked', reason: 'missing-evals-folder', message: 'No suites', guidance: [], suites: [], diagnostics: [] } }).state, 'empty');
  assert.equal(createWorkspaceViewModel({ discovery }).state, 'ready');
  const model = createWorkspaceViewModel({ discovery, run, history: [
    { runId: 'run-2', suiteId: 'suite', state: 'completed', createdAt: 3, updatedAt: 3, finishedAt: 3, outcome: 'passed', testedModel: 'one-model', judgeModel: null, scope: 'all', repeats: 1, calls: 2, cost: null },
  ] });
  assert.equal(model.state, 'partial');
  assert.equal(model.historical, true);
  assert.equal(model.passed, 1);
  assert.equal(model.unfinished, 1);
  assert.equal(model.cases[1]?.status, 'not-run');
  assert.equal(model.suite?.coverage?.gaps[0]?.reason, 'Synthetic tools only.');
});

it('uses persisted run scope and retains historical cases removed from the current suite', () => {
  const selected = { ...run, caseIds: ['safe'], scope: 'selected' as const, cases: [run.cases[0]!] };
  const model = createWorkspaceViewModel({ discovery, run: selected });
  assert.equal(model.progress, '1/1 complete');
  assert.equal(model.unfinished, 0);
  assert.equal(model.excluded, 1);
  assert.equal(model.cases.find(item => item.id === 'unsafe')?.status, 'excluded');
  const historic = createWorkspaceViewModel({ discovery, run: { ...run, caseIds: ['retired'], cases: [{ ...run.cases[0]!, caseId: 'retired' }] } });
  assert.equal(historic.cases[0]?.name, 'retired');
  assert.equal(historic.progress, '1/1 complete');
});

it('distinguishes empty discovery from unreadable suites without exposing diagnostics', () => {
  const blocked = (reason: 'no-eval-suites' | 'unreadable-eval-suites') => createWorkspaceViewModel({
    discovery: { status: 'blocked', reason, message: 'sk-secret', guidance: ['private content'], suites: [], diagnostics: [] },
  });
  assert.equal(blocked('no-eval-suites').discoveryNotice?.title, 'No eval suites found');
  assert.match(blocked('no-eval-suites').discoveryNotice?.nextStep ?? '', /Add an eval suite/);
  assert.match(blocked('unreadable-eval-suites').discoveryNotice?.title ?? '', /couldn't read/);
  assert.match(blocked('unreadable-eval-suites').discoveryNotice?.nextStep ?? '', /Check the local eval workspace/);
  assert.doesNotMatch(JSON.stringify(blocked('unreadable-eval-suites').discoveryNotice), /sk-secret|private content/);
});

it('projects authoritative selected-scope progress across queued, running, and terminal outcomes', () => {
  const selected = { ...run, caseIds: ['safe', 'unsafe'], cases: [run.cases[0]!] };
  for (const state of ['queued', 'running', 'completed', 'partial', 'interrupted', 'blocked', 'error'] as const) {
    const model = createWorkspaceViewModel({ discovery, run: { ...selected, state, finishedAt: null } });
    assert.equal(model.state, state);
    assert.equal(model.progress, '1/2 complete');
    assert.equal(model.unfinished, 1);
    assert.equal(model.cases[1]?.status, 'not-run');
    assert.equal(model.durationMs, null);
    assert.equal(model.cost, null);
  }
  const active = createWorkspaceViewModel({ discovery, run: { ...run, state: 'running', cases: [
    { ...run.cases[0]!, state: 'incomplete', attempts: [] }, run.cases[1]!,
  ] } });
  assert.equal(active.cases[0]?.status, 'running');
  assert.equal(active.progress, '0/2 complete');
  assert.equal(createWorkspaceViewModel({ discovery, run }).durationMs, 1);
});

it('counts attempts and failures, excludes unselected cases, and never projects private evidence', () => {
  const privateRun = { ...run, scope: 'selected' as const, caseIds: ['safe'], diagnostics: ['private output'],
    cost: null, cases: [{ ...run.cases[0]!, attempts: [
      { number: 1, outcome: 'failed' as const, durationMs: 1, calls: null, cost: null, output: 'private output' },
      { number: 2, outcome: 'passed' as const, durationMs: 1, calls: null, cost: null },
    ] }] };
  const model = createWorkspaceViewModel({ discovery, run: privateRun, history: [
    { runId: 'newer', suiteId: 'suite', state: 'completed', createdAt: 3, updatedAt: 3, finishedAt: 3,
      outcome: 'passed', testedModel: 'one-model', judgeModel: null, scope: 'all', repeats: 1, calls: 2, cost: null },
  ] });
  assert.equal(model.historical, true);
  assert.deepEqual([model.passed, model.failed, model.unfinished, model.excluded], [0, 1, 0, 1]);
  assert.deepEqual([model.cases[0]?.status, model.cases[0]?.attempts, model.cases[0]?.failedChecks], ['failed', 2, 1]);
  assert.equal(model.cases[1]?.status, 'excluded');
  assert.equal(model.progress, '1/1 complete');
  assert.doesNotMatch(JSON.stringify({ cases: model.cases, progress: model.progress, statusText: model.statusText }), /private output/);
});
