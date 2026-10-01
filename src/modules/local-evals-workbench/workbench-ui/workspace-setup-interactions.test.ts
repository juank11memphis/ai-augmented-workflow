import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

test('loading and known blocked reasons stay beside an unavailable model choice', async () => {
  const fields = { innerHTML: '' };
  const review = { disabled: false };
  const announcement = { textContent: '' };
  const region = { querySelector: (selector: string) => ({ '[data-setup-fields]': fields, '[data-action="review"]': review })[selector] };
  const document = { activeElement: null, getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
    querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-sheet-slot]': {}, '[data-run-setup]': region,
      '[data-setup-status]': announcement })[selector], addEventListener() {} };
  let resolve!: (value: unknown) => void;
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return {loadRuntime, refreshSetupControls};})()',
    { document, fetch: async () => ({ json: () => new Promise(done => { resolve = done; }) }) }) as {
      loadRuntime(): Promise<void>; refreshSetupControls(): void;
    };
  api.refreshSetupControls();
  assert.match(fields.innerHTML, /Model being tested<select[^>]*disabled[^>]*>/);
  assert.match(fields.innerHTML, /Loading compatible models/);
  assert.equal(review.disabled, true);
  const loading = api.loadRuntime();
  await new Promise(done => setImmediate(done));
  resolve({ status: 'blocked', reason: 'runner-unavailable' });
  await loading;
  assert.match(fields.innerHTML, /runner could not be used/);
  assert.match(fields.innerHTML, /data-model-readiness/);
  assert.equal(review.disabled, true);
  assert.match(announcement.textContent, /runner could not be used/);
  assert.doesNotMatch(fields.innerHTML, /OPENAI_API_KEY/);
});

test('a late suite description cannot replace a newer suite and an invalid prior choice stays unselected', async () => {
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [
    { id: 'first', testCases: [] }, { id: 'second', testCases: [] }] }) }),
    querySelector: (selector: string) => selector === '[data-workspace]' ? {} : null, addEventListener() {} };
  const resolves: ((value: unknown) => void)[] = [];
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT
    + '; return {loadRuntime, chooseSecond(){suite=suites[1];setup.model="old";}, get:()=>({model:setup.model,state:runtimeState})};})()',
    { document, fetch: async () => ({ json: () => new Promise(done => { resolves.push(done); }) }) }) as {
      loadRuntime(): Promise<void>; chooseSecond(): void; get(): { model: string; state: string };
    };
  const first = api.loadRuntime();
  await new Promise(done => setImmediate(done));
  api.chooseSecond();
  const second = api.loadRuntime();
  await new Promise(done => setImmediate(done));
  resolves[1]({ status: 'ready', models: ['new'], judgeModels: [], rubricCaseIds: [] });
  await second;
  resolves[0]({ status: 'ready', models: ['stale'], judgeModels: [], rubricCaseIds: [] });
  await first;
  assert.equal(api.get().model, '');
  assert.equal(api.get().state, 'ready');
});

test('rerun runtime refresh never silently replaces an unavailable prior model', async () => {
  const progress = { textContent: '' };
  const slot = { querySelector: () => null };
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [{ id: 'case' }] }] }) }),
    querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-sheet-slot]': slot, '[data-progress]': progress })[selector], addEventListener() {} };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return { loadRuntime, setPrior(){setup.model="prior"; strictRuntimeChoices=true;}, getSetup:()=>setup }; })()',
    { document, fetch: async () => ({ json: async () => ({ status: 'ready', models: ['other'], judgeModels: [], rubricCaseIds: [] }) }) }) as {
      loadRuntime(): Promise<void>; setPrior(): void; getSetup(): { model: string };
    };
  api.setPrior();
  await api.loadRuntime();
  assert.equal(api.getSetup().model, '');
  assert.match(progress.textContent, /Previous model choice is unavailable/);
});

