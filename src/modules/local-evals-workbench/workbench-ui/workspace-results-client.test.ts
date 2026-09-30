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
    refreshSetupControls() {}, status() {}, loadRuntime() {}, resetRepair() {},
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
