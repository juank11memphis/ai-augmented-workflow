import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

const selection = (assertionId: string) => ({ suiteId: 'suite', runId: 'run', testCaseId: 'case', attempt: 2,
  assertionId, evalRunModelId: 'model', runScope: { type: 'all' } });
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!);

const reference = '123e4567-e89b-42d3-a456-426614174000';
const issue = (category: string, outcome = category === 'missing-openai-api-key' ? 'blocked' : 'failed') =>
  ({ stage: 'analysis', outcome, category, reference, title: 'UNTRUSTED', explanation: 'sk-secret', nextStep: 'PRIVATE OUTPUT' });

function harness(post: (url: string, body: unknown) => Promise<unknown>, clipboard?: { writeText(value: string): Promise<void> }) {
  const listeners = new Map<string, (event: { target: { closest(): { dataset: { action: string } } } }) => void>();
  const feedback = { textContent: '', replaceChildren(value: string) { this.textContent = value; } };
  const resultRegion = { innerHTML: '<h2>Results</h2><h2>History</h2><p>FAILED ASSERTION / PRIVATE OUTPUT</p>' };
  const button = { focus() { document.activeElement = { dataset: { action: 'analyze-failure' } }; } };
  const heading = { focus() { document.activeElement = { dataset: {} }; } };
  const host = { innerHTML: '', closest: () => null, querySelector: (value: string) => value.includes('analyze-failure') ? button : heading };
  const document = { activeElement: null as null | { dataset: { action?: string } }, querySelectorAll: () => [host],
    querySelector: (value: string) => value.includes('copy-status') ? feedback : null,
    addEventListener(name: string, listener: (event: { target: { closest(): { dataset: { action: string } } } }) => void) { listeners.set(name, listener); } };
  const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + ';({ setSelection(value){selectedFailure=value;}, resetRepair, requestRepair, markup:repairMarkup, stage:()=>repairStage })',
    { document, navigator: clipboard ? { clipboard } : {}, post, esc: escape, latestRun: () => true, suite: { id: 'suite' }, run: { judgeModel: null, repeats: 2 } }) as {
      setSelection(value: unknown): void; resetRepair(): void; requestRepair(kind: string): Promise<void>; markup(): string; stage(): string;
    };
  api.setSelection(selection('a'));
  return { api, host, resultRegion, document, feedback, click: (action: string) => listeners.get('click')?.({ target: { closest: () => ({ dataset: { action } }) } }) };
}