test('case switches and late discovery keep conditional Judge options and keyboard focus in sync', async () => {
  const listeners = new Map<string, (event: { target: { matches: (selector: string) => boolean } }) => void>();
  const controls = { scope: 'one', caseId: 'plain', model: '', judge: '', repeats: '1' };
  const document: { activeElement: unknown; getElementById: (id: string) => { textContent: string }; querySelector: (selector: string) => unknown;
    addEventListener: (name: string, listener: (event: { target: { matches: (selector: string) => boolean } }) => void) => void } = {
    activeElement: null,
    getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', name: 'Suite', testCases: [{ id: 'plain', name: 'Plain' }, { id: 'rubric', name: 'Rubric' }] }] }) }),
    querySelector: selector => selector === '[data-workspace]' ? {} : selector === '[data-sheet-slot]' ? slot : selector === '[data-run-setup]' ? region : null,
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  const focusable = (field: string) => ({ dataset: { field }, focus() { document.activeElement = this; } });
  const fields = { innerHTML: '', querySelector: (selector: string) => focusable(selector.match(/data-field="([^"]+)/)?.[1] || 'scope') };
  const reviewAction = { ...focusable('review'), disabled: false };
  const slot = { innerHTML: '', textContent: '', querySelector: () => null };
  const region = { querySelector(selector: string): unknown {
    if (selector === '[data-setup-fields]') return fields;
    if (selector === '[data-action="review"]') return reviewAction;
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
  assert.equal(slot.innerHTML, '');
  assert.equal((document.activeElement as { dataset: { field: string } }).dataset.field, 'review');
  api.readSetup(); api.refreshSetupControls();
  assert.equal(reviewAction.disabled, true);
  const loading = api.loadRuntime();
  await new Promise(resolve => setImmediate(resolve));
  finishDiscovery({ status: 'ready', models: ['tested'], judgeModels: ['judge-a'], rubricCaseIds: ['rubric'] });
  await loading;
  assert.match(fields.innerHTML, /value="tested"/);
  assert.equal(reviewAction.disabled, false);
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
  controls.scope = 'all';
  api.readSetup(); api.refreshSetupControls();
  assert.match(fields.innerHTML, /data-case-field hidden/);
  assert.match(fields.innerHTML, /data-field="judge"/);
  controls.scope = 'one';
  controls.caseId = 'plain';
  api.readSetup(); api.refreshSetupControls();
  assert.doesNotMatch(fields.innerHTML, /data-case-field hidden|data-field="judge"/);
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
    assert.equal(startButton.disabled, true);
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
    const setupRegion = { hidden: false, innerHTML: '', querySelector: () => null };
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
        '[data-status-summary]': { focus() {} }, '[data-run-setup]': setupRegion })[selector],
      querySelectorAll: () => [], addEventListener() {} };
    const context = { document, URLSearchParams, setTimeout: (callback: () => void) => { timers.push(callback); },
      fetch: async (url: string) => ({ json: async () => {
        if (url === '/api/eval-runs/start') return { status: 'queued', runId: 'accepted' };
        if (url.startsWith('/api/eval-runs/history')) { historyRequests++; return { status: 'unavailable' }; }
        if (url.startsWith('/api/eval-runs/status')) { statusRequests++; return responses.shift(); }
        return { status: 'ready', models: [], judgeModels: [] };
      } }) };
    const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + WORKSPACE_RESULTS_CLIENT + WORKSPACE_REPAIR_CLIENT
      + '; renderWorkspace = () => { document.querySelector("[data-run-setup]").hidden = isActive() || startPending || startUncertain; };'
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
    assert.equal(setupRegion.hidden, true);
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
    assert.equal(setupRegion.hidden, false);
  }
});

