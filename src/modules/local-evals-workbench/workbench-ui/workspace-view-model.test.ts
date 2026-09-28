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
