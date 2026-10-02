import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';

function browser() {
  const listeners = new Map<string, (event: { target: SearchInput }) => void>();
  const document = { activeElement: null as SearchInput | null,
    querySelectorAll: () => [],
    addEventListener: (type: string, listener: (event: { target: SearchInput }) => void) => listeners.set(type, listener) };
  const input: SearchInput = { value: '', selectionStart: 0, selectionEnd: 0,
    matches: (selector: string) => selector === '[data-action="search"]',
    focus() { document.activeElement = input; } };
  const section = {}, count = { textContent: '' }, list = { innerHTML: '' }, empty = { hidden: true, textContent: '' };
  const failureFilter = { checked: false };
  const parts: Record<string, unknown> = { '.results': section, '#results-title small': count,
    '[data-result-list]': list, '[data-result-empty]': empty,
    '[data-action="search"]': input, '[data-action="failures-only"]': failureFilter };
  let replacements = 0;
  const results = { querySelector: (selector: string) => parts[selector] ?? null,
    set innerHTML(_value: string) { replacements++; }, get innerHTML() { return ''; } };
  const statusSummary = { textContent: '', focus() { document.activeElement = null; } };
  const nodes: Record<string, unknown> = {
    '[data-results-container]': results, '[data-detail]': { innerHTML: '', hidden: false },
    '[data-side-panel]': { hidden: true }, '[data-suite-title]': { textContent: '' },
    '[data-suite-description]': { textContent: '' }, '[data-action="suite-select"]': { value: '' },
    '[data-action="coverage"]': { hidden: false }, '[data-action="history"]': { hidden: false },
    '[data-latest-label]': { textContent: '' }, '[data-status-summary]': statusSummary,
    '[data-run-metrics]': { textContent: '' },
  };
  let resolvePoll: ((value: unknown) => void) | undefined;
  const context = {
    document, URLSearchParams, Date, one: (selector: string) => nodes[selector],
    esc: (value: unknown) => String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!),
    suite: { id: 'suite', name: 'Suite', description: '', testCases: [
      { id: 'alpha', name: 'Alpha case' }, { id: 'beta', name: 'Beta case' },
      { id: 'gamma', name: 'Gamma case' },
    ] }, suites: [], run: null as null | { runId: string; state: string; caseIds: string[];
      cases: { caseId: string; state: string; attempts: { outcome: string }[] }[];
      createdAt: number; finishedAt?: number; cost: null },
    history: [], selectedRunId: null as string | null, latestKnownRunId: null as string | null,
    acceptedRunId: null as string | null, setup: { model: 'model' }, runtime: {},
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0,
    startPending: false, startUncertain: false, activePanel: null,
    setupRegion: { hidden: false, querySelector: () => ({ disabled: false }) },
    isActive: () => context.run?.state === 'running', needsJudge: () => false,
    refreshSetupControls() {}, status() {}, loadDiscovery() {}, loadRuntime() {}, resetRepair() {},
    json: async (url: string) => url.includes('/status?')
      ? new Promise(resolve => { resolvePoll = resolve; }) : new Promise(() => undefined),
    setTimeout: () => 0,
  };
  const api = vm.runInNewContext(WORKSPACE_RESULTS_CLIENT + ';({ renderWorkspace, pollRun })', context) as {
    renderWorkspace(): void; pollRun(): Promise<void>;
  };
  function edit(value: string, start: number, end = start) {
    input.value = value; input.selectionStart = start; input.selectionEnd = end;
    listeners.get('input')?.({ target: input });
  }
  return { api, context, document, input, section, count, list, empty, results,
    replacements: () => replacements, edit, resolvePoll: () => resolvePoll };
}

type SearchInput = { value: string; selectionStart: number; selectionEnd: number;
  matches(selector: string): boolean; focus(): void };

test('end and middle edits, deletion, caret and selection retain one input while rows and count filter', () => {
  const page = browser();
  page.api.renderWorkspace();
  assert.equal(page.count.textContent, '3');
  assert.match(page.list.innerHTML, /Alpha case/);
  assert.match(page.list.innerHTML, /Beta case/);
  assert.match(page.list.innerHTML, /Gamma case/);
  page.input.focus();
  const input = page.input, section = page.section;
  page.edit('Al', 2);
  assert.equal(page.input.value, 'Al');
  assert.equal(page.count.textContent, '1');
  assert.match(page.list.innerHTML, /Alpha case/);
  assert.doesNotMatch(page.list.innerHTML, /Beta case|Gamma case/);
  page.edit('Alha', 2);
  assert.equal(page.count.textContent, '0');
  page.edit('Alpha', 3);
  assert.equal(page.input.value, 'Alpha');
  assert.equal(page.count.textContent, '1');
  page.edit('Alha', 2, 3);
  assert.equal(page.input.selectionStart, 2);
  assert.equal(page.input.selectionEnd, 3);
  page.edit('Alpha', 3);
  assert.equal(page.input.value, 'Alpha');
  page.edit('Alpha ', 6);
  assert.equal(page.count.textContent, '1');
  assert.equal(page.input, input);
  assert.equal(page.results.querySelector('.results'), section);
  assert.equal(page.document.activeElement, input);
  assert.equal(page.input.selectionStart, 6);
  assert.equal(page.input.selectionEnd, 6);
  assert.equal(page.replacements(), 0);
});

