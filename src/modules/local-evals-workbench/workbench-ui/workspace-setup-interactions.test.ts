import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

test('case switches and late discovery keep conditional Judge options and keyboard focus in sync', async () => {
  const listeners = new Map<string, (event: { target: { matches: (selector: string) => boolean } }) => void>();
  const controls = { scope: 'one', caseId: 'plain', model: '', judge: '', repeats: '1' };
  const document: { activeElement: unknown; getElementById: (id: string) => { textContent: string }; querySelector: (selector: string) => unknown;
    addEventListener: (name: string, listener: (event: { target: { matches: (selector: string) => boolean } }) => void) => void } = {
    activeElement: null,
    getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', name: 'Suite', testCases: [{ id: 'plain', name: 'Plain' }, { id: 'rubric', name: 'Rubric' }] }] }) }),
    querySelector: selector => selector === '[data-workspace]' ? {} : selector === '[data-sheet-slot]' ? slot : null,
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  const focusable = (field: string) => ({ dataset: { field }, focus() { document.activeElement = this; } });
  const fields = { innerHTML: '', querySelector: (selector: string) => focusable(selector.match(/data-field="([^"]+)/)?.[1] || 'scope') };
  const slot = { innerHTML: '', textContent: '', querySelector(selector: string): unknown {
    if (selector === '[data-setup-fields]') return fields;
    if (selector === 'button') return focusable('close');
    if (selector === 'input[name="scope"]:checked') return { value: controls.scope };
    if (selector === '[data-field="case"]') return { value: controls.caseId };
    if (selector === '[data-field="model"]') return { value: controls.model };
    if (selector === '[data-field="judge"]') return fields.innerHTML.includes('data-field="judge"') ? { value: controls.judge } : null;
    if (selector === '[data-field="repeats"]') return { value: controls.repeats };
    return null;
  } };
  let finishDiscovery!: (value: unknown) => void;
  const context = { document, resetRepair: () => undefined,
    fetch: async () => ({ json: async () => new Promise(resolve => { finishDiscovery = resolve; }) }) };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return {showSetup, readSetup, refreshSetupControls, loadRuntime, needsJudge, getSetup:()=>setup}; })()', context) as {
    showSetup(): void; readSetup(): void; refreshSetupControls(): void; loadRuntime(): Promise<void>;
    needsJudge(): boolean; getSetup(): { judgeModel: string };
  };
  api.showSetup();
  api.readSetup(); api.refreshSetupControls();
  const loading = api.loadRuntime();
  await new Promise(resolve => setImmediate(resolve));
  finishDiscovery({ status: 'ready', models: ['tested'], judgeModels: ['judge-a'], rubricCaseIds: ['rubric'] });
  await loading;
  assert.match(fields.innerHTML, /value="tested"/);
  assert.doesNotMatch(fields.innerHTML, /data-field="judge"/);

  controls.caseId = 'rubric';
  document.activeElement = focusable('case');
  api.readSetup(); api.refreshSetupControls();
  assert.equal(api.needsJudge(), true);
  assert.match(fields.innerHTML, /data-field="judge"/);
  assert.match(fields.innerHTML, /value="judge-a"/);
  assert.equal((document.activeElement as { dataset: { field: string } }).dataset.field, 'case');

  controls.judge = 'judge-a';
  api.readSetup();
  controls.caseId = 'plain';
  api.readSetup(); api.refreshSetupControls();
  assert.doesNotMatch(fields.innerHTML, /data-field="judge"/);
  controls.caseId = 'rubric';
  api.readSetup(); api.refreshSetupControls();
  assert.equal(api.getSetup().judgeModel, 'judge-a');
  assert.match(fields.innerHTML, /data-field="judge"/);
});

test('dismissing review during Start preserves visible blocked and uncertain outcomes without resubmitting', async () => {
  for (const outcome of ['blocked', 'network'] as const) {
    let complete!: (value: { json(): Promise<unknown> }) => void;
    let fail!: (reason: Error) => void;
    let submissions = 0;
    const progress = { textContent: '' };
    const reviewStatus = { textContent: '' };
    const startButton = { disabled: false };
    const slot = { textContent: '', open: true, querySelector(selector: string): unknown {
      if (!this.open) return null;
      if (selector === '[data-action="start"]') return startButton;
      if (selector === '[data-review-status]') return reviewStatus;
      return null;
    } };
    const document = { activeElement: null, getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
      querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-sheet-slot]': slot, '[data-progress]': progress })[selector],
      addEventListener() {} };
    const context = { document, resetRepair() {}, fetch: () => {
      submissions++;
      return new Promise((resolve, reject) => { complete = resolve; fail = reject; });
    } };
    const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT
      + '; return { startRun, closeSheet, setReview(value){review=value;}, getState:()=>({startUncertain, review}) }; })()', context) as {
        startRun(): Promise<void>; closeSheet(): void;
        setReview(value: unknown): void; getState(): { startUncertain: boolean; review: unknown };
      };
    api.setReview({ request: { suiteId: 'suite' }, result: { selectedCaseIds: [], targetCalls: 0, judgeCalls: 0, totalCalls: 0, cost: {} } });
    const pending = api.startRun();
    api.closeSheet();
    slot.open = false;
    if (outcome === 'blocked') complete({ json: async () => ({ status: 'blocked', reason: 'missing model' }) });
    else fail(new Error('network failure'));
    await pending;
    assert.equal(submissions, 1);
    assert.equal(startButton.disabled, false);
    if (outcome === 'blocked') {
      assert.match(progress.textContent, /Run was not started: missing model/);
      assert.equal(api.getState().review, null);
      assert.equal(api.getState().startUncertain, false);
    } else {
      assert.match(progress.textContent, /Start status is uncertain. Check History/);
      assert.equal(api.getState().startUncertain, true);
    }
    await api.startRun();
    assert.equal(submissions, 1);
  }
});

