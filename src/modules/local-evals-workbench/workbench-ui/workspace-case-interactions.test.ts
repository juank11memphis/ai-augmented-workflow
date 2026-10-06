import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const evidence = (caseId: string, attempt: number, assertionId = 'failed') => ({ status: 'ok', value: {
  evidenceStatus: 'available', evidence: { suiteId: 'suite', runId: 'run', caseId, number: attempt,
    outcome: assertionId === 'passed' ? 'passed' : 'failed', assertions: [{ id: assertionId,
      outcome: assertionId === 'passed' ? 'passed' : 'failed', actual: caseId + attempt + assertionId,
      expected: 'expected', diagnostics: [] }, ...(assertionId === 'failed' ? [{ id: 'other', outcome: 'failed',
      actual: caseId + attempt + 'other', expected: 'expected', diagnostics: [] }] : [])],
    turns: [], tools: [], diagnostics: [], output: 'PRIVATE RAW' } } });

function harness(read: (url: string) => Promise<unknown>, phone = false,
  post: (url: string, body: Record<string, unknown>) => Promise<unknown> = async () => { throw new Error('Unexpected repair request'); }) {
  const listeners = new Map<string, ((event: any) => void)[]>();
  const document = { activeElement: null as unknown, querySelectorAll: () => [],
    addEventListener(type: string, listener: (event: any) => void) { listeners.set(type, [...listeners.get(type) || [], listener]); } };
  const heading = { focus() { document.activeElement = heading; } };
  const caseButton = { dataset: { caseId: 'a' }, focus() { document.activeElement = caseButton; } };
  const list = { scrollTop: 41, contains: () => false, innerHTML: '', querySelectorAll: () => [caseButton] };
  const parts: Record<string, unknown> = { '.results': {}, '#results-title small': { textContent: '' },
    '[data-result-list]': list, '[data-result-empty]': { hidden: true, textContent: '' },
    '[data-action="failures-only"]': { checked: false } };
  const results = { innerHTML: '', hidden: false, querySelector: (key: string) => parts[key] || null,
    querySelectorAll: () => [caseButton] };
  const detail = { innerHTML: '', hidden: true, querySelector: () => heading };
  const sheet = { open: false, html: '', querySelector(key: string) {
    if (key === '[role="dialog"]' || key === '[data-action="close-detail"]') return this.open ? {} : null;
    if (key === '.sheet .section-heading + h2') return heading;
    return null;
  } };
  const side = { hidden: true, innerHTML: '', setAttribute() {}, removeAttribute() {} };
  const nodes: Record<string, any> = { '[data-results-container]': results, '[data-detail]': detail,
    '[data-side-panel]': side, '[data-workspace]': { dataset: {} }, '[data-result-list]': list,
    '[data-suite-title]': { textContent: '' }, '[data-suite-description]': { textContent: '' },
    '[data-action="suite-select"]': { value: '' }, '[data-latest-label]': { textContent: '' },
    '[data-status-summary]': { textContent: '' }, '[data-run-metrics]': { textContent: '' },
    '[data-read-notice]': { hidden: true }, '[data-read-heading]': { textContent: '' },
    '[data-read-guidance]': { textContent: '' }, '[data-read-details]': { textContent: '', hidden: true },
    '[data-read-announcement]': { textContent: '' }, '[data-action="copy-read-issue"]': { hidden: true } };
  const context = { document, URLSearchParams, one: (key: string) => nodes[key], esc: escape,
    suite: { id: 'suite', name: 'Suite', testCases: [{ id: 'a', name: 'Case A' }, { id: 'b', name: 'Case B' }] },
    suites: [] as { id: string; name: string; testCases: { id: string; name: string }[] }[], run: { runId: 'run', suiteId: 'suite', state: 'completed', scope: 'all', testedModel: 'model',
      caseIds: ['a', 'b'], cases: [
        { caseId: 'a', state: 'completed', attempts: [{ number: 1, outcome: 'failed' }, { number: 2, outcome: 'passed' }] },
        { caseId: 'b', state: 'completed', attempts: [{ number: 1, outcome: 'failed' }] }] },
    selectedRunId: 'run', latestKnownRunId: 'run', acceptedRunId: null, history: [] as { runId: string }[],
    detailGeneration: 0, runGeneration: 0, historyGeneration: 0, setup: { model: 'model' }, runtime: {},
    startPending: false, startUncertain: false, activePanel: null, setupRegion: { hidden: true, querySelector: () => null },
    isActive: () => false, needsJudge: () => false, refreshSetupControls() {}, status() {},
    loadDiscovery() {}, loadRuntime() {}, loadHistory() {}, setRuntimeState() {}, renderCaseDetail: undefined,
    matchMedia: () => ({ matches: phone }), sheetSlot: sheet,
    openSheet: (_title: string, html: string) => { sheet.open = true; sheet.html = html; heading.focus(); },
    closeSheet: () => { sheet.open = false; api.closeCaseDetail(); },
    json: (url: string) => url.includes('/history?') ? new Promise(() => undefined) : read(url), post,
    setTimeout: () => 0, safeReference: () => false,
  };
  const api = vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_REPAIR_CLIENT + WORKSPACE_RESULTS_CLIENT
    + ';({ inspectCase, clearSelectedDetail, closeCaseDetail, renderWorkspace, selectSuite, selectHistoryRun, requestRepair, markup:repairMarkup, state:()=>({detailSelection,selectedFailure,repairStage,readNotices}) })',
    context) as { inspectCase(caseId: string, attempt: number, assertionId?: string): Promise<void>;
      clearSelectedDetail(): void; closeCaseDetail(): void; renderWorkspace(): void; selectSuite(id: string): void;
      selectHistoryRun(id: string): Promise<void>; requestRepair(kind: string): Promise<void>; markup(): string;
      state(): { detailSelection: { caseId: string; attempt: number; assertionId: string }; selectedFailure: unknown;
        repairStage: string; readNotices: Record<string, unknown> } };
  function click(action: string, data: Record<string, string> = {}) {
    for (const listener of listeners.get('click') || []) listener({ target: { closest: () => ({ dataset: { action, ...data } }) } });
  }
  return { api, context, detail, document, heading, caseButton, list, sheet, nodes, click,
    input(value: string) { for (const listener of listeners.get('input') || []) listener({ target: {
      value, matches: (selector: string) => selector === '[data-action="search"]' } }); } };
}

