import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';

const selection = { suiteId: 'suite', runId: 'run-two', testCaseId: 'case', attempt: 2,
  assertionId: 'failed-two', evalRunModelId: 'model', runScope: { type: 'all' } };
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

function harness(post: (url: string, body: unknown) => Promise<unknown>) {
  const host = { innerHTML: '' };
  const document = { querySelectorAll: () => [host], addEventListener() {} };
  const context = { document, post, esc: escape, latestRun: () => true,
    suite: { id: 'suite' }, run: { judgeModel: null, repeats: 2 },
    setup: {}, loadRuntime: async () => undefined, showSetup() {} };
  const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + ';({ setSelection(value){selectedFailure=value;}, resetRepair, requestRepair, renderRepair, markup:repairMarkup, getStage:()=>repairStage })', context) as {
    setSelection(value: unknown): void; resetRepair(): void; requestRepair(kind: string): Promise<void>;
    renderRepair(): void; markup(): string; getStage(): string;
  };
  api.setSelection(selection);
  return { api, host };
}

test('selected repeat moves analysis → one-file proposal → explicit apply without early mutation', async () => {
  const calls: { url: string; body: unknown }[] = [];
  const { api, host } = harness(async (url, body) => {
    calls.push({ url, body });
    if (url.includes('failure-analysis')) return { status: 'analysis-ready', analysisId: 'analysis-1',
      analysis: { likelyCause: 'prompt_issue', exactFailureExplanation: 'Failed', evidenceSummary: 'Selected only', uncertainty: 'Low' } };
    if (url.endsWith('/repair-proposals')) return { status: 'proposal-ready', proposal: {
      proposalId: 'repair-1', affectedProjectFiles: ['prompts/agent.md'], changeSummary: 'Require verification first.',
      rationale: 'The selected check failed.', expectedEvalImpact: 'The case should verify first.',
      proposedChange: { kind: 'unified-diff', representation: '-unsafe\n+<verified>' },
    } };
    return { status: 'applied', message: 'Not verified.', rerunRecommendation: { primaryAction: { suiteId: 'suite', evalRunModelId: 'model' } } };
  });
  await api.requestRepair('analysis');
  assert.equal(api.getStage(), 'analysis');
  await api.requestRepair('proposal');
  assert.equal(api.getStage(), 'proposal');
  assert.equal(calls.length, 2);
  assert.deepEqual((calls[1]!.body as { analysisId: string }).analysisId, 'analysis-1');
  assert.match(host.innerHTML, /&lt;verified&gt;/);
  assert.doesNotMatch(host.innerHTML, /<verified>/);
  assert.match(host.innerHTML, /<details><summary>Show full diff<\/summary>/);
  await api.requestRepair('apply');
  assert.equal(api.getStage(), 'applied');
  assert.equal(calls.length, 3);
  assert.deepEqual((calls[2]!.body as { attempt: number }).attempt, 2);
});

