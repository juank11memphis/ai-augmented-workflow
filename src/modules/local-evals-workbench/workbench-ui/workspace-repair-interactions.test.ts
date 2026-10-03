import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

const selected = { suiteId: 'suite', runId: 'run', testCaseId: 'case', attempt: 1, assertionId: 'failed', evalRunModelId: 'model', runScope: { type: 'all' } };
const proposal = { proposalId: 'proposal', affectedProjectFiles: ['prompts/agent.md'], changeSummary: 'Require owner verification',
  rationale: 'The selected trace skipped the ownership check.', expectedEvalImpact: 'The failed check should pass after rerun.',
  proposedChange: { kind: 'unified-diff', representation: '--- a/prompts/agent.md\n+++ b/prompts/agent.md\n@@ -1 +1 @@\n-Refund now\n+Verify owner first' } };
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

function harness(post: (url: string, body: Record<string, unknown>) => Promise<unknown>, clipboard?: { writeText(value: string): Promise<void> }) {
  type ClickEvent = { target: { closest(): { dataset: { action: string } } | null } };
  const events: Record<string, (event: ClickEvent) => void> = {};
  const feedback = { textContent: '', replaceChildren(value: string) { this.textContent = value; } };
  const document = { activeElement: null as null | { dataset?: { action?: string }; focusName?: string },
    querySelectorAll: () => [host], querySelector: (value: string) => /(?:proposal|apply)-copy-status/.test(value) ? feedback : null,
    addEventListener: (kind: string, listener: (event: ClickEvent) => void) => { events[kind] = listener; } };
  const host = { innerHTML: '', closest: () => null, querySelector: (value: string) => {
    if (value.includes('data-proposal-announcement')) return { replaceChildren() { host.innerHTML = host.innerHTML.replace(/(<span class="live" role="status" data-proposal-announcement>).*?(<\/span>)/, '$1$2'); } };
    if (value.includes('data-action=') && !host.innerHTML.includes(value.slice(1, -1))) return null;
    return { focus() { document.activeElement = { dataset: { action: value.match(/data-action="([^"]+)/)?.[1] }, focusName: value }; } };
  } };
  const context = { document, navigator: clipboard ? { clipboard } : {}, post, esc, latestRun: () => true, suite: { id: 'suite' }, run: { judgeModel: null, repeats: 2 },
    setup: {}, strictRuntimeChoices: false, loadRuntime: async (): Promise<void> => undefined, showSetup: () => undefined };
  const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + ';({ setSelection(value){selectedFailure=value;}, requestRepair, resetRepair, markup:repairMarkup, stage:()=>repairStage, rerunAfterRepair })', context) as {
    setSelection(value: unknown): void; requestRepair(kind: string): Promise<void>; resetRepair(): void; markup(): string; stage(): string; rerunAfterRepair(scope: string): Promise<void>;
  };
  api.setSelection(selected);
  return { api, context, events, host, feedback, click: (action: string) => events.click?.({ target: { closest: () => ({ dataset: { action } }) } }) };
}

const reference = '123e4567-e89b-42d3-a456-426614174000';
const privateText = 'sk-secret PRIVATE_FILE_CONTENT PRIVATE_PROVIDER_BODY PRIVATE_PROPOSAL PRIVATE_ERROR';
const proposalIssue = (category: string, outcome: string) => ({ stage: 'proposal', outcome, category, reference,
  title: privateText, explanation: privateText, nextStep: privateText });
const analysis = { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue',
  exactFailureExplanation: 'Selected check failed', evidenceSummary: 'Retained selected evidence', uncertainty: 'Low' } };
const draftResponse = (status: string, category: string, outcome: string) => ({ status, reason: category,
  issue: proposalIssue(category, outcome), message: privateText, evidence: { output: privateText }, proposal: { changeSummary: privateText } });
const applyResponse = (status: 'blocked' | 'error', category: string) => ({ status, reason: category,
  issue: { stage: 'repair-apply', outcome: status === 'blocked' ? 'blocked' : 'uncertain', category, reference,
    title: privateText, explanation: privateText, nextStep: privateText }, message: privateText,
  changedFileCount: 99, changedFiles: [{ path: 'PRIVATE_PATH', content: privateText }] });
