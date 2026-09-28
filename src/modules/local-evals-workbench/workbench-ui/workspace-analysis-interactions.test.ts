import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

const selection = (assertionId: string) => ({ suiteId: 'suite', runId: 'run', testCaseId: 'case', attempt: 2,
  assertionId, evalRunModelId: 'model', runScope: { type: 'all' } });
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!);

function harness(post: (url: string, body: unknown) => Promise<unknown>) {
  const host = { innerHTML: '' };
  const document = { activeElement: null, querySelectorAll: () => [host], addEventListener() {} };
  const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + ';({ setSelection(value){selectedFailure=value;}, resetRepair, requestRepair, markup:repairMarkup, stage:()=>repairStage })',
    { document, post, esc: escape, latestRun: () => true, suite: { id: 'suite' }, run: { judgeModel: null, repeats: 2 } }) as {
      setSelection(value: unknown): void; resetRepair(): void; requestRepair(kind: string): Promise<void>; markup(): string; stage(): string;
    };
  api.setSelection(selection('a'));
  return api;
}

test('unavailable credentials and provider errors keep explicit recovery instead of an automatic retry', async () => {
  let calls = 0;
  const api = harness(async () => { calls++; return calls === 1 ? { status: 'analysis-unavailable', message: 'No key' }
    : calls === 2 ? { status: 'error', message: 'Provider failed' }
      : { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue', exactFailureExplanation: 'Fixed?', evidenceSummary: 'Selected', uncertainty: 'Low' } }; });
  await api.requestRepair('analysis');
  assert.equal(api.stage(), 'unavailable');
  assert.match(api.markup(), /OpenAI API key|Check again/);
  assert.equal(calls, 1);
  await api.requestRepair('analysis');
  assert.equal(api.stage(), 'retryable-error');
  assert.match(api.markup(), /Retry analysis/);
  assert.equal(calls, 2);
  await api.requestRepair('analysis');
  assert.equal(api.stage(), 'analysis');
  assert.match(api.markup(), /Fixed\?/);
});

test('A to B to A discards both late analysis success and failure', async () => {
  const pending: ((value: unknown) => void)[] = [];
  const api = harness(async () => new Promise(resolve => { pending.push(resolve); }));
  const old = api.requestRepair('analysis');
  assert.equal(api.stage(), 'loading');
  api.resetRepair(); api.setSelection(selection('b'));
  const middle = api.requestRepair('analysis');
  api.resetRepair(); api.setSelection(selection('a'));
  const current = api.requestRepair('analysis');
  pending[0]!({ status: 'analysis-ready', analysisId: 'old', analysis: { exactFailureExplanation: 'OLD', likelyCause: 'prompt_issue' } });
  pending[1]!({ status: 'error', message: 'MIDDLE' });
  await Promise.all([old, middle]);
  assert.equal(api.stage(), 'loading');
  assert.doesNotMatch(api.markup(), /OLD|MIDDLE/);
  pending[2]!({ status: 'analysis-ready', analysisId: 'current', analysis: { exactFailureExplanation: 'CURRENT', likelyCause: 'prompt_issue', evidenceSummary: 'Selected', uncertainty: 'Low' } });
  await current;
  assert.match(api.markup(), /CURRENT/);
});