test('no-match copy retains an editable query and clearing restores all rows and count', () => {
  const page = browser();
  page.api.renderWorkspace();
  page.input.focus();
  page.edit('nothing', 4, 7);
  assert.equal(page.count.textContent, '0');
  assert.equal(page.list.innerHTML, '');
  assert.equal(page.empty.hidden, false);
  assert.equal(page.empty.textContent, 'No test cases match this search.');
  assert.equal(page.input.value, 'nothing');
  assert.equal(page.document.activeElement, page.input);
  page.edit('', 0);
  assert.equal(page.count.textContent, '3');
  assert.equal(page.empty.hidden, true);
  for (const name of ['Alpha case', 'Beta case', 'Gamma case']) assert.match(page.list.innerHTML, new RegExp(name));
  assert.equal(page.replacements(), 0);
});

test('polling refresh preserves the exact focused input, query and selection', async () => {
  const page = browser();
  page.api.renderWorkspace();
  page.input.focus();
  page.edit('BeTa', 1, 3);
  page.context.selectedRunId = 'run';
  page.context.latestKnownRunId = 'run';
  const input = page.input, section = page.section;
  const poll = page.api.pollRun();
  page.resolvePoll()?.({ status: 'ok', value: { summary: {
    runId: 'run', state: 'completed', caseIds: ['beta'], createdAt: 1, finishedAt: 2, cost: null,
    cases: [{ caseId: 'beta', state: 'completed', attempts: [{ outcome: 'passed' }] }],
  } } });
  await poll;
  assert.equal(page.input, input);
  assert.equal(page.results.querySelector('.results'), section);
  assert.equal(page.document.activeElement, input);
  assert.equal(page.input.value, 'BeTa');
  assert.equal(page.input.selectionStart, 1);
  assert.equal(page.input.selectionEnd, 3);
  assert.equal(page.count.textContent, '1');
  assert.match(page.list.innerHTML, /Beta case/);
  assert.doesNotMatch(page.list.innerHTML, /Alpha case|Gamma case/);
  assert.equal(page.replacements(), 0);
});

const uncertainReference = '123e4567-e89b-42d3-a456-426614174003';
function uncertainHistoryBrowser(reply: (url: string) => Promise<unknown>) {
  const detail = { innerHTML: 'Saved prior evidence', hidden: false };
  const notice = { hidden: false };
  const side = { hidden: true, innerHTML: '', querySelector: () => null,
    setAttribute() {}, removeAttribute() {} };
  const document = { querySelectorAll: () => [], addEventListener() {} };
  const prior = { runId: 'prior-run', state: 'completed', cases: [] };
  const context = { document, URLSearchParams, matchMedia: () => ({ matches: false }), esc: (value: unknown) => String(value ?? ''),
    one: (selector: string) => ({ '[data-results-container]': {}, '[data-detail]': detail,
      '[data-side-panel]': side, '[data-start-notice]': notice })[selector],
    suite: null as null | { id: string }, suites: [{ id: 'suite' }, { id: 'other' }],
    run: prior, history: [{ runId: 'prior-run' }], selectedRunId: 'prior-run', latestKnownRunId: 'prior-run',
    acceptedRunId: null, runtime: null, review: { request: { suiteId: 'suite' } }, setup: {},
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0, startPending: false,
    startUncertain: true, startReference: uncertainReference, startSuiteId: 'suite', activePanel: null,
    safeRunId: (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9-]+$/.test(value),
    loadDiscovery() {}, loadRuntime() {}, resetRepair() {}, status() {},
    json: reply, setTimeout() {}, isActive: () => false,
  };
  const api = vm.runInNewContext(WORKSPACE_RESULTS_CLIENT
    + '; renderWorkspace = () => {}; ({ loadHistory, renderHistory, state:()=>({ startUncertain, startReference, run, selectedRunId, history }), switchSuite(){ suite={id:"other"}; historyGeneration++; } })', context) as {
      loadHistory(): Promise<void>; renderHistory(): void; switchSuite(): void;
      state(): { startUncertain: boolean; startReference: string | null; run: { runId: string }; selectedRunId: string;
        history: { runId: string }[] };
    };
  context.suite = { id: 'suite' };
  return { api, context, detail, notice, side, prior };
}