test('review uses the current preview, returns focus on Back and Escape, and ignores late previews', async () => {
  const listeners = new Map<string, (event: { key: string; preventDefault(): void }) => void>();
  const controls = { scope: 'one', caseId: 'case-a', model: 'tested', judge: '', repeats: '1' };
  const requests: { resolve(value: unknown): void }[] = [];
  const reviewButton = { focus() { document.activeElement = reviewButton; }, disabled: false };
  const sheetButton = { focus() { document.activeElement = sheetButton; } };
  const slot = { innerHTML: '', set textContent(value: string) { if (value === '') this.innerHTML = ''; }, querySelector(selector: string): unknown {
    if (selector === 'button') return sheetButton;
    if (selector === '[role="dialog"]') return this.innerHTML.includes('role="dialog"') ? { querySelectorAll: () => [sheetButton] } : null;
    return null;
  } };
  const region = { isConnected: true, querySelector(selector: string): unknown {
    if (selector === '[data-action="review"]') return reviewButton;
    if (selector === 'input[name="scope"]:checked') return { value: controls.scope };
    if (selector === '[data-field="case"]') return { value: controls.caseId };
    if (selector === '[data-field="model"]') return { value: controls.model };
    if (selector === '[data-field="judge"]') return null;
    if (selector === '[data-field="repeats"]') return { value: controls.repeats };
    return null;
  } };
  const setupStatus = { textContent: '' };
  const document: { activeElement: unknown; getElementById(): { textContent: string }; querySelector(selector: string): unknown;
    addEventListener(name: string, listener: (event: { key: string; preventDefault(): void }) => void): void } = {
    activeElement: reviewButton,
    getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', name: 'Suite', testCases: [
      { id: 'case-a', name: 'Case A' }, { id: 'case-b', name: 'Case B' }] }] }) }),
    querySelector: selector => ({ '[data-workspace]': {}, '[data-sheet-slot]': slot, '[data-run-setup]': region,
      '[data-setup-status]': setupStatus })[selector],
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT
    + '; runtime={models:["tested"],judgeModels:[],rubricCaseIds:[]}; return {showReview,showSetup,closeSheet,getReview:()=>review};})()',
  { document, setupRegion: region, resetRepair() {}, fetch: async () => ({ json: () => new Promise(resolve => requests.push({ resolve })) }) }) as {
    showReview(): Promise<void>; showSetup(): void; closeSheet(): void; getReview(): unknown;
  };
  const ready = { status: 'ready', selectedCaseIds: ['case-a'], repeats: 1, model: 'tested', judgeModel: null,
    totalCalls: 2, targetCalls: 2, judgeCalls: 0, cost: { status: 'unavailable', reason: 'runner did not estimate' } };
  const first = api.showReview();
  await new Promise(resolve => setImmediate(resolve));
  requests[0]!.resolve(ready);
  await first;
  assert.match(slot.innerHTML, /<dt>Scope<\/dt><dd>1 test case/);
  assert.match(slot.innerHTML, /<dt>Test case<\/dt><dd>Case A/);
  assert.match(slot.innerHTML, /Cost unavailable: runner did not estimate/);
  api.showSetup();
  assert.equal(document.activeElement, reviewButton);
  assert.equal(api.getReview(), null);

  const second = api.showReview();
  await new Promise(resolve => setImmediate(resolve));
  requests[1]!.resolve(ready);
  await second;
  listeners.get('keydown')!({ key: 'Escape', preventDefault() {} });
  assert.equal(document.activeElement, reviewButton);
  assert.equal(api.getReview(), null);

  const late = api.showReview();
  await new Promise(resolve => setImmediate(resolve));
  controls.caseId = 'case-b';
  api.showSetup();
  requests[2]!.resolve(ready);
  await late;
  assert.equal(slot.innerHTML, '');
  assert.equal(api.getReview(), null);
});

test('double Start sends one reviewed snapshot and keeps setup collapsed until rejection', async () => {
  let finish!: (value: unknown) => void;
  let submissions = 0;
  let submitted: unknown;
  const button = { disabled: false };
  const reviewStatus = { textContent: '' };
  const region = { hidden: false };
  const progress = { textContent: '' };
  const slot = { querySelector: (selector: string) => ({ '[data-action="start"]': button,
    '[data-review-status]': reviewStatus })[selector] };
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
    querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-run-setup]': region,
      '[data-sheet-slot]': slot, '[data-progress]': progress })[selector], addEventListener() {} };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT
    + '; return {startRun,setReview(value){review=value;}};})()', { document,
    fetch: (_url: string, options: { body: string }) => { submissions++; submitted = JSON.parse(options.body);
      return Promise.resolve({ json: () => new Promise(resolve => { finish = resolve; }) }); } }) as {
      startRun(): Promise<void>; setReview(value: unknown): void;
    };
  api.setReview({ request: { suiteId: 'suite', scope: { type: 'all' }, model: 'tested', repeats: 2 },
    result: { selectedCaseIds: ['case'], targetCalls: 2, judgeCalls: 0, totalCalls: 2,
      cost: { status: 'unavailable', reason: 'not estimated' } } });
  const pending = api.startRun();
  await api.startRun();
  assert.equal(submissions, 1);
  assert.equal(region.hidden, true);
  assert.equal(button.disabled, true);
  assert.match(progress.textContent, /Starting run/);
  assert.deepEqual(JSON.parse(JSON.stringify(submitted)), { suiteId: 'suite', scope: { type: 'all' }, model: 'tested', repeats: 2,
    review: { selectedCaseIds: ['case'], targetCalls: 2, judgeCalls: 0, totalCalls: 2,
      cost: { status: 'unavailable', reason: 'not estimated' } } });
  finish({ status: 'blocked', reason: 'stale-review' });
  await pending;
  assert.equal(region.hidden, false);
  assert.match(reviewStatus.textContent, /stale-review.*Check History/);
  await api.startRun();
  assert.equal(submissions, 1);
});