const safeApplyDetails = (markup: string) => markup.match(/<pre data-apply-issue-details>(.*?)<\/pre>/s)?.[1];
async function reachApply(response: unknown, clipboard?: { writeText(value: string): Promise<void> }) {
  const urls: string[] = [];
  const browser = harness(async url => { urls.push(url); if (url.endsWith('/apply') && response instanceof Error) throw response;
    return url.includes('failure-analysis') ? analysis : url.endsWith('/apply') ? response : { status: 'proposal-ready', proposal: { ...proposal, changeSummary: privateText,
      affectedProjectFiles: ['PRIVATE_PROPOSAL_PATH'], proposedChange: { ...proposal.proposedChange, representation: privateText } } }; }, clipboard);
  await browser.api.requestRepair('analysis'); await browser.api.requestRepair('proposal'); await browser.api.requestRepair('apply');
  return { ...browser, urls };
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

test('all proposal categories show specific safe guidance beside retained analysis without apply', async () => {
  const cases = [
    ['proposal-unavailable', 'missing-openai-api-key', 'blocked', 'local OpenAI API key'],
    ['blocked', 'invalid-scope', 'blocked', 'outside this proposal scope'],
    ['blocked', 'unclear-direction', 'blocked', 'not specific enough'],
    ['blocked', 'stale-analysis', 'blocked', 'Analyze this failure again'],
    ['blocked', 'missing-artifact', 'blocked', 'saved run evidence'],
    ['blocked', 'missing-cell', 'blocked', 'result cell'],
    ['blocked', 'missing-assertion', 'blocked', 'assertion could not be found'],
    ['blocked', 'non-failed-assertion', 'blocked', 'did not fail'],
    ['blocked', 'unsafe-target-files', 'blocked', 'target could not be verified'],
    ['proposal-rejected', 'vague-proposal', 'blocked', 'concrete file change'],
    ['proposal-rejected', 'unsafe-target-files', 'blocked', 'target could not be verified'],
    ['blocked', 'invalid-request', 'blocked', 'could not read this proposal request'],
    ['error', 'provider-authorization', 'failed', 'rejected authorization'],
    ['error', 'provider-rate-limit', 'failed', 'limited this request'],
    ['error', 'provider-timeout', 'failed', 'respond in time'],
    ['error', 'provider-unavailable', 'failed', 'could not be reached'],
    ['error', 'invalid-llm-response', 'failed', 'could not be used safely'],
    ['error', 'llm-failure', 'failed', 'provider cause is unknown'],
    ['error', 'unknown-cause', 'failed', 'Cause unknown'],
  ];
  for (const [status, category, outcome, wording] of cases) {
    const urls: string[] = [];
    const { api, host } = harness(async url => { urls.push(url); return url.includes('failure-analysis') ? analysis : draftResponse(status!, category!, outcome!); });
    await api.requestRepair('analysis'); await api.requestRepair('proposal');
    assert.equal(api.stage(), 'proposal-error');
    assert.match(host.innerHTML, /AI analysis.*Selected check failed.*Retained selected evidence.*data-proposal-notice/s);
    assert.match(host.innerHTML, new RegExp(wording!));
    assert.match(host.innerHTML, /Stage: proposal.*Category: .*Reference:/s);
    assert.doesNotMatch(host.innerHTML, /Approve and apply|data-action="approve-repair"|PRIVATE_|sk-secret/);
    assert.equal(urls.length, 2, 'no automatic retry or apply');
  }
});

test('invalid proposal issues and browser connection loss do not copy a guessed server outcome', async () => {
  for (const response of [
    { ...draftResponse('error', 'provider-timeout', 'failed'), issue: { ...proposalIssue('provider-timeout', 'failed'), reference: privateText } },
    { ...draftResponse('error', 'provider-timeout', 'failed'), issue: proposalIssue('provider-authorization', 'failed') },
    { ...draftResponse('blocked', 'stale-analysis', 'blocked'), issue: proposalIssue('stale-analysis', 'failed') },
    { ...draftResponse('error', 'provider-timeout', 'failed'), issue: { ...proposalIssue('provider-timeout', 'failed'), stage: 'analysis' } },
  ]) {
    const { api } = harness(async url => url.includes('failure-analysis') ? analysis : response);
    await api.requestRepair('analysis'); await api.requestRepair('proposal');
    assert.match(api.markup(), /Cause unknown/);
    assert.doesNotMatch(api.markup(), /data-proposal-issue-details|PRIVATE_|sk-secret/);
  }
  const lost = harness(async url => { if (url.includes('failure-analysis')) return analysis; throw Error(privateText); });
  await lost.api.requestRepair('analysis'); await lost.api.requestRepair('proposal');
  assert.match(lost.api.markup(), /Proposal connection failed.*could not confirm whether drafting finished.*matching terminal event may not exist/s);
  assert.doesNotMatch(lost.api.markup(), /server rejected|no files changed|data-proposal-issue-details|PRIVATE_|sk-secret/);
});

test('proposal copy is allowlisted, fallback stays selectable, and stale selection cannot receive copy feedback', async () => {
  const copied: string[] = [];
  const response = async (url: string) => url.includes('failure-analysis') ? analysis : draftResponse('error', 'provider-timeout', 'failed');
  const denied = harness(response, { writeText: async value => { copied.push(value); throw Error(privateText); } });
  await denied.api.requestRepair('analysis'); await denied.api.requestRepair('proposal'); denied.click('copy-proposal-issue');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied[0], 'Stage: proposal\nOutcome: failed\nCategory: provider-timeout\nReference: ' + reference);
  assert.match(denied.feedback.textContent, /Select the issue details above/);
  assert.match(denied.api.markup(), /<pre data-proposal-issue-details>/);
  const success = harness(response, { writeText: async () => undefined });
  await success.api.requestRepair('analysis'); await success.api.requestRepair('proposal'); success.click('copy-proposal-issue');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(success.feedback.textContent, 'Issue details copied.');
  const absent = harness(response);
  await absent.api.requestRepair('analysis'); await absent.api.requestRepair('proposal'); absent.click('copy-proposal-issue');
  assert.match(absent.feedback.textContent, /Select the issue details above/);
  const stale = harness(response, { writeText: async () => new Promise<void>(resolve => { finishCopy = resolve; }) });
  let finishCopy: () => void = () => undefined;
  await stale.api.requestRepair('analysis'); await stale.api.requestRepair('proposal'); stale.click('copy-proposal-issue');
  stale.api.resetRepair(); stale.api.setSelection({ ...selected, assertionId: 'other' }); finishCopy();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stale.feedback.textContent, '');
});

