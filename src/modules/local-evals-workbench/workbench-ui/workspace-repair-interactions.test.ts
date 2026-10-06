import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';
import { WORKSPACE_STYLES } from './workspace-styles.js';

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
  const context = { document, navigator: clipboard ? { clipboard } : {}, post, esc, latestRun: () => true, suite: { id: 'suite' }, run: { judgeModel: null },
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
  exactFailureExplanation: 'Selected check failed', suggestedFix: 'Update the target prompt rule.',
  evidenceSummary: 'Retained selected evidence', uncertainty: 'Low' } };
const draftResponse = (status: string, category: string, outcome: string) => ({ status, reason: category,
  issue: proposalIssue(category, outcome), message: privateText, evidence: { output: privateText }, proposal: { changeSummary: privateText } });
const applyResponse = (status: 'blocked' | 'error', category: string) => ({ status, reason: category,
  issue: { stage: 'repair-apply', outcome: status === 'blocked' ? 'blocked' : 'uncertain', category, reference,
    title: privateText, explanation: privateText, nextStep: privateText }, message: privateText,
  changedFileCount: status === 'blocked' ? 0 : 99,
  changedFiles: status === 'blocked' ? [] : [{ path: 'PRIVATE_PATH', content: privateText }] });
const safeApplyDetails = (markup: string) => markup.match(/<pre data-apply-issue-details>(.*?)<\/pre>/s)?.[1];
async function reachApply(response: unknown, clipboard?: { writeText(value: string): Promise<void> }) {
  const urls: string[] = [];
  const browser = harness(async url => { urls.push(url); if (url.endsWith('/apply') && response instanceof Error) throw response;
    return url.includes('failure-analysis') ? analysis : url.endsWith('/apply') ? response : { status: 'proposal-ready', proposal: { ...proposal, changeSummary: privateText,
      proposedChange: { ...proposal.proposedChange, representation: privateText } } }; }, clipboard);
  await browser.api.requestRepair('analysis'); await browser.api.requestRepair('proposal'); await browser.api.requestRepair('apply');
  return { ...browser, urls };
}

test('proposal review shows exact decision context and sends identity plus explicit approval only', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const { api } = harness(async (url, body) => {
    calls.push({ url, body });
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'applied', changedFileCount: 1, changedFiles: [{ path: 'prompts/agent.md', summary: 'Require owner verification' }], rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'suite', testCaseId: 'case', evalRunModelId: 'model' }, alternateActions: [{ scope: 'suite', suiteId: 'suite', evalRunModelId: 'model' }] } };
    return { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis');
  await api.requestRepair('proposal');
  const review = api.markup();
  for (const text of ['prompts/agent.md', 'Change preview', 'Show full change', 'Rationale', 'Expected impact', 'Approve and apply', 'Not now']) assert.match(review, new RegExp(text));
  assert.equal(calls.length, 2, 'draft and focus never approve');
  await api.requestRepair('apply');
  assert.deepEqual(Object.keys(calls[2]!.body).sort(), ['approvalMarker', 'assertionId', 'attempt', 'proposalId', 'runId', 'suiteId', 'testCaseId']);
  assert.match(api.markup(), /not verified until you rerun/);
  assert.match(api.markup(), /Require owner verification/);
  assert.equal(api.stage(), 'applied');
});

test('proposal review escapes project content and keeps long changes inside the disclosure', async () => {
  const unsafe = '<img src=x onerror=alert(1)>&"';
  const { api } = harness(async url => url.includes('failure-analysis') ? analysis : {
    status: 'proposal-ready', proposal: { ...proposal, affectedProjectFiles: [unsafe], changeSummary: unsafe,
      rationale: unsafe, expectedEvalImpact: unsafe,
      proposedChange: { kind: 'replacement', representation: unsafe + '\n' + 'x'.repeat(600) } },
  });
  await api.requestRepair('analysis'); await api.requestRepair('proposal');
  const markup = api.markup();
  assert.match(markup, /<strong>File<\/strong>/);
  assert.match(markup, /<h4>Change preview<\/h4>.*<details><summary>Show full change<\/summary>/s);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;&amp;&quot;/);
  assert.doesNotMatch(markup, /<img|data-proposal-announcement>.*PRIVATE_|role="status"[^>]*>.*<img/);
  assert.match(WORKSPACE_STYLES, /\.repair-proposal pre\{max-width:100%;overflow:auto\}/);
  assert.match(WORKSPACE_STYLES, /\.repair-decisions\{display:flex;flex-wrap:wrap/);
});

