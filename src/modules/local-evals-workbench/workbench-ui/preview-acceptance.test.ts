import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKBENCH_CLIENT_SCRIPT } from './workbench-client.js';
import { WORKSPACE_RUN_PREVIEW_CLIENT } from './workspace-run-preview-client.js';
import { WORKSPACE_RUN_START_CLIENT } from './workspace-run-start-client.js';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_SUITE_MODELS_CLIENT } from './workspace-suite-models-client.js';

type FakeElement = { value: string; disabled: boolean; hidden: boolean; textContent: string; add(option: { value: string }): void; focus(): void };
function element(value = ''): FakeElement {
  return { value, disabled: false, hidden: false, textContent: '', add(option) { if (!this.value) this.value = option.value; }, focus() {} };
}
function browser(rubricCaseIds: string[] = []) {
  const controls = new Map([['run', element()], ['model', element()], ['judge', element()], ['test-case', element('case')]]);
  const judgeField = element();
  const status = element();
  let selectedScope = 'all';
  const listeners = new Map<string, (event: unknown) => Promise<void>>();
  const requests: { route: string; body: Record<string, unknown> }[] = [];
  const root = {
    addEventListener(type: string, listener: (event: unknown) => Promise<void>) { listeners.set(type, listener); },
    querySelector(selector: string) {
      const control = /^\[data-control="([^"]+)"\]$/.exec(selector);
      if (control) return controls.get(control[1]!) ?? null;
      if (selector === '[data-preview-judge]') return judgeField;
      if (selector === '[data-preview-status]') return status;
      if (selector === 'input[name="runScope"]:checked') return { value: selectedScope };
      return null;
    },
    querySelectorAll() { return []; },
  };
  const state = { discovery: { status: 'ready', suites: [{ id: 'suite', testCases: [{ id: 'case' }, { id: 'rubric' }] }] },
    selectedSuiteId: 'suite', selectedEvalRunModel: 'fake/model', runScope: { type: 'all' } };
  vm.runInNewContext(WORKBENCH_CLIENT_SCRIPT, {
    document: { querySelector: () => root, getElementById: () => ({ textContent: JSON.stringify(state) }) },
    window: {}, URLSearchParams, setTimeout, Option: class { constructor(readonly label: string, readonly value: string) {} },
    fetch: async (route: string, options?: { body: string }) => {
      if (route.startsWith('/api/eval-runs/status?')) return { json: async () => ({ status: 'ok', value: { summary: { state: 'completed', cases: [], createdAt: Date.now(), finishedAt: Date.now() } } }) };
      requests.push({ route, body: JSON.parse(options!.body) as Record<string, unknown> });
      if (route.endsWith('/describe')) return { json: async () => ({ status: 'ready', models: ['fake/model'], judgeModels: ['fake/judge'], rubricRequired: rubricCaseIds.length > 0, rubricCaseIds }) };
      return { json: async () => ({ status: 'queued', suiteId: 'suite', runId: 'run' }) };
    },
  });
  const emit = async (type: string, control: string) => {
    if (type === 'change' && control === 'test-case') selectedScope = 'test_case';
    const target = { matches: (selector: string) => selector === `[data-control="${control}"]`, closest: () => null, value: controls.get(control)?.value };
    await listeners.get(type)?.({ target });
  };
  return { controls, judgeField, status, requests, emit };
}

test('one click starts a selected run without preview or review payload', async () => {
  const app = browser();
  await new Promise(resolve => setImmediate(resolve));
  await app.emit('click', 'run');
  assert.deepEqual(app.requests.map(request => request.route), ['/api/eval-suites/describe', '/api/eval-runs/start']);
  assert.equal(app.requests[1]?.body.model, 'fake/model');
  assert.equal(Object.hasOwn(app.requests[1]?.body ?? {}, 'review'), false);
  await app.emit('click', 'run');
  assert.equal(app.requests.filter(request => request.route === '/api/eval-runs/start').length, 1);
});

test('selected rubric case sends separate judge model directly to start', async () => {
  const app = browser(['rubric']);
  await new Promise(resolve => setImmediate(resolve));
  app.controls.get('judge')!.value = 'fake/judge';
  app.controls.get('test-case')!.value = 'rubric';
  await app.emit('change', 'test-case');
  assert.equal(app.judgeField.hidden, false);
  await app.emit('click', 'run');
  const start = app.requests.find(request => request.route === '/api/eval-runs/start')?.body;
  assert.equal(start?.judgeModel, 'fake/judge');
  assert.equal((start?.scope as { testCaseId: string }).testCaseId, 'rubric');
});