test('accepted run polls despite unavailable history, retains the run lock, and clears prior-run evidence', async () => {
  for (const postRepairRerun of [false, true]) {
    const priorDetail = postRepairRerun ? 'Earlier approved repair proposal' : 'Earlier result detail';
    const progress = { textContent: '' };
    const detail = { innerHTML: priorDetail };
    const startButton = { disabled: false };
    const newRunButton = { disabled: false };
    const slot = { textContent: '', innerHTML: '', querySelector: (selector: string) => selector === '[data-action="start"]' ? startButton : null };
    const responses = [
      { status: 'unavailable' },
      { status: 'ok', value: { summary: { runId: 'accepted', state: 'completed', cases: [], caseIds: [] } } },
    ];
    const timers: (() => void)[] = [];
    let statusRequests = 0;
    let historyRequests = 0;
    const document = { activeElement: null, getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
      querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-sheet-slot]': slot, '[data-progress]': progress,
        '[data-detail]': detail, '[data-results-container]': {}, '[data-side-panel]': {},
        '[data-status-summary]': { focus() {} }, '[data-action=new-run]': newRunButton })[selector],
      querySelectorAll: () => [], addEventListener() {} };
    const context = { document, URLSearchParams, setTimeout: (callback: () => void) => { timers.push(callback); },
      fetch: async (url: string) => ({ json: async () => {
        if (url === '/api/eval-runs/start') return { status: 'queued', runId: 'accepted' };
        if (url.startsWith('/api/eval-runs/history')) { historyRequests++; return { status: 'unavailable' }; }
        if (url.startsWith('/api/eval-runs/status')) { statusRequests++; return responses.shift(); }
        return { status: 'ready', models: [], judgeModels: [] };
      } }) };
    const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + WORKSPACE_RESULTS_CLIENT + WORKSPACE_REPAIR_CLIENT
      + '; renderWorkspace = () => { document.querySelector("[data-action=new-run]").disabled = isActive() || startPending || startUncertain; };'
      + ' return { startRun, showSetup, rerunAfterRepair, setReview(value){review=value;}, primeRepair(){'
      + ' run={runId:"old",state:"completed",judgeModel:null,repeats:1}; selectedRunId="old"; history=[{runId:"old"}];'
      + ' selectedFailure={suiteId:"suite",runId:"old",testCaseId:"case"}; repairStage="applied";'
      + ' repairApplied={rerunRecommendation:{primaryAction:{suiteId:"suite",evalRunModelId:"model"}}}; },'
      + ' getState:()=>({acceptedRunId,selectedRunId,latestKnownRunId,run,repairStage,isLatest:latestRun()}) }; })()', context) as {
        startRun(): Promise<void>; showSetup(): void; rerunAfterRepair(scope: string): Promise<void>;
        setReview(value: unknown): void; primeRepair(): void;
        getState(): { acceptedRunId: string | null; selectedRunId: string | null; latestKnownRunId: string | null;
          run: { state: string } | null; repairStage: string; isLatest: boolean } };
    if (postRepairRerun) { api.primeRepair(); await api.rerunAfterRepair('case'); }
    api.setReview({ request: { suiteId: 'suite' }, result: { selectedCaseIds: [], targetCalls: 0, judgeCalls: 0, totalCalls: 0, cost: {} } });
    await api.startRun();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.getState().selectedRunId, 'accepted');
    assert.equal(api.getState().latestKnownRunId, 'accepted');
    assert.equal(api.getState().isLatest, true);
    assert.equal(api.getState().acceptedRunId, 'accepted');
    assert.equal(api.getState().run, null);
    assert.equal(api.getState().repairStage, 'idle');
    assert.doesNotMatch(detail.innerHTML, /Earlier/);
    assert.equal(newRunButton.disabled, true);
    assert.equal(statusRequests, 1);
    assert.ok(historyRequests >= 1);
    const sheetBefore = slot.innerHTML;
    api.showSetup();
    assert.equal(slot.innerHTML, sheetBefore);
    assert.equal(timers.length, 1);
    timers.shift()!();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(statusRequests, 2);
    assert.equal(api.getState().acceptedRunId, null);
    assert.equal(api.getState().run?.state, 'completed');
    assert.equal(api.getState().isLatest, true);
    assert.equal(newRunButton.disabled, false);
  }
});
