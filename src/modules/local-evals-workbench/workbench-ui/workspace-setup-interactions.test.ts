import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_SUITE_MODELS_CLIENT } from './workspace-suite-models-client.js';

test('Suite models keeps draft changes local until Save and resets roles independently', async () => {
  const requests: unknown[] = [];
  const runRequests: string[] = [];
  const listeners = new Map<string, (event: any) => void>();
  const nodes = new Map<string, { textContent: string; hidden: boolean; disabled: boolean; focus(): void }>();
  const one = (key: string) => {
    if (!nodes.has(key)) nodes.set(key, { textContent: '', hidden: false, disabled: false, focus() {} });
    return nodes.get(key)!;
  };
  let dialog = '', closed = 0;
  const runtime = { models: ['X', 'Y'], judgeModels: ['J'], rubricCaseIds: ['rubric'] };
  const fragment = `let suite = {id:'suite',name:'Suite'}; let runtime = ${JSON.stringify(runtime)};
    let runtimeState = 'ready', sheetReturn = null;
    const one = globalThis.one, esc = value => String(value ?? ''), json = globalThis.json,
      post = globalThis.post, openSheet = globalThis.openSheet, closeSheet = globalThis.closeSheet;
    ${WORKSPACE_SUITE_MODELS_CLIENT}
    return {loadSavedSuiteModels, openSuiteModels, saveSuiteModels, renderSuiteModelSummary, choiceMarkup,
      draft:()=>suiteModelsDraft, setDraft: value => {suiteModelsDraft=value},
      setRuntime: value => {runtime=value}, saved:()=>savedSuiteModels};`;
  const api = vm.runInNewContext('(() => {' + fragment + '})()', {
    one, document: { addEventListener(name: string, listener: (event: any) => void) { listeners.set(name, listener); } },
    json: async () => ({ status: 'ready', suiteId: 'suite', token: 'a'.repeat(64), defaultTestedModel: 'X', defaultJudgeModel: 'J' }),
    post: async (url: string, body: unknown) => {
      if (url.includes('/run')) runRequests.push(url);
      requests.push(body);
      return { status: 'saved', token: 'b'.repeat(64), modelId: (body as { modelId?: string }).modelId ?? null };
    },
    openSheet: (_title: string, content: string) => { dialog = content; },
    closeSheet: () => { closed++; },
  }) as { loadSavedSuiteModels(): Promise<void>; openSuiteModels(): Promise<void>; saveSuiteModels(): Promise<void>;
    renderSuiteModelSummary(): void; draft(): { tested: string; judge: string } | null;
    setDraft(value: { tested: string; judge: string }): void; setRuntime(value: unknown): void;
    choiceMarkup(role: string, label: string, value: string, choices: string[]): string;
    saved(): { defaultTestedModel: string | null; defaultJudgeModel: string } };
  await api.loadSavedSuiteModels();
  assert.equal(one('[data-suite-tested]').textContent, 'X');
  assert.equal(one('[data-suite-judge]').textContent, 'J');
  await api.openSuiteModels();
  assert.match(dialog, /Suite models|id="suite-tested"/);
  assert.match(dialog, /id="suite-judge"/);
  assert.match(dialog, /Reset default/);
  assert.match(api.choiceMarkup('tested', 'Model', 'old', ['X']), /old is unavailable\. Choose a replacement/);
  assert.match(api.choiceMarkup('tested', 'Model', 'old', ['X']), /value="old" selected>old · Unavailable/);
  listeners.get('click')!({ target: { closest: () => ({ dataset: { action: 'cancel-suite-models' } }) } });
  assert.equal(requests.length, 0, 'Cancel must not write');
  assert.equal(api.draft(), null);
  assert.equal(closed, 1);
  assert.deepEqual(runRequests, [], 'Cancel must not dispatch a run');
  await api.openSuiteModels();
  api.setDraft({ tested: '', judge: 'J' });
  assert.equal(requests.length, 0, 'draft reset must not write');
  await api.saveSuiteModels();
  assert.deepEqual(requests.map(value => JSON.parse(JSON.stringify(value))), [
    { suiteId: 'suite', role: 'tested', action: 'reset', expectedToken: 'a'.repeat(64) },
  ]);
  assert.equal(api.saved().defaultTestedModel, null);
  assert.equal(api.saved().defaultJudgeModel, 'J');
  assert.equal(one('[data-suite-tested]').textContent, 'Not set');
  assert.equal(closed, 2);
  assert.match(one('[data-suite-model-status]').textContent, /saved/);
  assert.deepEqual(runRequests, [], 'Save must not dispatch a run');
  api.setRuntime({ models: ['X'], judgeModels: [], rubricCaseIds: [] });
  api.renderSuiteModelSummary();
  assert.equal(one('[data-suite-judge-row]').hidden, true, 'deterministic-only suites omit Judge');
  await api.openSuiteModels();
  assert.doesNotMatch(dialog, /id="suite-judge"/);
});