test('run-only payload is one-case only and ordered preview renders server choices without estimates', async () => {
  const setupApi = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT
    + '; return {command, setupMarkup, set: value => {setup=value}, setRuntime: value => {runtime=value}, setSuite: value => {suite=value}};})()', {
      document: { querySelector: (key: string) => key === '[data-workspace]' ? {} : null,
        getElementById: () => ({ textContent: '{"suites":[{"id":"suite","testCases":[{"id":"a"},{"id":"b"}]}]}' }), addEventListener() {} },
      needsJudge: () => true,
    }) as { command(): Record<string, unknown>; setupMarkup(): string; set(value: unknown): void;
      setRuntime(value: unknown): void; setSuite(value: unknown): void };
  setupApi.setSuite({ testCases: [{ id: 'a', name: 'First' }, { id: 'b', name: 'Second' }] });
  setupApi.setRuntime({ models: ['Y'], judgeModels: ['J'], rubricCaseIds: ['b'] });
  setupApi.set({ scope: 'one', caseId: 'b', choice: 'temporary', temporaryModel: 'Y', temporaryJudge: 'J' });
  assert.deepEqual(JSON.parse(JSON.stringify(setupApi.command())).runOnly, { testedModel: 'Y', judgeModel: 'J' });
  assert.match(setupApi.setupMarkup(), /data-run-only[\s\S]*data-field="temporary-model"[\s\S]*data-field="temporary-judge"/,
    'one-case temporary selection presents tested-model and applicable Judge controls');
  setupApi.set({ scope: 'all', caseId: 'b', choice: 'temporary', temporaryModel: 'Y', temporaryJudge: 'J' });
  assert.equal('runOnly' in setupApi.command(), false);
  assert.doesNotMatch(setupApi.setupMarkup(), /data-run-only|temporary-model|temporary-judge/,
    'full-suite scope omits temporary model controls');

  const list = { innerHTML: '' }, status = { textContent: '' };
  const requests: unknown[] = [];
  const preview = vm.runInNewContext('(() => {' + WORKSPACE_RUN_PREVIEW_CLIENT + ';return {previewRun};})()', {
    one: (key: string) => key === '[data-run-preview-list]' ? list : key === '[data-run-preview-status]' ? status : null,
    esc: (value: unknown) => String(value), suite: { id: 'suite', testCases: [{ id: 'a', name: 'First' }, { id: 'b', name: 'Second' }] },
    runtimeState: 'ready', selectedCaseIds: () => ['a', 'b'], needsJudge: () => true,
    command: () => ({ suiteId: 'suite', scope: { type: 'all' } }),
    post: async (_route: string, body: unknown) => { requests.push(body); return { status: 'ready', previewToken: 'a'.repeat(64),
      caseSelections: [{ caseId: 'a', testedModel: 'X', judgeModel: null },
        { caseId: 'b', testedModel: 'Y', judgeModel: 'J' }], priceEstimate: 'PRICE-SENTINEL', estimatedCalls: 999 }; },
  }) as { previewRun(): Promise<unknown> };
  await preview.previewRun();
  assert.ok(list.innerHTML.indexOf('First') < list.innerHTML.indexOf('Second'));
  assert.match(list.innerHTML, /Model X/);
  assert.match(list.innerHTML, /Model Y.*Judge model J/);
  assert.doesNotMatch(list.innerHTML + status.textContent, /PRICE-SENTINEL|999|estimate|cost|call count/i);
  assert.equal(requests.length, 1);
});