test('changing the failed-check control retains run identity through analysis and proposal requests', async () => {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const host = { innerHTML: '', closest: () => false, querySelector: () => null };
  const result = { innerHTML: '' }, detail = { innerHTML: '', hidden: false, querySelector: () => null }, side = { hidden: true };
  const document = { activeElement: null, querySelectorAll: (selector: string) => selector === '[data-repair-host]' ? [host] : [],
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, [...listeners.get(name) ?? [], listener]) };
  const context = { document, esc: escape, URLSearchParams, matchMedia: () => ({ matches: false }), one: (selector: string) => ({ '[data-results-container]': result, '[data-detail]': detail, '[data-side-panel]': side })[selector],
    suite: { id: 'suite', testCases: [{ id: 'case', name: 'Case' }] }, suites: [],
    run: { runId: 'run-two', testedModel: 'provider:model/long', scope: 'all', cases: [{ caseId: 'case', attempts: [{ number: 2, outcome: 'failed' }] }], state: 'completed' },
    history: [{ runId: 'run-two' }], selectedRunId: 'run-two', latestKnownRunId: 'run-two', setup: { caseId: '' },
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false, activePanel: null,
    loadDiscovery() {}, loadRuntime: async () => undefined, json: async (url: string) => ({ status: 'ok', value: { evidenceStatus: 'available', evidence: {
      outcome: 'failed', assertions: url.includes('assertionId=') ? [{ id: 'failed-two', outcome: 'failed', actual: 'selected', expected: 'expected', diagnostics: [] }]
        : [{ id: 'failed-one', outcome: 'failed' }, { id: 'failed-two', outcome: 'failed' }], turns: [], tools: [], diagnostics: [], output: '',
    } } }),
    post: async (url: string, body: Record<string, unknown>) => { calls.push({ url, body });
      return url.includes('failure-analysis') ? { status: 'analysis-ready', analysisId: 'analysis-1', analysis: { likelyCause: 'prompt_issue' } }
        : { status: 'proposal-rejected', message: 'no change' }; },
    status: () => undefined };
  const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + WORKSPACE_RESULTS_CLIENT
    + ';({ setSelection(value){selectedFailure=value;}, requestRepair, getSelection:()=>selectedFailure })', context) as {
    setSelection(value: unknown): void; requestRepair(kind: string): Promise<void>; getSelection(): typeof selection;
  };
  api.setSelection({ ...selection, assertionId: 'failed-one', evalRunModelId: 'provider:model/long' });
  for (const listener of listeners.get('change') ?? []) listener({ target: { matches: (selector: string) => selector === '[data-action="assertion-select"]', dataset: { caseId: 'case', attempt: '2' }, value: 'failed-two' } });
  await new Promise(resolve => setImmediate(resolve));
  await api.requestRepair('analysis');
  await api.requestRepair('proposal');
  assert.equal(calls.length, 2);
  for (const call of calls) assert.deepEqual(JSON.parse(JSON.stringify({ suiteId: call.body.suiteId, runId: call.body.runId, testCaseId: call.body.testCaseId,
    attempt: call.body.attempt, assertionId: call.body.assertionId, evalRunModelId: call.body.evalRunModelId, runScope: call.body.runScope })),
    { suiteId: 'suite', runId: 'run-two', testCaseId: 'case', attempt: 2, assertionId: 'failed-two', evalRunModelId: 'provider:model/long', runScope: { type: 'all' } });
});

test('late analysis cannot transfer to another failed assertion', async () => {
  let resolve!: (value: unknown) => void;
  const { api } = harness(async () => new Promise(value => { resolve = value; }));
  const pending = api.requestRepair('analysis');
  api.resetRepair();
  api.setSelection({ ...selection, assertionId: 'other' });
  resolve({ status: 'analysis-ready', analysisId: 'old', analysis: { likelyCause: 'prompt_issue' } });
  await pending;
  assert.equal(api.getStage(), 'idle');
  assert.doesNotMatch(api.markup(), /old/);
});

test('compact Coverage traps keyboard focus, Escape returns focus, and discards delayed detail', async () => {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const trigger = { focus() { document.activeElement = trigger; } };
  const heading = { focus() { document.activeElement = heading; } };
  const close = { focus() { document.activeElement = close; } };
  const result = { innerHTML: '' }, detail = { innerHTML: '', hidden: false };
  const attributes = new Map<string, string>();
  const side = { hidden: true, innerHTML: '', setAttribute: (key: string, value: string) => attributes.set(key, value),
    removeAttribute: (key: string) => attributes.delete(key), getAttribute: (key: string) => attributes.get(key),
    querySelector: (selector: string) => selector === 'h2' ? heading : close,
    querySelectorAll: () => [close], contains: (node: unknown) => node === heading || node === close };
  const document = { activeElement: trigger, querySelectorAll: () => [],
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, [...listeners.get(name) ?? [], listener]) };
  let resolveDetail!: (value: unknown) => void;
  let closedDetails = 0;
  const context = { document, URLSearchParams, matchMedia: () => ({ matches: true }), esc: escape,
    one: (selector: string) => ({ '[data-results-container]': result, '[data-detail]': detail, '[data-side-panel]': side })[selector],
    suite: { id: 'suite', testCases: [{ id: 'case', name: 'Case' }], coverage: { categories: [], gaps: [] } }, suites: [],
    run: { runId: 'run-two', cases: [{ caseId: 'case', attempts: [{ number: 1, outcome: 'failed' }] }] },
    history: [{ runId: 'run-two' }], selectedRunId: 'run-two', latestKnownRunId: 'run-two', setup: { caseId: '' },
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false, activePanel: null,
    resetRepair: () => undefined, loadDiscovery() {}, loadRuntime: async () => undefined,
    sheetSlot: { querySelector: () => ({}) }, openSheet: () => undefined, closeSheet: () => { closedDetails++; },
    json: async (url: string) => url.includes('history') ? new Promise(() => undefined) : new Promise(resolve => { resolveDetail = resolve; }),
    status: () => undefined };
  vm.runInNewContext(WORKSPACE_RESULTS_CLIENT, context);
  const click = (action: string, extra: Record<string, string> = {}) => {
    for (const listener of listeners.get('click') ?? []) listener({ target: { closest: () => ({ dataset: { action, ...extra } }) } });
  };
  click('case', { caseId: 'case' });
  click('coverage');
  assert.equal(document.activeElement, heading);
  assert.equal(side.getAttribute('aria-modal'), 'true');
  resolveDetail({ status: 'ok', value: { evidenceStatus: 'available', evidence: {} } });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(detail.innerHTML, /Loading selected evidence/);
  for (const listener of listeners.get('keydown') ?? []) listener({ key: 'Tab', shiftKey: true, preventDefault() {} });
  assert.equal(document.activeElement, close);
  for (const listener of listeners.get('keydown') ?? []) listener({ key: 'Escape', preventDefault() {} });
  assert.equal(side.hidden, true);
  assert.equal(document.activeElement, trigger);
  click('close-detail');
  assert.equal(closedDetails, 1);
});