test('unconfirmed start stays locked for old, empty, unrelated same-suite, and unavailable correlation', async () => {
  for (const rows of [[], [{ runId: 'prior-run' }], [{ runId: 'concurrent-run' }, { runId: 'prior-run' }]]) {
    for (const correlation of [{ status: 'unconfirmed' }, { status: 'pending' }, { status: 'ambiguous' },
      { status: 'confirmed', suiteId: 'suite', reference: uncertainReference, runId: 'not-listed' }]) {
      const calls: string[] = [];
      const page = uncertainHistoryBrowser(async url => { calls.push(url);
        return url.includes('reference=') ? correlation : { status: 'ok', value: rows };
      });
      await page.api.loadHistory();
      assert.equal(page.api.state().startUncertain, true);
      assert.equal(page.api.state().run, page.prior);
      assert.equal(page.api.state().selectedRunId, 'prior-run');
      assert.equal(page.notice.hidden, false);
      assert.equal(page.detail.innerHTML, 'Saved prior evidence');
      assert.ok(calls.some(url => url.includes('reference=' + uncertainReference)));
      assert.equal(calls.filter(url => url.includes('/status?')).length, 0);
    }
  }
});

test('History read error remains an unreadable History state and preserves prior result detail', async () => {
  const page = uncertainHistoryBrowser(async () => { throw new Error('read failed'); });
  page.api.renderHistory();
  await page.api.loadHistory();
  assert.match(page.side.innerHTML, /Saved History could not be read/);
  assert.equal(page.api.state().startUncertain, true);
  assert.equal(page.api.state().run, page.prior);
  assert.equal(page.detail.innerHTML, 'Saved prior evidence');
});

test('only exact-reference, suite-matched History row with readable status resolves and selects saved run', async () => {
  const calls: string[] = [];
  const found = { runId: 'found-run', state: 'completed', cases: [] };
  const page = uncertainHistoryBrowser(async url => { calls.push(url);
    if (url.includes('reference=')) return { status: 'confirmed', suiteId: 'suite', reference: uncertainReference, runId: 'found-run' };
    if (url.includes('/status?')) return { status: 'ok', value: { summary: found } };
    return { status: 'ok', value: [{ runId: 'concurrent-run' }, { runId: 'found-run' }, { runId: 'prior-run' }] };
  });
  await page.api.loadHistory();
  assert.equal(page.api.state().startUncertain, false);
  assert.equal(page.api.state().startReference, null);
  assert.equal(page.api.state().selectedRunId, 'found-run');
  assert.equal(page.api.state().run?.runId, 'found-run');
  assert.equal(page.notice.hidden, true);
  assert.ok(page.api.state().history.some(row => row.runId === 'prior-run'));
  assert.equal(calls.filter(url => url.includes('/status?')).length, 1);
});

test('contradictory or unreadable correlated status and stale suite response cannot resolve uncertainty', async () => {
  for (const response of [{ status: 'blocked' }, { status: 'ok', value: { summary: { runId: 'other-run' } } }]) {
    const page = uncertainHistoryBrowser(async url => url.includes('reference=')
      ? { status: 'confirmed', suiteId: 'suite', reference: uncertainReference, runId: 'found-run' }
      : url.includes('/status?') ? response : { status: 'ok', value: [{ runId: 'found-run' }] });
    await page.api.loadHistory();
    assert.equal(page.api.state().startUncertain, true);
    assert.equal(page.api.state().run, page.prior);
    assert.equal(page.detail.innerHTML, 'Saved prior evidence');
  }
  let release!: (value: unknown) => void;
  const page = uncertainHistoryBrowser(async url => url.includes('reference=')
    ? new Promise(resolve => { release = resolve; }) : { status: 'ok', value: [{ runId: 'found-run' }] });
  const pending = page.api.loadHistory();
  await new Promise(resolve => setImmediate(resolve));
  page.api.switchSuite();
  release({ status: 'confirmed', suiteId: 'suite', reference: uncertainReference, runId: 'found-run' });
  await pending;
  assert.equal(page.api.state().startUncertain, true);
  assert.equal(page.api.state().run, page.prior);
  assert.equal(page.notice.hidden, false);
});
