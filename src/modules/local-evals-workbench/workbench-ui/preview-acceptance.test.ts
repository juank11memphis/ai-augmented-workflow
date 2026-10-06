import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { previewEvalRun } from '../preview-eval-run/handler.js';
import type { PreviewEvalRunCommand } from '../preview-eval-run/command.js';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { WORKBENCH_CLIENT_SCRIPT } from './workbench-client.js';

type FakeElement = {
  value: string; disabled: boolean; hidden: boolean; textContent: string; innerHTML: string;
  add(option: { value: string }): void; focus(): void;
};
function element(value = ''): FakeElement {
  const node = { value, disabled: false, hidden: false, textContent: '', innerHTML: '', add(option: { value: string }) { if (!this.value) this.value = option.value; }, focus() {} };
  return node;
}
function browser(
  cost: { status: 'available'; amount: number; currency: string } | { status: 'unavailable'; reason: string },
  options: { rubric?: boolean; mixed?: boolean; deferPreview?: boolean; onPreview?: (command: PreviewEvalRunCommand) => Promise<unknown> } = {}
) {
  const controls = new Map<string, FakeElement>([
    ['run', element()], ['model', element()], ['judge', element()], ['repeats', element('1')],
    ['preview-back', element()], ['preview-start', element()], ['test-case', element('case')],
  ]);
  const judgeField = element();
  judgeField.hidden = true;
  const slot = element();
  const status = element();
  const documentState: { querySelector: () => typeof root; getElementById: () => { textContent: string }; activeElement: FakeElement | null } = {
    querySelector: () => root,
    getElementById: () => ({ textContent: JSON.stringify(state) }),
    activeElement: null,
  };
  for (const control of controls.values()) control.focus = () => { documentState.activeElement = control; };
  const listeners = new Map<string, (event: unknown) => Promise<void>>();
  const starts: unknown[] = [];
  const requests: { route: string; body: Record<string, unknown> }[] = [];
  let releasePreview: (() => void) | undefined;
  let selectedScope = 'all';
  const root = {
    addEventListener(type: string, listener: (event: unknown) => Promise<void>) { listeners.set(type, listener); },
    querySelector(selector: string): FakeElement | null {
      const control = /^\[data-control="([^"]+)"\]$/.exec(selector);
      if (control) return controls.get(control[1]!) ?? null;
      if (selector === '[data-preview-judge]') return judgeField;
      if (selector === 'input[name="runScope"]:checked') return { value: selectedScope } as FakeElement;
      if (selector === '[data-preview-dialog-slot]') return slot;
      if (selector === '[data-preview-status]') return status;
      if (selector === '[data-preview-overlay] .cell-dialog' && slot.innerHTML) return {
        querySelectorAll: () => [controls.get('preview-back'), controls.get('preview-start')],
        contains: (node: FakeElement) => node === controls.get('preview-back') || node === controls.get('preview-start'),
      } as unknown as FakeElement;
      return null;
    },
    querySelectorAll() { return []; },
  };
  const state = { discovery: { status: 'ready', suites: [{ id: 'suite', testCases: [{ id: 'case' }, { id: 'rubric' }] }] }, selectedSuiteId: 'suite', selectedEvalRunModel: 'fake/model', runScope: { type: 'all' as 'all' | 'test_case' } };
  const context = {
    document: documentState,
    window: {},
    URLSearchParams,
    setTimeout,
    Option: class { constructor(readonly label: string, readonly value: string) {} },
    fetch: async (route: string, requestOptions?: { body: string }) => {
      if (route.startsWith('/api/eval-runs/status?')) return { json: async () => ({ status: 'ok', value: { summary: { state: 'completed', cases: [], createdAt: Date.now(), finishedAt: Date.now() } } }) };
      requests.push({ route, body: JSON.parse(requestOptions!.body) as Record<string, unknown> });
      if (route === '/api/eval-runs/start') { starts.push(requests.at(-1)?.body); return { json: async () => ({ status: 'queued', suiteId: 'suite', runId: 'run' }) }; }
      if (route.endsWith('/describe')) return { json: async () => ({ status: 'ready', models: ['fake/model'], judgeModels: options.rubric || options.mixed ? ['fake/judge'] : [], rubricRequired: !!(options.rubric || options.mixed), rubricCaseIds: options.mixed ? ['rubric'] : options.rubric ? ['case', 'rubric'] : [] }) };
      const response = { json: async () => options.onPreview ? options.onPreview(JSON.parse(requestOptions!.body) as PreviewEvalRunCommand) : ({ status: 'ready', suiteId: 'suite', selectedCaseIds: ['case'], model: 'fake/model', judgeModel: null,
        targetCalls: 1, judgeCalls: 0, totalCalls: 1, cost, requiresConfirmation: true }) };
      if (!options.deferPreview) return response;
      return new Promise<typeof response>((resolve) => { releasePreview = () => resolve(response); });
    },
  };
  vm.runInNewContext(WORKBENCH_CLIENT_SCRIPT, context);
  const emit = async (type: string, control: string) => {
    if (type === 'change' && control === 'test-case') selectedScope = 'test_case';
    const target = { matches: (selector: string) => selector === `[data-control="${control}"]`, closest: () => null, value: controls.get(control)?.value };
    await listeners.get(type)?.({ target });
  };
  const keydown = async (key: string, shiftKey = false) => {
    await listeners.get('keydown')?.({ key, shiftKey, preventDefault() {}, target: { closest: () => null } });
  };
  return { controls, documentState, judgeField, slot, status, starts, requests, emit, keydown, releasePreview: () => releasePreview?.() };
}
test('unavailable cost requires explicit Start run after review and Back keeps selection', async () => {
  const app = browser({ status: 'unavailable', reason: '<pricing unavailable>' });
  await new Promise((resolve) => setImmediate(resolve));
  await app.emit('click', 'run');
  assert.match(app.slot.innerHTML, /Cost unavailable/);
  assert.match(app.slot.innerHTML, /&lt;pricing unavailable&gt;/);
  assert.equal(app.starts.length, 0);
  await app.emit('click', 'preview-back');
  assert.equal(app.starts.length, 0);
  assert.equal(app.controls.get('model')?.value, 'fake/model');
  await app.emit('click', 'run');
  await app.emit('click', 'preview-start');
  await app.emit('click', 'preview-start');
  assert.equal(app.starts.length, 1);
  assert.equal(app.requests.filter((request) => request.route === '/api/eval-runs/start').length, 1);
});
test('changed selection invalidates the review and blocks stale confirmation', async () => {
  const app = browser({ status: 'available', amount: 0.01, currency: 'USD' });
  await new Promise((resolve) => setImmediate(resolve));
  await app.emit('click', 'run');
  assert.match(app.slot.innerHTML, /Actual cost may vary/);
  app.controls.get('model')!.value = 'fake/other';
  await app.emit('change', 'model');
  await app.emit('click', 'preview-start');
  assert.equal(app.starts.length, 0);
});
test('rubric setup reveals an independent Judge control and sends its explicit choice', async () => {
  const app = browser({ status: 'available', amount: 0.01, currency: 'USD' }, { rubric: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.judgeField.hidden, false);
  app.controls.get('judge')!.value = 'fake/judge';
  await app.emit('click', 'run');
  assert.equal(app.requests.at(-1)?.body.judgeModel, 'fake/judge');
});
test('a changed selection ignores an earlier pending preview response', async () => {
  const app = browser({ status: 'unavailable', reason: 'Pricing unavailable.' }, { deferPreview: true });
  await new Promise((resolve) => setImmediate(resolve));
  const pending = app.emit('click', 'run');
  await new Promise((resolve) => setImmediate(resolve));
  app.controls.get('model')!.value = 'fake/other';
  await app.emit('change', 'model');
  assert.equal(app.controls.get('run')?.disabled, false);
  assert.equal(app.controls.get('run')?.textContent, 'Review run');
  app.releasePreview();
  await pending;
  assert.equal(app.controls.get('run')?.disabled, false);
  assert.equal(app.controls.get('run')?.textContent, 'Review run');
  assert.equal(app.starts.length, 0);
  assert.equal(app.slot.innerHTML, '');
});
test('mixed suite sends selected-case Judge policy from UI through preview handler', async () => {
  const suite: NormalizedEvalSuite = {
    version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
    target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [
      { id: 'case', name: 'Deterministic', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], toolMocks: [], assertions: [{ id: 'check', type: 'output-contains', expected: 'Hi' }], graders: [] },
      { id: 'rubric', name: 'Rubric', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], toolMocks: [], assertions: [], graders: [{ id: 'tone', type: 'rubric', rubric: { type: 'inline', text: 'Kind' }, threshold: 0.8 }] },
    ],
  };
  const app = browser({ status: 'available', amount: 0.01, currency: 'USD' }, { mixed: true,
    onPreview: (command) => previewEvalRun(command, {
      suites: { load: async () => suite },
      runner: {
        describe: async () => ({ status: 'ready', value: { runnerId: 'fake', capabilities: ['single-turn', 'rubric'], models: ['fake/model'], judgeModels: ['fake/judge'], requiredEnvironment: [], costEstimation: true } }),
        estimate: async (_suite, input) => ({ status: 'ready', value: { targetCalls: 1, judgeCalls: input.judgeModel ? 1 : 0, totalCalls: input.judgeModel ? 2 : 1, cost: { status: 'available', amount: 0.01, currency: 'USD' } } }),
      },
      artifacts: { check: async () => ({ status: 'ready', value: null }) },
      inputs: { resolve: async (cases) => ({ status: 'ready', value: cases }) },
    }) });
  await new Promise((resolve) => setImmediate(resolve));
  app.controls.get('judge')!.value = 'fake/judge';
  app.controls.get('test-case')!.value = 'case';
  await app.emit('change', 'test-case');
  assert.equal(app.judgeField.hidden, true);
  await app.emit('click', 'run');
  assert.equal(app.requests.at(-1)?.body.judgeModel, null);
  assert.match(app.slot.innerHTML, /Review run/);
  assert.equal((app.requests.at(-1)?.body.scope as { testCaseId: string }).testCaseId, 'case');
  app.controls.get('test-case')!.value = 'rubric';
  await app.emit('change', 'test-case');
  assert.equal(app.judgeField.hidden, false);
  await app.emit('click', 'run');
  assert.equal(app.requests.at(-1)?.body.judgeModel, 'fake/judge');
  assert.match(app.slot.innerHTML, /Judge Model/);
});
test('review dialog traps keyboard focus and Escape does not start a run', async () => {
  const app = browser({ status: 'available', amount: 0.01, currency: 'USD' });
  await new Promise((resolve) => setImmediate(resolve));
  await app.emit('click', 'run');
  assert.equal(app.documentState.activeElement, app.controls.get('preview-back'));
  await app.keydown('Tab', true);
  assert.equal(app.documentState.activeElement, app.controls.get('preview-start'));
  await app.keydown('Escape');
  assert.equal(app.documentState.activeElement, app.controls.get('run'));
  await app.emit('click', 'preview-start');
  assert.equal(app.starts.length, 0);
});