test('actual apply Copy click writes only four validated fields for blocked and uncertain outcomes', async () => {
  for (const [status, category, outcome] of [['blocked', 'missing-approval', 'blocked'], ['error', 'mutation-failure', 'uncertain']] as const) {
    const copied: string[] = [];
    const browser = await reachApply(applyResponse(status, category), { writeText: async value => { copied.push(value); } });
    const before = browser.api.markup();
    const expected = `Stage: repair-apply\nOutcome: ${outcome}\nCategory: ${category}\nReference: ${reference}`;
    assert.match(before, /data-action="copy-apply-issue"/);
    assert.equal(safeApplyDetails(before), expected);
    browser.click('copy-apply-issue');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(copied, [expected]);
    assert.equal(browser.feedback.textContent, 'Issue details copied.');
    assert.equal(browser.api.markup(), before, 'copy feedback does not replace the outcome notice');
    assert.equal(browser.urls.filter(url => url.endsWith('/apply')).length, 1, 'copy does not reapply');
    for (const secret of ['sk-secret', 'PRIVATE_', '99']) assert.doesNotMatch(copied[0]! + safeApplyDetails(before), new RegExp(secret));
  }
});

test('malformed or missing apply issue never exposes Copy or fallback details', async () => {
  const valid = applyResponse('error', 'mutation-failure');
  for (const response of [
    { ...valid, issue: { ...valid.issue, stage: 'proposal' } },
    { ...valid, issue: { ...valid.issue, outcome: 'blocked' } },
    { ...valid, issue: { ...valid.issue, category: privateText } },
    { ...valid, issue: { ...valid.issue, reference: privateText } },
    { ...valid, reason: 'missing-approval' },
    { ...valid, issue: undefined },
    undefined,
  ]) {
    const copied: string[] = [];
    const browser = await reachApply(response, { writeText: async value => { copied.push(value); } });
    assert.doesNotMatch(browser.api.markup(), /data-apply-issue-details|data-action="copy-apply-issue"/);
    browser.click('copy-apply-issue');
    assert.deepEqual(copied, []);
    assert.equal(browser.feedback.textContent, '');
  }
  const lost = await reachApply(Error(privateText));
  assert.doesNotMatch(lost.api.markup(), /data-apply-issue-details|data-action="copy-apply-issue"/);
});