test('one-case preview and start carry the same temporary choices without saving them', async () => {
  const requests: { route: string; body: Record<string, unknown> }[] = [];
  const button = { disabled: false };
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  const choice = { suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'rubric' },
    runOnly: { testedModel: 'Y', judgeModel: 'J' } };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_RUN_START_CLIENT + ';return {startRun};})()', {
    readSetup() {}, runtime: {}, setup: { scope: 'one', choice: 'temporary', temporaryModel: 'Y', temporaryJudge: 'J' },
    needsJudge: () => true, previewingStart: false, startPending: false, startUncertain: false,
    isActive: () => false, one: (selector: string) => selector === '[data-run-preview-list]' ? {}
      : selector === '[data-setup-status]' ? { textContent: '' } : null,
    previewRun: async () => { requests.push({ route: 'preview', body: choice }); return { status: 'ready' }; },
    command: () => choice, previewToken: 'a'.repeat(64), crypto: { randomUUID: () => reference },
    safeReference: (value: string) => value === reference, safeRunId: () => true,
    setupRegion: { querySelector: () => button }, status() {}, showStartNotice() {},
    fetch: async (route: string, options: { body: string }) => {
      requests.push({ route, body: JSON.parse(options.body) as Record<string, unknown> });
      return { status: 202, json: async () => ({ status: 'queued', suiteId: 'suite', runId: 'run', reference }) };
    },
    suite: { id: 'suite' }, clearSelectedDetail() {}, renderWorkspace() {}, pollRun() {}, loadHistory() {},
  }) as { startRun(): Promise<void> };
  await api.startRun();
  assert.deepEqual(requests.map(item => item.route), ['preview', '/api/eval-runs/start']);
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0]?.body)), choice);
  assert.deepEqual(JSON.parse(JSON.stringify(requests[1]?.body)), { ...choice, previewToken: 'a'.repeat(64) });
  assert.ok(requests.every(item => !item.route.includes('saved-choice')));
});

test('blocked Start opens the affected Suite models choice and does not start after the decision', async () => {
  for (const [reason, outcome] of [
    ['missing-suite-default', 'save'], ['missing-suite-default', 'cancel'],
    ['saved-model-unavailable', 'save'], ['saved-model-unavailable', 'cancel'],
  ] as const) {
    const requests: string[] = [];
    const listeners = new Map<string, (event: unknown) => void>();
    const browserState = { dialog: '', focused: '' };
    const start = { disabled: false, focus() { browserState.focused = 'start'; } };
    const api = vm.runInNewContext('(() => { let suite = {id:"suite",name:"Suite"}; '
      + 'let runtime = {models:["X"],judgeModels:["J"],rubricCaseIds:["rubric"]}; let runtimeState="ready", sheetReturn=null; '
      + 'let setup={scope:"all",choice:"saved"}, previewingStart=false, startPending=false, startUncertain=false; '
      + 'const one = selector => ({textContent:"", disabled:false, focus(){browserState.focused=selector}}); '
      + 'const esc = value => String(value ?? ""); '
      + 'const readSetup=()=>{}; '
      + 'const json = async () => ({status:"ready",token:"' + 'a'.repeat(64) + '",defaultTestedModel:"X",defaultJudgeModel:'
      + JSON.stringify(reason === 'missing-suite-default' ? null : 'old') + '}); '
      + 'const post = async (route, body) => { requests.push(route); return {status:"saved",token:"' + 'b'.repeat(64) + '",modelId:body.modelId ?? null}; }; '
      + 'const openSheet = (_title, content) => {browserState.dialog=content}; '
      + 'const closeSheet = () => {browserState.dialog=""; sheetReturn?.focus(); sheetReturn=null}; '
      + WORKSPACE_SUITE_MODELS_CLIENT + WORKSPACE_RUN_START_CLIENT
      + '\nreturn {startRun, saveSuiteModels};})()', {
      browserState,
      document: { addEventListener(name: string, listener: (event: unknown) => void) { listeners.set(name, listener); } },
      setupRegion: { querySelector: () => start },
      requests,
      isActive: () => false, needsJudge: () => false,
      previewRun: async () => ({ status: 'blocked', reason, role: 'judge' }),
      fetch: async (route: string) => { requests.push(route); throw Error('Unexpected run start'); },
    }) as { startRun(): Promise<void>; saveSuiteModels(): Promise<void>; openSuiteModels(role: string): Promise<void> };
    await api.startRun();
    assert.match(browserState.dialog, /id="suite-judge"/, 'blocked Start opens the real Suite models dialog');
    assert.equal(browserState.focused, '[data-suite-role="judge"]', 'real dialog focuses the affected role choice');
    if (outcome === 'save') {
      listeners.get('change')!({ target: { dataset: { suiteRole: 'judge' }, value: 'J' } });
      await api.saveSuiteModels();
      assert.equal(browserState.focused, 'start', 'Save returns focus to Start run');
    } else {
      listeners.get('click')!({ target: { closest: () => ({ dataset: { action: 'cancel-suite-models' } }) } });
      assert.equal(browserState.focused, 'start', 'Cancel returns focus to Start run');
    }
    assert.deepEqual(requests, outcome === 'save' ? ['/api/eval-suites/saved-choice'] : [],
      'neither blocked decision dispatches a run');
  }
});