test('rejecting a proposal keeps selected evidence and never applies a project change', async () => {
  const urls: string[] = [];
  const { api, click } = harness(async url => { urls.push(url); return url.includes('failure-analysis') ? analysis : { status: 'proposal-ready', proposal }; });
  await api.requestRepair('analysis'); await api.requestRepair('proposal');
  click('reject-repair');
  assert.equal(api.stage(), 'analysis');
  assert.match(api.markup(), /Update the target prompt rule.*Proposal set aside/s);
  assert.doesNotMatch(api.markup(), /Approve and apply|Show full change/);
  await api.requestRepair('apply');
  assert.equal(urls.filter(url => url.endsWith('/apply')).length, 0);
  assert.equal(urls.length, 2);
});

test('unsuccessful and malformed drafts preserve evidence without stale approval or private notices', async () => {
  const responses: { response: unknown; heading: RegExp; next: RegExp }[] = [
    { response: draftResponse('proposal-unavailable', 'missing-openai-api-key', 'blocked'), heading: /Repair proposal unavailable/, next: /Check local assistance setup/ },
    { response: draftResponse('blocked', 'stale-analysis', 'blocked'), heading: /Analysis no longer matches/, next: /Try analysis again/ },
    { response: draftResponse('proposal-rejected', 'vague-proposal', 'blocked'), heading: /Proposal rejected/, next: /Try drafting again/ },
    { response: draftResponse('error', 'provider-timeout', 'failed'), heading: /Proposal timed out/, next: /Try drafting again/ },
    { response: Error(privateText), heading: /Proposal connection failed/, next: /Check the connection/ },
    { response: undefined, heading: /Proposal response invalid/, next: /Review the selected analysis/ },
    { response: { status: 'proposal-ready', proposal: { ...proposal, proposedChange: { kind: 'instructions', representation: privateText } } }, heading: /Proposal response invalid/, next: /Review the selected analysis/ },
    { response: { status: 'proposal-ready', proposal: { ...proposal, proposalId: '' } }, heading: /Proposal response invalid/, next: /Review the selected analysis/ },
  ];
  for (const { response, heading, next } of responses) {
    const urls: string[] = [];
    const { api } = harness(async url => { urls.push(url); if (url.includes('failure-analysis')) return analysis;
      if (response instanceof Error) throw response;
      return response;
    });
    await api.requestRepair('analysis'); await api.requestRepair('proposal');
    const markup = api.markup();
    assert.equal(api.stage(), 'proposal-error');
    assert.match(markup, /Update the target prompt rule/);
    assert.doesNotMatch(markup, /Retained selected evidence/);
    assert.match(markup, heading);
    assert.match(markup, next);
    assert.doesNotMatch(markup, /data-action="approve-repair"|PRIVATE_|sk-secret|<img/);
    await api.requestRepair('apply');
    assert.equal(urls.filter(url => url.endsWith('/apply')).length, 0);
  }
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

test('partial application keeps proposal and named inspection paths without claiming success', async () => {
  const { api } = harness(async url => {
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'error', reason: 'mutation-failure', issue: applyResponse('error', 'mutation-failure').issue,
      message: privateText, inspectionPaths: ['prompts/agent.md', 'prompts/agent.md.sibu-unsafe<name>.tmp', 'PRIVATE_PATH'],
      changedFiles: [{ path: 'prompts/agent.md' }] };
    return { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
  const markup = api.markup();
  assert.equal(api.stage(), 'apply-uncertain');
  assert.match(markup, /Repair outcome not confirmed/);
  assert.match(markup, /data-action="view-repair-files"/);
  assert.match(markup, /Files to inspect/);
  assert.match(markup, /prompts\/agent\.md\.sibu-unsafe&lt;name&gt;\.tmp/);
  assert.match(markup, /Require owner verification|Show full change/);
  assert.doesNotMatch(markup, /PRIVATE_PATH|sk-secret|Repair applied|Rerun this case|data-action="approve-repair"|Draft a fresh repair/);
});

test('confirmed block explains the supported reason and removes repeat approval', async () => {
  const browser = await reachApply(applyResponse('blocked', 'missing-approval'));
  const markup = browser.api.markup();
  assert.equal(browser.api.stage(), 'apply-blocked');
  assert.match(markup, /Repair blocked.*Approval for this concrete proposal was missing.*No project files changed/s);
  assert.match(markup, /Show full change/);
  assert.doesNotMatch(markup, /View files to inspect|data-action="approve-repair"|99/);
  assert.doesNotMatch(markup.match(/data-apply-notice.*?<\/section>/s)?.[0] ?? '', /PRIVATE_|sk-secret|prompts\/agent\.md/);
  assert.equal(browser.urls.filter(url => url.endsWith('/apply')).length, 1);
});

test('lost and malformed apply responses stay uncertain with inspection control and no terminal claim', async () => {
  for (const response of [Error(privateText), undefined, { status: 'blocked', reason: 'missing-approval',
    changedFileCount: 99, changedFiles: [], issue: applyResponse('blocked', 'missing-approval').issue, message: privateText },
  { status: 'blocked', reason: 'missing-approval', changedFileCount: 0, changedFiles: [], message: privateText },
  { status: 'applied', changedFileCount: 1, changedFiles: [], rerunRecommendation: { primaryAction: { scope: 'test_case' } } },
  { status: 'applied', changedFileCount: 1, changedFiles: [{ path: 'prompts/agent.md' }],
    rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'other', testCaseId: 'case', evalRunModelId: 'model' } } }]) {
    const browser = await reachApply(response);
    const markup = browser.api.markup();
    const notice = markup.match(/<section class="model-notice detail-section" data-apply-notice.*?<\/section>/s)?.[0] ?? '';
    assert.equal(browser.api.stage(), 'apply-uncertain');
    assert.match(markup, /Repair outcome not confirmed.*Sibu could not confirm.*View files to inspect/s);
    assert.match(markup, /data-repair-files.*prompts\/agent\.md/s);
    assert.doesNotMatch(markup, /No project files changed|Repair applied|data-action="rerun-case"|data-action="approve-repair"|data-action="draft-repair"|data-action="copy-apply-issue"/);
    assert.doesNotMatch(notice, /sk-secret|PRIVATE_|99|prompts\/agent\.md/);
    assert.equal(browser.urls.filter(url => url.endsWith('/apply')).length, 1);
  }
});

test('uncertain apply cannot draft again before named-file inspection', async () => {
  const browser = await reachApply(Error(privateText));
  await browser.api.requestRepair('proposal');
  await browser.api.requestRepair('apply');
  assert.equal(browser.api.stage(), 'apply-uncertain');
  assert.equal(browser.urls.filter(url => url.endsWith('/apply')).length, 1);
  assert.equal(browser.urls.filter(url => url === '/api/repair-proposals').length, 1);
  assert.match(browser.api.markup(), /Files to inspect.*prompts\/agent\.md/s);
});

test('file inspection focuses the existing named-file area, not a new panel', async () => {
  const browser = await reachApply(Error(privateText));
  browser.click('view-repair-files');
  assert.equal(browser.context.document.activeElement?.focusName, '[data-repair-files-heading]');
  assert.equal((browser.api.markup().match(/data-repair-files/g) || []).length, 2);
  assert.doesNotMatch(browser.api.markup(), /diagnostic-panel|data-side-panel/);
});

test('apply notice is announced once and focus changes only for the initiated approval', async () => {
  const initiated = harness(async url => url.includes('failure-analysis') ? analysis : url.endsWith('/apply')
    ? applyResponse('error', 'mutation-failure') : { status: 'proposal-ready', proposal });
  await initiated.api.requestRepair('analysis'); await initiated.api.requestRepair('proposal');
  initiated.context.document.activeElement = { dataset: { action: 'approve-repair' } };
  await initiated.api.requestRepair('apply');
  assert.equal(initiated.context.document.activeElement?.focusName, '[data-apply-heading]');
  assert.equal((initiated.host.innerHTML.match(/role="status"/g) || []).length, 1);
  assert.match(initiated.host.innerHTML, /data-apply-announcement>Repair outcome not confirmed<\/span>/);
  initiated.context.document.activeElement = { focusName: 'typing outside repair' };
  initiated.api.markup();
  assert.equal(initiated.context.document.activeElement?.focusName, 'typing outside repair');
  assert.match(WORKSPACE_STYLES, /@media\(max-width:699px\)/);
  assert.match(WORKSPACE_STYLES, /@media\(min-width:700px\) and \(max-width:1099px\)/);
  assert.match(WORKSPACE_STYLES, /@media\(min-width:1100px\)/);
});

test('a ready proposal receives initiated focus without stealing unrelated focus or announcing private change text', async () => {
  const browser = harness(async url => url.includes('failure-analysis') ? analysis : { status: 'proposal-ready', proposal: {
    ...proposal, changeSummary: privateText, proposedChange: { kind: 'replacement', representation: privateText } } });
  await browser.api.requestRepair('analysis');
  browser.context.document.activeElement = { dataset: { action: 'draft-repair' } };
  await browser.api.requestRepair('proposal');
  assert.equal(browser.context.document.activeElement?.focusName, '.repair-proposal h3');
  assert.doesNotMatch(browser.host.innerHTML.match(/<p role="status"[^>]*>.*?<\/p>/s)?.[0] || '', /PRIVATE_/);
  browser.context.document.activeElement = { dataset: { action: 'case' }, focusName: 'another task' };
  await browser.api.requestRepair('analysis');
  assert.equal(browser.context.document.activeElement?.focusName, 'another task');
});

test('case and suite rerun actions only prefill setup; neither starts a run', async () => {
  const urls: string[] = [];
  const { api, context } = harness(async url => {
    urls.push(url);
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'applied', changedFileCount: 1, changedFiles: [{ path: 'prompts/agent.md', summary: 'Require owner verification' }],
      rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'suite', testCaseId: 'case', evalRunModelId: 'model' },
        alternateActions: [{ scope: 'suite', suiteId: 'suite', evalRunModelId: 'model' }] } };
    return { status: 'proposal-ready', proposal };
  });
  await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
  await api.rerunAfterRepair('case');
  assert.deepEqual(JSON.parse(JSON.stringify(context.setup)), { scope: 'one', caseId: 'case', model: 'model', judgeModel: '' });
  assert.equal(context.strictRuntimeChoices, true);
  assert.equal(urls.filter(url => url.includes('/eval-runs/')).length, 0);
  api.setSelection(selected);
  await api.requestRepair('analysis'); await api.requestRepair('proposal'); await api.requestRepair('apply');
  await api.rerunAfterRepair('suite');
  assert.equal((context.setup as { scope: string }).scope, 'all');
  assert.equal(urls.filter(url => url.includes('/eval-runs/')).length, 0);
});