test('unavailable credentials and provider errors keep explicit recovery instead of an automatic retry', async () => {
  let calls = 0;
  const { api } = harness(async () => { calls++; return calls === 1 ? { status: 'analysis-unavailable', reason: 'missing-openai-api-key', issue: issue('missing-openai-api-key'), message: 'No key' }
    : calls === 2 ? { status: 'error', reason: 'provider-authorization', issue: issue('provider-authorization'), message: 'Provider failed' }
      : { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue', exactFailureExplanation: 'Fixed?', evidenceSummary: 'Selected', uncertainty: 'Low' } }; });
  await api.requestRepair('analysis');
  assert.equal(api.stage(), 'unavailable');
  assert.match(api.markup(), /OpenAI API key|Try analysis again/);
  assert.equal(calls, 1);
  await api.requestRepair('analysis');
  assert.equal(api.stage(), 'retryable-error');
  assert.match(api.markup(), /authorization failed|Try analysis again/);
  assert.equal(calls, 2);
  await api.requestRepair('analysis');
  assert.equal(api.stage(), 'analysis');
  assert.match(api.markup(), /Fixed\?/);
});

test('A to B to A discards both late analysis success and failure', async () => {
  const pending: ((value: unknown) => void)[] = [];
  const { api } = harness(async () => new Promise(resolve => { pending.push(resolve); }));
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

test('known provider and invalid-response categories show separate inline remedies without raw content', async () => {
  for (const [category, wording] of [['provider-authorization', 'credentials'], ['provider-rate-limit', 'Wait'],
    ['provider-timeout', 'respond in time'], ['provider-unavailable', 'service availability'],
    ['invalid-llm-response', 'response could not be used'], ['llm-failure', 'provider cause is unknown']] as const) {
    const { api } = harness(async () => ({ status: 'error', reason: category, issue: issue(category), message: 'PRIVATE OUTPUT sk-secret' }));
    await api.requestRepair('analysis');
    assert.match(api.markup(), new RegExp(wording));
    assert.match(api.markup(), /data-analysis-notice.*Try analysis again.*data-analysis-issue-details/s);
    assert.doesNotMatch(api.markup(), /PRIVATE OUTPUT|sk-secret|UNTRUSTED/);
  }
});

test('all blocked analysis categories retain selected evidence and Results/History while guidance changes', async () => {
  for (const category of ['missing-openai-api-key', 'invalid-scope', 'missing-artifact', 'missing-cell',
    'missing-assertion', 'non-failed-assertion', 'invalid-request']) {
    const status = category === 'missing-openai-api-key' ? 'analysis-unavailable' : 'blocked';
    const { api, host, resultRegion } = harness(async () => ({ status, reason: category, issue: issue(category, 'blocked'), message: 'PRIVATE OUTPUT' }));
    await api.requestRepair('analysis');
    assert.match(host.innerHTML, /data-analysis-notice.*Try analysis again/s);
    assert.match(host.innerHTML, /data-analysis-issue-details/);
    assert.equal(resultRegion.innerHTML, '<h2>Results</h2><h2>History</h2><p>FAILED ASSERTION / PRIVATE OUTPUT</p>');
    assert.doesNotMatch(host.innerHTML, /PRIVATE OUTPUT/);
  }
});

test('unknown, mismatched and malformed issues are not trusted or copied', async () => {
  for (const response of [
    { status: 'error', reason: 'unknown', issue: issue('unknown') },
    { status: 'error', reason: 'provider-timeout', issue: issue('provider-authorization') },
    { status: 'error', reason: 'provider-timeout', issue: { ...issue('provider-timeout'), reference: 'sk-secret' } },
    { status: 'error', reason: 'provider-timeout', issue: { ...issue('provider-timeout'), stage: 'execution' } },
  ]) {
    const { api } = harness(async () => response);
    await api.requestRepair('analysis');
    assert.doesNotMatch(api.markup(), /sk-secret|UNTRUSTED|PRIVATE OUTPUT/);
    if (response.issue.category !== 'unknown') assert.match(api.markup(), /Cause unknown/);
  }
});

test('copy uses only validated fields and failure leaves details selectable without changing focus', async () => {
  const copied: string[] = [];
  const { api, click, feedback, document } = harness(async () => ({ status: 'error', reason: 'provider-timeout', issue: issue('provider-timeout') }),
    { writeText: async value => { copied.push(value); throw Error('denied'); } });
  document.activeElement = { dataset: { action: 'analyze-failure' } };
  await api.requestRepair('analysis');
  assert.equal(document.activeElement?.dataset.action, 'analyze-failure');
  assert.equal((api.markup().match(/role="status"/g) || []).length, 1);
  click('copy-analysis-issue');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied[0], 'Stage: analysis\nOutcome: failed\nCategory: provider-timeout\nReference: ' + reference);
  assert.match(api.markup(), /<pre data-analysis-issue-details>Stage: analysis/);
  assert.match(feedback.textContent, /Select the issue details above/);
});

test('copy confirms success and missing clipboard keeps safe details readable', async () => {
  let copied = '';
  const response = async () => ({ status: 'error', reason: 'provider-rate-limit', issue: issue('provider-rate-limit') });
  const success = harness(response, { writeText: async value => { copied = value; } });
  await success.api.requestRepair('analysis'); success.click('copy-analysis-issue');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(copied, /Category: provider-rate-limit/);
  assert.equal(success.feedback.textContent, 'Issue details copied.');
  const absent = harness(response);
  await absent.api.requestRepair('analysis'); absent.click('copy-analysis-issue');
  assert.match(absent.feedback.textContent, /Select the issue details above/);
  assert.match(absent.api.markup(), /data-analysis-issue-details/);
});

test('lost response is a communication failure and cannot imply a provider outcome', async () => {
  const { api } = harness(async () => { throw Error('private provider body'); });
  await api.requestRepair('analysis');
  assert.match(api.markup(), /couldn&#39;t reach the analysis service|couldn.t reach the analysis service/);
  assert.match(api.markup(), /matching terminal event may not exist/);
  assert.doesNotMatch(api.markup(), /provider body|provider rejected|data-analysis-issue-details/);
});