test('case, attempt and failed check selection scope repair; passed attempt keeps inspectable checks without repair', async () => {
  const app = harness(async url => evidence(url.includes('caseId=b') ? 'b' : 'a', url.includes('attempt=2') ? 2 : 1,
    url.includes('attempt=2') ? 'passed' : url.includes('assertionId=other') ? 'other' : 'failed'));
  await app.api.inspectCase('a', 1);
  assert.match(app.detail.innerHTML, /Selected check: failed/);
  assert.deepEqual(JSON.parse(JSON.stringify(app.api.state().selectedFailure)), {
    suiteId: 'suite', runId: 'run', testCaseId: 'a', attempt: 1, assertionId: 'failed', evalRunModelId: 'model', runScope: { type: 'all' } });
  await app.api.inspectCase('a', 1, 'other');
  assert.match(app.detail.innerHTML, /Selected check: other/);
  assert.equal(app.api.state().selectedFailure && (app.api.state().selectedFailure as { assertionId: string }).assertionId, 'other');
  await app.api.inspectCase('a', 2);
  assert.match(app.detail.innerHTML, /All checks \(1\).*passed/s);
  assert.doesNotMatch(app.detail.innerHTML, /Analyze failure|Selected check: other/);
  assert.equal(app.api.state().selectedFailure, null);
});

test('late first and second evidence reads, including A to B to A, cannot restore stale detail or proposal', async () => {
  const releases: ((value: unknown) => void)[] = [];
  const app = harness(url => url.includes('caseId=b') ? Promise.resolve(evidence('b', 1))
    : new Promise(resolve => releases.push(resolve)));
  const first = app.api.inspectCase('a', 1);
  await app.api.inspectCase('b', 1);
  const current = app.api.inspectCase('a', 1);
  releases[0]!(evidence('a', 1, 'old'));
  await first;
  assert.doesNotMatch(app.detail.innerHTML, /old|b1failed/);
  releases[1]!(evidence('a', 1));
  await new Promise(resolve => setImmediate(resolve));
  releases[2]!(evidence('a', 1));
  await current;
  assert.match(app.detail.innerHTML, /a1failed/);
  assert.doesNotMatch(app.detail.innerHTML, /old/);
});

test('failed selected evidence read retains results and exact retry identity, without private notice', async () => {
  let fail = false;
  const app = harness(async url => fail ? { status: 'error', reason: 'unknown', message: 'PRIVATE RAW' }
    : evidence('a', 1, url.includes('assertionId=other') ? 'other' : 'failed'));
  await app.api.inspectCase('a', 1, 'other');
  const prior = app.detail.innerHTML;
  fail = true;
  await app.api.inspectCase('a', 1, 'other');
  assert.equal(app.detail.innerHTML, prior);
  assert.deepEqual(JSON.parse(JSON.stringify(app.api.state().detailSelection)),
    { suiteId: 'suite', runId: 'run', caseId: 'a', attempt: 1, assertionId: 'other' });
  assert.match(app.nodes['[data-read-heading]'].textContent, /Selected evidence could not be read/);
  assert.doesNotMatch(app.nodes['[data-read-guidance]'].textContent, /PRIVATE RAW/);
});