test('Suite models Cancel, Close, and Save restore focus without starting a run', async () => {
  const listeners = new Map<string, ((event: any) => void)[]>();
  const nodes = new Map<string, { textContent: string; hidden: boolean; disabled: boolean; focus(): void }>();
  const runRequests: string[] = [];
  let activeElement: unknown;
  let markup = '';
  const one = (selector: string) => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '', hidden: false, disabled: false, focus() { activeElement = this; } });
    return nodes.get(selector)!;
  };
  const trigger = one('[data-action="suite-models"]');
  const heading = { focus() { activeElement = heading; } };
  const sheetSlot = {
    set innerHTML(value: string) { markup = value; },
    set textContent(value: string) { if (!value) markup = ''; },
    querySelector(selector: string) {
      if (selector === '#sheet-title') return heading;
      if (selector === '[role="dialog"]') return markup ? {} : null;
      if (selector === '[data-action="close-detail"]') return null;
      return null;
    },
  };
  const document = {
    get activeElement() { return activeElement; },
    set activeElement(value: unknown) { activeElement = value; },
    querySelector(selector: string) { return selector === '[data-workspace]' ? {} : selector === '[data-sheet-slot]' ? sheetSlot : one(selector); },
    getElementById() { return { textContent: '{"suites":[{"id":"suite","name":"Suite","testCases":[]}]}' }; },
    addEventListener(name: string, listener: (event: any) => void) { listeners.set(name, [...(listeners.get(name) || []), listener]); },
  };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '\n' + WORKSPACE_SUITE_MODELS_CLIENT
    + '\nreturn {loadSavedSuiteModels, openSuiteModels, setRuntime: value => {runtime=value}, setDraft: value => {suiteModelsDraft=value}, setRuntimeState};})()', {
      document, navigator: {},
      fetch: async (url: string, options?: { body?: string }) => ({ json: async () => {
        if (url.includes('/run')) runRequests.push(url);
        if (url.includes('saved-choice') && !options) return { status: 'ready', suiteId: 'suite', token: 'a'.repeat(64), defaultTestedModel: 'X', defaultJudgeModel: 'J' };
        if (url.includes('saved-choice') && options?.body) {
          const body = JSON.parse(options.body);
          return { status: 'saved', token: 'b'.repeat(64), modelId: body.modelId ?? null };
        }
        return {};
      } }),
    }) as { loadSavedSuiteModels(): Promise<void>; openSuiteModels(): Promise<void>;
      setRuntime(value: unknown): void; setDraft(value: { tested: string; judge: string }): void;
      setRuntimeState(state: string, message: string): void };
  const click = (action: string) => {
    const event = { target: { closest: () => ({ dataset: { action } }) } };
    for (const listener of listeners.get('click') || []) listener(event);
  };
  const open = async () => {
    activeElement = trigger;
    await api.openSuiteModels();
    assert.equal(activeElement, heading, 'opening the dialog moves focus inside');
  };
  api.setRuntime({ models: ['X', 'Y'], judgeModels: ['J'], rubricCaseIds: ['rubric'] });
  api.setRuntimeState('ready', 'Compatible models ready.');
  await api.loadSavedSuiteModels();
  await open();
  click('cancel-suite-models');
  assert.equal(activeElement, trigger, 'Cancel restores focus to the originating Models trigger');
  await open();
  click('close-sheet');
  assert.equal(activeElement, trigger, 'Close restores focus to the originating Models trigger');
  await open();
  api.setDraft({ tested: '', judge: 'J' });
  click('save-suite-models');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(activeElement, trigger, 'Save restores focus to the originating Models trigger');
  assert.match(one('[data-suite-model-status]').textContent, /saved/);
  assert.equal(markup, '', 'Save closes the dialog');
  assert.deepEqual(runRequests, [], 'Cancel, Close, and Save do not dispatch a run');
});

