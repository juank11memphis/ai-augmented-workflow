import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

const selected = { suiteId: 'suite', runId: 'run', testCaseId: 'case', attempt: 1, assertionId: 'failed', evalRunModelId: 'model', runScope: { type: 'all' } };
const proposal = { proposalId: 'proposal', affectedProjectFiles: ['prompts/agent.md'], changeSummary: 'Require owner verification',
  rationale: 'The selected trace skipped the ownership check.', expectedEvalImpact: 'The failed check should pass after rerun.',
  proposedChange: { kind: 'unified-diff', representation: '--- a/prompts/agent.md\n+++ b/prompts/agent.md\n@@ -1 +1 @@\n-Refund now\n+Verify owner first' } };
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

function harness(post: (url: string, body: Record<string, unknown>) => Promise<unknown>) {
  type ClickEvent = { target: { closest(): { dataset: { action: string } } | null } };
  const events: Record<string, (event: ClickEvent) => void> = {};
  const host = { innerHTML: '', closest: () => null, querySelector: () => null };
  const document = { activeElement: null, querySelectorAll: () => [host], addEventListener: (kind: string, listener: (event: ClickEvent) => void) => { events[kind] = listener; } };
  const context = { document, post, esc, latestRun: () => true, suite: { id: 'suite' }, run: { judgeModel: null, repeats: 2 },
    setup: {}, strictRuntimeChoices: false, loadRuntime: async (): Promise<void> => undefined, showSetup: () => undefined };
  const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + ';({ setSelection(value){selectedFailure=value;}, requestRepair, resetRepair, markup:repairMarkup, stage:()=>repairStage, rerunAfterRepair })', context) as {
    setSelection(value: unknown): void; requestRepair(kind: string): Promise<void>; resetRepair(): void; markup(): string; stage(): string; rerunAfterRepair(scope: string): Promise<void>;
  };
  api.setSelection(selected);
  return { api, context, events };
}

test('proposal review shows exact decision context and sends identity plus explicit approval only', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const { api } = harness(async (url, body) => {
    calls.push({ url, body });
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'applied', changedFiles: [{ path: 'prompts/agent.md', summary: 'Require owner verification' }], rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'suite', testCaseId: 'case', evalRunModelId: 'model' }, alternateActions: [{ scope: 'suite', suiteId: 'suite', evalRunModelId: 'model' }] } };
    return { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis');
  await api.requestRepair('proposal');
  const review = api.markup();
  for (const text of ['prompts/agent.md', 'Show full diff', 'Rationale', 'Expected impact', 'Approve and apply', 'Not now']) assert.match(review, new RegExp(text));
  assert.equal(calls.length, 2, 'draft and focus never approve');
  await api.requestRepair('apply');
  assert.deepEqual(Object.keys(calls[2]!.body).sort(), ['approvalMarker', 'assertionId', 'attempt', 'proposalId', 'runId', 'suiteId', 'testCaseId']);
  assert.match(api.markup(), /not verified until you rerun/);
  assert.match(api.markup(), /Require owner verification/);
  assert.equal(api.stage(), 'applied');
});

test('uncertain application is not automatically resubmitted and stale proposal replies do not cross selections', async () => {
  let resolveDraft: (value: unknown) => void = () => undefined;
  let applies = 0;
  const { api } = harness(async url => {
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) { applies++; throw new Error('connection lost'); }
    return new Promise(resolve => { resolveDraft = resolve; });
  });
  await api.requestRepair('analysis');
  const pending = api.requestRepair('proposal');
  api.resetRepair();
  api.setSelection({ ...selected, assertionId: 'other' });
  resolveDraft({ status: 'proposal-ready', proposal });
  await pending;
  assert.doesNotMatch(api.markup(), /Approve and apply/);
  api.resetRepair(); api.setSelection(selected);
  await api.requestRepair('analysis');
  const second = api.requestRepair('proposal'); resolveDraft({ status: 'proposal-ready', proposal }); await second;
  await api.requestRepair('apply');
  assert.equal(api.stage(), 'apply-uncertain');
  assert.doesNotMatch(api.markup(), /data-action="approve-repair"/);
  assert.equal(applies, 1);
});

test('failed application displays affected and leftover temporary paths without claiming success', async () => {
  const { api } = harness(async url => {
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'error', message: 'The repair failed. Inspect affected paths.',
      changedFiles: [{ path: 'prompts/agent.md' }, { path: 'prompts/agent.md.sibu-unsafe<name>.tmp' }] };
    return { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
  const markup = api.markup();
  assert.equal(api.stage(), 'apply-uncertain');
  assert.match(markup, /Paths to inspect — application did not complete/);
  assert.match(markup, /prompts\/agent\.md\.sibu-unsafe&lt;name&gt;\.tmp/);
  assert.doesNotMatch(markup, /Repair applied|Rerun this case|data-action="approve-repair"/);
});

test('case and suite rerun actions only prefill setup; neither starts a run', async () => {
  const urls: string[] = [];
  const { api, context } = harness(async url => {
    urls.push(url);
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'applied', changedFiles: [{ path: 'prompts/agent.md', summary: 'Require owner verification' }],
      rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'suite', testCaseId: 'case', evalRunModelId: 'model' },
        alternateActions: [{ scope: 'suite', suiteId: 'suite', evalRunModelId: 'model' }] } };
    return { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
  await api.rerunAfterRepair('case');
  assert.deepEqual(JSON.parse(JSON.stringify(context.setup)), { scope: 'one', caseId: 'case', model: 'model', judgeModel: '', repeats: 2 });
  assert.equal(context.strictRuntimeChoices, true);
  assert.equal(urls.filter(url => url.includes('/eval-runs/')).length, 0);
  api.setSelection(selected);
  await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
  await api.rerunAfterRepair('suite');
  assert.equal((context.setup as { scope: string }).scope, 'all');
  assert.equal(urls.filter(url => url.includes('/eval-runs/')).length, 0);
});

test('cancelled or superseded rerun does not reopen setup after runtime loads', async () => {
  const { api, context } = harness(async url => {
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'applied', changedFiles: [{ path: 'prompts/agent.md' }],
      rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'suite', testCaseId: 'case', evalRunModelId: 'model' } } };
    return { status: 'proposal-ready', proposal };
  });
  let opened = 0;
  context.showSetup = () => { opened++; };
  for (const superseded of [false, true]) {
    api.setSelection(selected);
    await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
    let finishLoad: () => void = () => undefined;
    context.loadRuntime = () => new Promise<void>(resolve => { finishLoad = resolve; });
    const pending = api.rerunAfterRepair('case');
    api.resetRepair();
    if (superseded) api.setSelection({ ...selected, assertionId: 'other' });
    finishLoad();
    await pending;
    assert.equal(opened, 0);
  }
});

test('Not now returns to analysis without sending approval', async () => {
  const urls: string[] = [];
  const { api, events } = harness(async url => {
    urls.push(url);
    return url.includes('failure-analysis') ? { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } }
      : { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis'); await api.requestRepair('proposal');
  events.click?.({ target: { closest: () => ({ dataset: { action: 'reject-repair' } }) } });
  assert.equal(api.stage(), 'analysis');
  assert.match(api.markup(), /Draft repair/);
  assert.equal(urls.length, 2);
});