test('compact detail moves focus to case heading; closing restores invoking row and list position', async () => {
  const app = harness(async url => evidence('a', url.includes('attempt=2') ? 2 : 1), true);
  app.click('case', { caseId: 'a' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.document.activeElement, app.heading);
  assert.match(app.sheet.html, /Case A/);
  app.list.scrollTop = 0;
  app.click('close-detail');
  assert.equal(app.document.activeElement, app.caseButton);
  assert.equal(app.list.scrollTop, 41);
  assert.equal(app.detail.hidden, true);
});

test('pane close restores full-width results and invoking case focus', async () => {
  const app = harness(async () => evidence('a', 1));
  app.click('case', { caseId: 'a' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.detail.hidden, false);
  assert.equal(app.document.activeElement, app.heading);
  app.click('close-detail');
  assert.equal(app.detail.hidden, true);
  assert.equal(app.document.activeElement, app.caseButton);
});

test('suite invalidation and filter closure remove selected evidence and repair controls', async () => {
  const app = harness(async () => evidence('a', 1));
  await app.api.inspectCase('a', 1);
  assert.match(app.detail.innerHTML, /Analyze failure/);
  app.api.clearSelectedDetail();
  assert.equal(app.api.state().detailSelection, null as never);
  assert.equal(app.api.state().selectedFailure, null);
  assert.doesNotMatch(app.detail.innerHTML, /PRIVATE RAW|Analyze failure/);
  await app.api.inspectCase('a', 1);
  app.input('Case B');
  assert.equal(app.detail.hidden, true);
  assert.equal(app.api.state().detailSelection, null as never);
});

test('each suite, run, case, attempt, and assertion change discards assistance before an old proposal can apply', async () => {
  const changes = ['suite', 'run', 'case', 'attempt', 'assertion'] as const;
  for (const change of changes) {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const app = harness(async url => url.includes('runId=past') ? { status: 'ok', value: { summary: {
      runId: 'past', suiteId: 'suite', state: 'completed', scope: 'all', testedModel: 'model', caseIds: ['a'], cases: [] } } }
      : evidence(url.includes('caseId=b') ? 'b' : 'a', url.includes('attempt=2') ? 2 : 1,
        url.includes('assertionId=other') ? 'other' : 'failed'), false, async (url, body) => {
      calls.push({ url, body });
      return url.includes('failure-analysis') ? { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } }
        : { status: 'proposal-ready', proposal: { proposalId: 'old', affectedProjectFiles: ['prompts/agent.md'], proposedChange: { representation: 'OLD PROPOSAL' } } };
    });
    await app.api.inspectCase('a', 1, 'failed');
    await app.api.requestRepair('analysis');
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0]!.body)), {
      suiteId: 'suite', runId: 'run', testCaseId: 'a', attempt: 1, assertionId: 'failed',
      evalRunModelId: 'model', runScope: { type: 'all' },
    });
    await app.api.requestRepair('proposal');
    assert.match(app.api.markup(), /Approve and apply/);
    if (change === 'suite') {
      app.context.suites = [{ ...app.context.suite }, { id: 'next', name: 'Next', testCases: [] }];
      app.api.selectSuite('next');
    } else if (change === 'run') {
      app.context.history = [{ runId: 'run' }, { runId: 'past' }];
      await app.api.selectHistoryRun('past');
    } else await app.api.inspectCase(change === 'case' ? 'b' : 'a', change === 'attempt' ? 2 : 1,
      change === 'assertion' ? 'other' : 'failed');
    assert.equal(app.api.state().repairStage, 'idle', change);
    assert.doesNotMatch(app.api.markup(), /OLD PROPOSAL|Approve and apply/, change);
    await app.api.requestRepair('apply');
    assert.equal(calls.filter(call => call.url.endsWith('/apply')).length, 0, change);
  }
});

test('a late proposal response cannot restore approval after a changed failed assertion', async () => {
  let finishDraft: (value: unknown) => void = () => undefined;
  const calls: string[] = [];
  const app = harness(async url => evidence('a', 1, url.includes('assertionId=other') ? 'other' : 'failed'), false,
    async url => { calls.push(url); return url.includes('failure-analysis')
      ? { status: 'analysis-ready', analysisId: 'analysis', analysis: { likelyCause: 'prompt_issue' } }
      : new Promise(resolve => { finishDraft = resolve; }); });
  await app.api.inspectCase('a', 1, 'failed');
  await app.api.requestRepair('analysis');
  const pending = app.api.requestRepair('proposal');
  await app.api.inspectCase('a', 1, 'other');
  finishDraft({ status: 'proposal-ready', proposal: { proposalId: 'old' } });
  await pending;
  assert.equal(app.api.state().repairStage, 'idle');
  assert.doesNotMatch(app.api.markup(), /Approve and apply/);
  await app.api.requestRepair('apply');
  assert.equal(calls.filter(url => url.endsWith('/apply')).length, 0);
});

test('past-run evidence remains inspectable without granting analysis or repair permission', async () => {
  const calls: string[] = [];
  const app = harness(async url => evidence('a', 1, url.includes('assertionId=other') ? 'other' : 'failed'), false,
    async url => { calls.push(url); return { status: 'analysis-ready' }; });
  app.context.latestKnownRunId = 'newer';
  await app.api.inspectCase('a', 1, 'failed');
  assert.match(app.detail.innerHTML, /Selected check: failed|a1failed/);
  assert.equal(app.api.state().selectedFailure, null);
  await app.api.requestRepair('analysis');
  await app.api.requestRepair('apply');
  assert.deepEqual(calls, []);
  assert.doesNotMatch(app.api.markup(), /Analyze failure|Approve and apply/);
});
