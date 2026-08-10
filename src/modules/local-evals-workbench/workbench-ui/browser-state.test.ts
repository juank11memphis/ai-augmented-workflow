import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createWorkbenchViewModel } from './view-model.js';
import { createRunRequestPayload, failRun, finishRun, parseEvalRunResponse, selectModel, selectRunScope, selectSuite, startRun, type BrowserState } from './browser-state.js';

describe('browser-state', () => {
  it('resets run scope when changing suite', () => {
    const state = selectSuite(initialState({ type: 'test_case', testCaseId: 'one' }), 'prompt-drift');

    assert.equal(state.viewModel.selectedSuite.id, 'prompt-drift');
    assert.deepEqual(state.viewModel.runScope, { type: 'all' });
  });

  it('updates only the eval-run model selection', () => {
    const state = selectModel(initialState(), 'gpt-5-mini');

    assert.equal(state.viewModel.selectedEvalRunModel, 'gpt-5-mini');
    assert.equal(state.viewModel.selectedSuite.id, 'skill-authoring');
    assert.deepEqual(state.viewModel.runScope, { type: 'all' });
  });

  it('builds all-scope and one-test-case request payloads', () => {
    const all = createRunRequestPayload(initialState());
    const one = createRunRequestPayload(selectRunScope(initialState(), { type: 'test_case', testCaseId: 'names-artifact' }));

    assert.deepEqual(all, { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } });
    assert.deepEqual(one, { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'names-artifact' } });
  });

  it('transitions ready to running, passed, failed, blocked, and error summaries', () => {
    const running = startRun(initialState());
    assert.equal(running.viewModel.runButtonLabel, 'Running...');
    assert.equal(running.viewModel.controlsDisabled, true);
    assert.equal(finishRun(running, completedRun('passed')).viewModel.status, 'passed');
    assert.equal(finishRun(running, completedRun('failed')).viewModel.status, 'failed');
    assert.equal(finishRun(running, blockedRun()).viewModel.status, 'blocked');
    assert.equal(failRun(running).viewModel.status, 'error');
  });

  it('turns malformed endpoint responses into explicit errors', () => {
    const parsed = parseEvalRunResponse({ nope: true });

    assert.equal(parsed.status, 'error');
    assert.equal(parsed.diagnostics[0]?.code, 'invalid-eval-run-response');
  });
});

function initialState(runScope: { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string } = { type: 'all' }): BrowserState {
  return { viewModel: createWorkbenchViewModel({ discovery: discovery(), runScope }) };
}

function discovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [
    { id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
    { id: 'prompt-drift', name: 'Prompt drift checks', description: 'Checks prompt drift.', readyTestCaseCount: 1, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
  ], diagnostics: [] };
}

function completedRun(status: 'passed' | 'failed'): RunLocalEvalSuiteResult {
  return { status: 'completed', scope: 'all', matrix: { suiteId: 'skill-authoring', suiteName: 'Skill authoring checks', status, aggregates: { total: 1, passed: status === 'passed' ? 1 : 0, failed: status === 'failed' ? 1 : 0, blocked: 0, error: 0 }, diagnostics: [], rows: [] } };
}

function blockedRun(): RunLocalEvalSuiteResult {
  return { status: 'blocked', reason: 'runner-blocked', message: 'Runner blocked.', diagnostics: [] };
}