test('medium result detail moves focus to a focusable heading and returns it to the selected row', async () => {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const document = { activeElement: null as unknown, querySelectorAll: () => [],
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, [...listeners.get(name) ?? [], listener]) };
  const row = { dataset: { caseId: 'case' }, focus() { document.activeElement = row; } };
  const heading = { focus() { if (detail.innerHTML.includes('<h2 tabindex="-1">Result detail</h2>')) document.activeElement = heading; } };
  const result = { innerHTML: '', querySelectorAll: () => [row] };
  const detail = { innerHTML: '', hidden: false, querySelector: (selector: string) => selector === 'h2' ? heading : null };
  const side = { hidden: true };
  const context = { document, URLSearchParams, matchMedia: () => ({ matches: false }), esc: escape,
    one: (selector: string) => ({ '[data-results-container]': result, '[data-detail]': detail, '[data-side-panel]': side })[selector],
    suite: { id: 'suite', testCases: [{ id: 'case', name: 'Case' }] }, suites: [],
    run: { runId: 'run', testedModel: 'model', scope: 'all', cases: [{ caseId: 'case', attempts: [{ number: 1, outcome: 'failed' }] }] },
    history: [{ runId: 'run' }], selectedRunId: 'run', latestKnownRunId: 'run', setup: { caseId: '' },
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false, activePanel: null,
    resetRepair: () => undefined, repairMarkup: () => '', loadDiscovery() {}, loadRuntime: async () => undefined,
    sheetSlot: { querySelector: () => null },
    json: async () => ({ status: 'ok', value: { evidenceStatus: 'available', evidence: {
      outcome: 'failed', assertions: [{ id: 'check', outcome: 'failed', actual: 'a', expected: 'b', diagnostics: [] }],
      turns: [], tools: [], diagnostics: [], output: '' } } }), status: () => undefined };
  vm.runInNewContext(WORKSPACE_RESULTS_CLIENT, context);
  const click = (action: string, caseId = '') => {
    for (const listener of listeners.get('click') ?? []) listener({ target: { closest: () => ({ dataset: { action, caseId } }) } });
  };
  document.activeElement = row;
  click('case', 'case');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(document.activeElement, heading);
  click('close-detail');
  assert.equal(document.activeElement, row);
});

test('suite switch clears either open panel and stale selected detail before a new result', () => {
  for (const panel of ['history', 'coverage']) {
    const result = { innerHTML: '' };
    const detail = { innerHTML: 'Old suite evidence', hidden: true };
    const removed: string[] = [];
    const side = { innerHTML: 'Old ' + panel, hidden: false, removeAttribute: (name: string) => removed.push(name),
      setAttribute() {}, querySelector: () => null };
    const context = { document: { querySelectorAll: () => [], addEventListener() {} },
      matchMedia: () => ({ matches: false }), esc: escape, URLSearchParams,
      one: (selector: string) => ({ '[data-results-container]': result, '[data-detail]': detail, '[data-side-panel]': side })[selector],
      suites: [{ id: 'old', testCases: [{ id: 'old-case' }] }, { id: 'new', testCases: [{ id: 'new-case' }] }],
      suite: { id: 'old', testCases: [{ id: 'old-case' }] }, run: null, history: [], selectedRunId: null, runtime: null, review: null,
      runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false,
      activePanel: panel, setup: {}, resetRepair() {}, isActive: () => false,
      loadDiscovery() {}, loadRuntime() {}, setRuntimeState() {}, json: async () => new Promise(() => undefined), status() {} };
    const api = vm.runInNewContext(WORKSPACE_RESULTS_CLIENT + '; renderWorkspace = () => {}; ({ selectSuite, getDetail: () => detail, getPanel: () => activePanel })', context) as {
      selectSuite(id: string): void; getDetail(): typeof detail; getPanel(): string | null;
    };
    api.selectSuite('new');
    assert.equal(api.getPanel(), null);
    assert.equal(side.hidden, true);
    assert.equal(side.innerHTML, '');
    assert.deepEqual(removed, ['role', 'aria-modal', 'aria-label']);
    assert.equal(api.getDetail().hidden, false);
    assert.doesNotMatch(api.getDetail().innerHTML, /Old suite evidence/);
    detail.innerHTML = 'New suite result';
    assert.equal(detail.hidden, false);
  }
});