test('applied outcome offers only rerun actions supported by the response', async () => {
  const browser = await reachApply({ status: 'applied', changedFileCount: 1,
    changedFiles: [{ path: 'prompts/agent.md', summary: 'Require owner verification' }],
    rerunRecommendation: { primaryAction: { scope: 'test_case', suiteId: 'suite', testCaseId: 'case', evalRunModelId: 'model' }, alternateActions: [] } });
  const markup = browser.api.markup();
  assert.equal(browser.api.stage(), 'applied');
  assert.match(markup, /Changed files:.*prompts\/agent\.md.*Rerun this case/s);
  assert.doesNotMatch(markup, /Rerun all cases|Approve and apply|data-action="draft-repair"/);
  assert.equal(browser.urls.filter(url => url.endsWith('/apply')).length, 1);
});

test('cancelled or superseded rerun does not reopen setup after runtime loads', async () => {
  const { api, context } = harness(async url => {
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } };
    if (url.endsWith('/apply')) return { status: 'applied', changedFileCount: 1, changedFiles: [{ path: 'prompts/agent.md' }],
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
    assert.match(host.innerHTML, /Analysis · failed.*Selected check failed.*Update the target prompt rule.*data-proposal-notice/s);
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
    assert.match(api.markup(), /Proposal response invalid.*could not display this draft safely/s);
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
