import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

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
  const heading = { focus() { if (detail.innerHTML.includes('<h2 tabindex="-1">Case · failed</h2>')) document.activeElement = heading; } };
  const result = { innerHTML: '', querySelectorAll: () => [row] };
  const detail = { innerHTML: '', hidden: false, querySelector: (selector: string) => selector === 'h2' ? heading : null };
  const side = { hidden: true };
  const context = { document, URLSearchParams, matchMedia: () => ({ matches: false }), esc: escape,
    one: (selector: string) => ({ '[data-results-container]': result, '[data-detail]': detail, '[data-side-panel]': side })[selector],
    suite: { id: 'suite', name: 'Suite', testCases: [{ id: 'case', name: 'Case' }] }, suites: [],
    run: { runId: 'run', testedModel: 'model', scope: 'all', cases: [{ caseId: 'case', attempts: [{ number: 1, outcome: 'failed' }] }] },
    history: [{ runId: 'run' }], selectedRunId: 'run', latestKnownRunId: 'run', setup: { caseId: '' },
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false, activePanel: null,
    resetRepair: () => undefined, repairMarkup: () => '', loadDiscovery() {}, loadRuntime: async () => undefined,
    sheetSlot: { querySelector: () => null },
    json: async () => ({ status: 'ok', value: { evidenceStatus: 'available', evidence: {
      outcome: 'failed', assertions: [{ id: 'check', outcome: 'failed', actual: 'a', expected: 'b', diagnostics: [] }],
      turns: [], tools: [], diagnostics: [], output: '' } } }), status: () => undefined };
  vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_RESULTS_CLIENT, context);
  const click = (action: string, caseId = '') => {
    for (const listener of listeners.get('click') ?? []) listener({ target: { closest: () => ({ dataset: { action, caseId } }) } });
  };
  document.activeElement = row;
  click('case', 'case');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(detail.innerHTML, /<h2 tabindex="-1">Case · failed<\/h2>/);
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
    assert.equal(api.getDetail().hidden, true);
    assert.doesNotMatch(api.getDetail().innerHTML, /Old suite evidence/);
    detail.innerHTML = 'New suite result';
    assert.equal(detail.hidden, true);
  }
});

test('actual workspace rendering keeps setup closed for accepted and completed runs', () => {
  const nodes: Record<string, { textContent?: string; innerHTML?: string; hidden?: boolean; value?: string; disabled?: boolean;
    querySelector?: (selector: string) => unknown }> = {};
  for (const selector of ['[data-results-container]', '[data-detail]', '[data-side-panel]', '[data-suite-title]',
    '[data-suite-description]', '[data-action="suite-select"]', '[data-action="coverage"]', '[data-action="history"]',
    '[data-latest-label]', '[data-status-summary]',
    '[data-run-metrics]', '[data-progress]']) nodes[selector] = { textContent: '', innerHTML: '' };
  const reviewAction = { disabled: false };
  nodes['[data-run-setup]'] = { hidden: false, querySelector: selector => selector === '[data-action="start"]' ? reviewAction : null };
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
  assert.equal(nodes['[data-run-setup]']!.hidden, true);
  assert.match(nodes['[data-results-container]']!.innerHTML!, /Results/);
});

test('New run is a focused task and Back or Escape restores the invoking results control', () => {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const trigger = { focus() { document.activeElement = trigger; } };
  const heading = { focus() { document.activeElement = heading; } };
  const workspace = { dataset: { taskView: 'results' } };
  const setupRegion = { hidden: true };
  const results = { hidden: false };
  const side = { hidden: true };
  const document = { activeElement: trigger as unknown,
    addEventListener(name: string, listener: (event: unknown) => void) {
      listeners.set(name, [...listeners.get(name) ?? [], listener]);
    } };
  const nodes: Record<string, unknown> = {
    '[data-workspace]': workspace, '[data-run-setup]': setupRegion,
    '[data-results-container]': results, '[data-detail]': { hidden: true },
    '[data-side-panel]': side, '[data-sheet-slot]': { querySelector: () => null },
    '#run-setup-title': heading,
  };
  const context = { document, one: (selector: string) => nodes[selector], suite: { id: 'suite', testCases: [] },
    suites: [], setup: { caseId: '' }, setupRegion, sheetSlot: nodes['[data-sheet-slot]'], startPending: false, startUncertain: false, activePanel: null,
    isActive: () => false, loadDiscovery() {}, loadRuntime() {}, json: async () => new Promise(() => undefined),
    historyGeneration: 0 };
  vm.runInNewContext(WORKSPACE_RESULTS_CLIENT, context);
  const click = (action: string) => {
    for (const listener of listeners.get('click') ?? []) listener({ target: { closest: () => ({ dataset: { action } }) } });
  };
  click('new-run');
  assert.equal(workspace.dataset.taskView, 'new-run');
  assert.equal(setupRegion.hidden, false);
  assert.equal(results.hidden, true);
  assert.equal(document.activeElement, heading);
  click('return-results');
  assert.equal(workspace.dataset.taskView, 'results');
  assert.equal(setupRegion.hidden, true);
  assert.equal(results.hidden, false);
  assert.equal(document.activeElement, trigger);
  click('new-run');
  for (const listener of listeners.get('keydown') ?? []) listener({ key: 'Escape', preventDefault() {} });
  assert.equal(workspace.dataset.taskView, 'results');
  assert.equal(document.activeElement, trigger);
});