test('actual workspace rendering collapses setup for an accepted run and restores it on completion', () => {
  const nodes: Record<string, { textContent?: string; innerHTML?: string; hidden?: boolean; value?: string; disabled?: boolean;
    querySelector?: (selector: string) => unknown }> = {};
  for (const selector of ['[data-results-container]', '[data-detail]', '[data-side-panel]', '[data-suite-title]',
    '[data-suite-description]', '[data-action="suite-select"]', '[data-action="coverage"]', '[data-action="history"]',
    '[data-latest-label]', '[data-status-summary]',
    '[data-run-metrics]', '[data-progress]']) nodes[selector] = { textContent: '', innerHTML: '' };
  const reviewAction = { disabled: false };
  nodes['[data-run-setup]'] = { hidden: false, querySelector: selector => selector === '[data-action="review"]' ? reviewAction : null };
  const document = { querySelectorAll: () => [], addEventListener() {} };
  const context = { document, URLSearchParams, esc: escape, one: (selector: string) => nodes[selector],
    suite: { id: 'suite', name: 'Suite', description: '', testCases: [{ id: 'case', name: 'Case' }] },
    run: null, history: [], selectedRunId: 'accepted', latestKnownRunId: 'accepted', acceptedRunId: 'accepted',
    setup: { model: 'tested', caseId: 'case' }, runtime: { models: ['tested'], judgeModels: [], rubricCaseIds: [] },
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0,
    setupRegion: nodes['[data-run-setup]'],
    startPending: false, startUncertain: false, activePanel: null,
    isActive: () => Boolean(context.acceptedRunId || context.run && ['queued', 'running'].includes(context.run.state)),
    needsJudge: () => false, refreshSetupControls() {}, status: (value: string) => { nodes['[data-progress]']!.textContent = value; },
    loadDiscovery() {}, loadRuntime() {}, json: async () => new Promise(() => undefined) } as {
      document: typeof document; URLSearchParams: typeof URLSearchParams; esc: typeof escape; one(selector: string): typeof nodes[string];
      suite: { id: string; name: string; description: string; testCases: { id: string; name: string }[] };
      run: null | { runId: string; state: string; createdAt: number; finishedAt: number; caseIds: string[];
        cases: { caseId: string; state: string; attempts: { outcome: string }[] }[]; cost: null };
      history: never[]; selectedRunId: string; latestKnownRunId: string; acceptedRunId: string | null;
      setup: { model: string; caseId: string }; runtime: { models: string[]; judgeModels: string[]; rubricCaseIds: string[] };
      runGeneration: number; historyGeneration: number; detailGeneration: number;
      startPending: boolean; startUncertain: boolean; activePanel: null;
      isActive(): boolean; needsJudge(): boolean; refreshSetupControls(): void; status(value: string): void;
      loadDiscovery(): void; loadRuntime(): void; json(): Promise<unknown>;
    };
  const api = vm.runInNewContext(WORKSPACE_RESULTS_CLIENT + ';({ renderWorkspace })', context) as { renderWorkspace(): void };
  api.renderWorkspace();
  assert.equal(nodes['[data-run-setup]']!.hidden, true);
  assert.match(nodes['[data-status-summary]']!.textContent!, /Run queued/);
  context.run = { runId: 'accepted', state: 'running', createdAt: 1, finishedAt: 2, caseIds: ['case'],
    cases: [{ caseId: 'case', state: 'incomplete', attempts: [] }], cost: null };
  api.renderWorkspace();
  assert.equal(nodes['[data-run-setup]']!.hidden, true);
  assert.match(nodes['[data-results-container]']!.innerHTML!, /Results/);
  context.acceptedRunId = null;
  context.run = { ...context.run, state: 'completed', cases: [{ caseId: 'case', state: 'completed', attempts: [{ outcome: 'passed' }] }] };
  api.renderWorkspace();
  assert.equal(nodes['[data-run-setup]']!.hidden, false);
  assert.match(nodes['[data-results-container]']!.innerHTML!, /Results/);
});