const startReference = '123e4567-e89b-42d3-a456-426614174000';
const startNotice = () => {
  const nodes = new Map<string, { textContent: string; hidden: boolean; focus(): void }>();
  return { hidden: true, querySelector(key: string) {
    if (!nodes.has(key)) nodes.set(key, { textContent: '', hidden: false, focus() {} });
    return nodes.get(key);
  } };
};

test('loading and known blocked reasons stay beside an unavailable model choice', async () => {
  const fields = { innerHTML: '' };
  const review = { disabled: false };
  const announcement = { textContent: '' };
  const region = { querySelector: (selector: string) => ({ '[data-setup-fields]': fields, '[data-action="start"]': review })[selector] };
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
  assert.match(fields.innerHTML, /could not start this suite/);
  assert.match(fields.innerHTML, /data-model-readiness/);
  assert.equal(review.disabled, true);
  assert.match(announcement.textContent, /could not start this suite/);
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
  const controls = { scope: 'one', caseId: 'plain', model: '', judge: '' };
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
    if (selector === '[data-action="start"]') return reviewAction;
    if (selector === 'input[name="scope"]:checked') return { value: controls.scope };
    if (selector === '[data-field="case"]') return { value: controls.caseId };
    if (selector === '[data-field="model"]') return { value: controls.model };
    if (selector === '[data-field="judge"]') return fields.innerHTML.includes('data-field="judge"') ? { value: controls.judge } : null;
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

test('one-click Start submits selection once without review and preserves blocked guidance', async () => {
  const button = { disabled: false };
  const progress = { textContent: '' };
  const notice = startNotice();
  const region = { hidden: false, querySelector: (key: string) => key === '[data-action="start"]' ? button
    : key === 'input[name="scope"]:checked' ? { value: 'one' } : key === '[data-field="case"]' ? { value: 'case' }
    : key === '[data-field="model"]' ? { value: 'model' } : null };
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [{ id: 'case' }] }] }) }),
    querySelector: (key: string) => ({ '[data-workspace]': {}, '[data-run-setup]': region,
      '[data-progress]': progress, '[data-start-notice]': notice })[key], addEventListener() {} };
  let finish!: (value: unknown) => void;
  const requests: Record<string, unknown>[] = [];
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT
    + '; runtime={models:["model"],judgeModels:[],rubricCaseIds:[]};setup.model="model";return {startRun};})()',
    { document, crypto: { randomUUID: () => startReference }, fetch: async (_url: string, options: { body: string }) => {
      requests.push(JSON.parse(options.body) as Record<string, unknown>);
      return { status: 422, json: () => new Promise(resolve => { finish = resolve; }) };
    } }) as { startRun(): Promise<void> };
  const pending = api.startRun();
  await api.startRun();
  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0])), { suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' },
    model: 'model', judgeModel: null });
  finish({ status: 'blocked', reason: 'runner-timeout', reference: startReference,
    issue: { stage: 'run-start', outcome: 'blocked', category: 'runner-timeout', reference: startReference, recoveryAction: 'retry' } });
  await pending;
  assert.match(progress.textContent, /Run start blocked/);
  assert.equal(notice.hidden, false);
});
