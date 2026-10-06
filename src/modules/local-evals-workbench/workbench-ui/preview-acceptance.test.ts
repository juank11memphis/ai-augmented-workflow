import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKBENCH_CLIENT_SCRIPT } from './workbench-client.js';

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