for (const failure of ['unavailable', 'rejected'] as const) {
  test(`compact assertion switch clears old evidence and proposal during deferred ${failure} read`, async () => {
    const listeners = new Map<string, ((event: unknown) => void)[]>();
    const result = { innerHTML: '' }, detail = { innerHTML: '', hidden: false }, side = { hidden: true };
    const sheet = { innerHTML: '' };
    let finishRead!: (value: unknown) => void;
    let rejectRead!: (reason: Error) => void;
    const attemptEvidence = { status: 'ok', value: { evidenceStatus: 'available', evidence: {
      outcome: 'failed', assertions: [
        { id: 'failed-one', outcome: 'failed', actual: 'OLD EVIDENCE', expected: 'old expected', diagnostics: [] },
        { id: 'failed-two', outcome: 'failed', actual: 'NEW EVIDENCE', expected: 'new expected', diagnostics: [] },
      ], turns: [], tools: [], diagnostics: [], output: 'Raw response',
    } } };
    const selectedEvidence = (id: string) => ({ status: 'ok', value: { evidenceStatus: 'available', evidence: {
      outcome: 'failed', assertions: [{ id, outcome: 'failed', actual: id === 'failed-one' ? 'OLD EVIDENCE' : 'NEW EVIDENCE',
        expected: 'expected', diagnostics: [] }], turns: [], tools: [], diagnostics: [], output: '',
    } } });
    const document = { activeElement: null, querySelectorAll: () => [],
      addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, [...listeners.get(name) ?? [], listener]) };
    const context = { document, URLSearchParams, matchMedia: () => ({ matches: true }), esc: escape,
      one: (selector: string) => ({ '[data-results-container]': result, '[data-detail]': detail, '[data-side-panel]': side })[selector],
      suite: { id: 'suite', testCases: [{ id: 'case', name: 'Case' }] }, suites: [],
      run: { runId: 'run', testedModel: 'model', scope: 'all', cases: [{ caseId: 'case', attempts: [{ number: 1, outcome: 'failed' }] }] },
      history: [{ runId: 'run' }], selectedRunId: 'run', latestKnownRunId: 'run', setup: { caseId: '' },
      runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false, activePanel: null,
      loadDiscovery() {}, loadRuntime: async () => undefined, status: () => undefined,
      openSheet: (_title: string, html: string) => { sheet.innerHTML = html; },
      json: async (url: string) => !url.includes('assertionId=') ? attemptEvidence
        : url.includes('failed-one') ? selectedEvidence('failed-one')
          : new Promise((resolve, reject) => { finishRead = resolve; rejectRead = reject; }),
    };
    const api = vm.runInNewContext(WORKSPACE_REPAIR_CLIENT + WORKSPACE_RESULTS_CLIENT
      + ';({ inspectCase, stage: () => repairStage, seedProposal() { repairStage = "proposal"; repairProposal = { proposalId: "old", changeSummary: "OLD PROPOSAL" }; } })', context) as {
      inspectCase(caseId: string, attempt: number, assertionId?: string): Promise<void>;
      stage(): string; seedProposal(): void;
    };
    await api.inspectCase('case', 1, 'failed-one');
    api.seedProposal();
    assert.match(sheet.innerHTML, /OLD EVIDENCE/);

    const pending = api.inspectCase('case', 1, 'failed-two');
    assert.equal(api.stage(), 'idle');
    assert.match(sheet.innerHTML, /Loading selected evidence for failed-two/);
    assert.equal(sheet.innerHTML, detail.innerHTML);
    assert.doesNotMatch(sheet.innerHTML, /OLD EVIDENCE|OLD PROPOSAL/);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(sheet.innerHTML, /Loading selected evidence for failed-two/);

    if (failure === 'unavailable') finishRead({ status: 'ok', value: { evidenceStatus: 'unavailable' } });
    else rejectRead(new Error('read failed'));
    await pending;
    assert.match(sheet.innerHTML, failure === 'unavailable' ? /Selected evidence is unavailable/ : /Selected evidence could not be loaded/);
    assert.equal(sheet.innerHTML, detail.innerHTML);
    assert.doesNotMatch(sheet.innerHTML, /OLD EVIDENCE|OLD PROPOSAL|NEW EVIDENCE/);
  });
}
