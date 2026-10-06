import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

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
