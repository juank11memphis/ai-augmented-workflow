import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKBENCH_CLIENT_RUN_SECTION } from './workbench-client-run.js';
import { WORKBENCH_CLIENT_EVENTS_SECTION } from './workbench-client-events.js';

test('per-UI run state locks controls and selected raw evidence renders as text only', async () => {
  const controls = [{ disabled: false }, { disabled: false }];
  const progress = { textContent: '' };
  const heading = { focused: false, focus() { this.focused = true; } };
  const detail = { textContent: '', children: [] as unknown[], append(child: unknown) { this.children.push(child); } };
  const panel = { hidden: true, innerHTML: '', querySelector(selector: string) {
    if (selector === '[data-run-progress]') return progress;
    if (selector === '[data-run-status-heading]') return heading;
    if (selector === '[data-run-detail-panel]') return detail;
    return null;
  } };
  const root = { querySelector: (selector: string) => selector === '[data-run-panel]' ? panel : null,
    querySelectorAll: () => controls, addEventListener() {} };
  const created: { tag: string; textContent: string; children: unknown[]; append(child: unknown): void }[] = [];
  const document = { createElement(tag: string) { const node = { tag, textContent: '', children: [] as unknown[], append(child: unknown) { this.children.push(child); } }; created.push(node); return node; } };
  const summary = { state: 'running', cases: [{ caseId: '<case>', state: 'incomplete', attempts: [] }], createdAt: Date.now(), finishedAt: null };
  const output = '<img src=x onerror=alert(1)> SYNTHETIC_SECRET_SENTINEL';
  const context = { root, document, state: { selectedSuiteId: 'suite' }, URLSearchParams, Date,
    sessionStorage: { getItem() { return null; } },
    h: (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!),
    previewStatus() {},
    fetch: async () => ({ json: async () => ({ status: 'ok', value: { evidenceStatus: 'available', evidence: {
      output, outcome: 'incomplete', diagnostics: ['runner-timeout'], assertions: [{ id: 'check', outcome: 'failed', expected: 'safe', actual: output, diagnostics: ['unsupported-schema'] }] } } }) }),
  };
  const api = vm.runInNewContext(WORKBENCH_CLIENT_RUN_SECTION.source + ';({ renderSelectedRun, inspectRunCase, setRun(value){selectedRun=value;} })', context) as {
    renderSelectedRun(value: unknown): void; inspectRunCase(caseId: string): Promise<void>; setRun(value: unknown): void;
  };
  api.renderSelectedRun(summary);
  assert.ok(controls.every(control => control.disabled));
  assert.match(panel.innerHTML, /&lt;case&gt;/);
  api.renderSelectedRun({ ...summary, state: 'completed', cases: [{ caseId: 'case', state: 'completed', attempts: [{ outcome: 'failed' }] }], finishedAt: Date.now() });
  assert.ok(controls.every(control => !control.disabled));
  assert.equal(heading.focused, true);
  api.renderSelectedRun({ ...summary, state: 'partial', diagnostics: ['runner-timeout'],
    cases: [{ caseId: 'case', state: 'incomplete', attempts: [{ outcome: 'incomplete' }] }], finishedAt: Date.now() });
  assert.match(panel.innerHTML, /Inspect partial evidence/);
  assert.match(panel.innerHTML, /Run diagnostics: runner-timeout/);
  api.setRun({ suiteId: 'suite', runId: 'run' });
  await api.inspectRunCase('case');
  const raw = created.find(node => node.tag === 'pre');
  assert.equal(raw?.textContent, output);
  assert.ok(created.some(node => node.textContent === 'Diagnostic: runner-timeout'));
  assert.ok(created.some(node => node.textContent === 'Diagnostic: unsupported-schema'));
  assert.doesNotMatch(panel.innerHTML, /onerror=/);
});

test('pending start blocks duplicate submission and suite navigation; rejected restart unlocks prior selection', async () => {
  const controls = [{ disabled: false }, { disabled: false }];
  const progress = { textContent: '' };
  const panel = { hidden: true, innerHTML: '', querySelector(selector: string) {
    return selector === '[data-run-progress]' ? progress : selector === '[data-run-status-heading]' ? { focus() {} } : null;
  } };
  let resolveStart!: (value: unknown) => void;
  const startResponse = new Promise(resolve => { resolveStart = resolve; });
  let startCalls = 0;
  const root = { querySelector: (selector: string) => selector === '[data-run-panel]' ? panel : null,
    querySelectorAll: () => controls, addEventListener() {} };
  const context = { root, state: { selectedSuiteId: 'suite', discovery: { suites: [] } }, URLSearchParams, Date,
    sessionStorage: { getItem() { return null; }, setItem() {} }, h: String, setTimeout() {}, previewStatus() {}, previewBlockMessage: String,
    loadRuntimeDescription() {},
    fetch: async (url: string) => url.includes('/start') ? (++startCalls === 1 ? startResponse : { json: async () => ({ status: 'blocked', reason: 'review-stale' }) })
      : { json: async () => ({ status: 'ok', value: { summary: { state: 'queued', cases: [], createdAt: Date.now(), finishedAt: null } } }) },
  };
  const api = vm.runInNewContext(WORKBENCH_CLIENT_RUN_SECTION.source + WORKBENCH_CLIENT_EVENTS_SECTION.source
    + ';({ startReviewedRun, renderSelectedRun, selectSuite, phase: () => runPhase })', context) as {
    startReviewedRun(command: unknown, review: unknown): Promise<boolean>; renderSelectedRun(value: unknown): void;
    selectSuite(suiteId: string): void; phase(): string;
  };
  const review = { selectedCaseIds: [], targetCalls: 0, judgeCalls: 0, totalCalls: 0, cost: null };
  const pending = api.startReviewedRun({ suiteId: 'suite' }, review);
  assert.equal(api.phase(), 'pending');
  assert.ok(controls.every(control => control.disabled));
  api.selectSuite('other');
  assert.equal(context.state.selectedSuiteId, 'suite');
  assert.equal(await api.startReviewedRun({ suiteId: 'suite' }, review), false);
  assert.equal(startCalls, 1);
  resolveStart({ json: async () => ({ status: 'queued', suiteId: 'suite', runId: 'run' }) });
  assert.equal(await pending, true);
  assert.equal(api.phase(), 'active');
  api.renderSelectedRun({ state: 'completed', cases: [], createdAt: Date.now(), finishedAt: Date.now() });
  assert.equal(api.phase(), 'idle');
  assert.equal(await api.startReviewedRun({ suiteId: 'suite' }, review), false);
  assert.equal(api.phase(), 'idle');
  assert.ok(controls.every(control => !control.disabled));
});