test('apply clipboard rejection and unavailability retain selectable safe details without repeat apply', async () => {
  for (const clipboard of [{ writeText: async (_: string) => { throw Error(privateText); } }, undefined]) {
    const browser = await reachApply(applyResponse('error', 'unexpected-port-failure'), clipboard);
    const details = safeApplyDetails(browser.api.markup());
    browser.click('copy-apply-issue');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(details, `Stage: repair-apply\nOutcome: uncertain\nCategory: unexpected-port-failure\nReference: ${reference}`);
    assert.match(browser.api.markup(), /<pre data-apply-issue-details>/);
    assert.match(browser.feedback.textContent, /Select the issue details above/);
    assert.equal(browser.urls.filter(url => url.endsWith('/apply')).length, 1);
  }
});

test('failed draft has one concise live outcome, preserves notice, and moves focus only when the action disappears', async () => {
  const { api, host, context } = harness(async url => url.includes('failure-analysis') ? analysis : draftResponse('blocked', 'stale-analysis', 'blocked'));
  await api.requestRepair('analysis');
  context.document.activeElement = { dataset: { action: 'draft-repair' } };
  await api.requestRepair('proposal');
  assert.match(host.innerHTML, /data-proposal-announcement>Analysis no longer matches<\/span>/);
  assert.equal((host.innerHTML.match(/role="status"/g) || []).length, 1);
  assert.equal(context.document.activeElement?.focusName, '[data-proposal-heading]');
  const firstNotice = api.markup();
  assert.match(firstNotice, /data-proposal-notice/);
  assert.match(firstNotice, /data-proposal-announcement><\/span>/);
  context.document.activeElement = { focusName: 'typing outside repair' };
  await api.requestRepair('proposal');
  assert.equal(context.document.activeElement?.focusName, 'typing outside repair');
  assert.match(api.markup(), /data-proposal-notice/);
});

test('retryable proposal failure keeps the draft control focused and stale replies cannot overwrite a new selection', async () => {
  let finishDraft: (value: unknown) => void = () => undefined;
  const { api, host, context } = harness(async url => url.includes('failure-analysis') ? analysis : new Promise(resolve => { finishDraft = resolve; }));
  await api.requestRepair('analysis');
  context.document.activeElement = { dataset: { action: 'draft-repair' } };
  const pending = api.requestRepair('proposal');
  finishDraft(draftResponse('error', 'provider-timeout', 'failed'));
  await pending;
  assert.equal(context.document.activeElement?.dataset?.action, 'draft-repair');
  assert.match(host.innerHTML, /Try drafting again/);
  const stale = api.requestRepair('proposal');
  api.resetRepair(); api.setSelection({ ...selected, assertionId: 'other' });
  finishDraft(draftResponse('error', 'provider-authorization', 'failed'));
  await stale;
  assert.doesNotMatch(api.markup(), /Proposal authorization failed|data-proposal-notice/);
});
