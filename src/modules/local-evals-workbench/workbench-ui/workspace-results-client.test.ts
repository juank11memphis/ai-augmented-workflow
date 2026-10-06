import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';

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
  const results = { querySelector: (selector: string) => parts[selector] ?? null, querySelectorAll: () => [],
    set innerHTML(_value: string) { replacements++; }, get innerHTML() { return ''; } };
  const statusSummary = { textContent: '', focus() { document.activeElement = null; } };
  const read = { hidden: true };
  const readHeading = { textContent: '' }, readGuidance = { textContent: '' }, readAnnouncement = { textContent: '' };
  const readDetails = { textContent: '', hidden: true }, readCopy = { hidden: true };
  let sheetOpen = false, sheetCloses = 0; const sheetSlot = { querySelector: () => sheetOpen ? {} : null };
  let panelFocus = '';
  const side = { hidden: true, innerHTML: '', querySelector: (selector: string) => selector === 'h2' ? { focus: () => { panelFocus = 'heading'; } } : null,
    setAttribute() {}, removeAttribute() {} };
  const nodes: Record<string, unknown> = {
    '[data-results-container]': results, '[data-detail]': { innerHTML: '', hidden: true, querySelector: () => ({ focus() {} }) },
    '[data-side-panel]': side, '[data-suite-title]': { textContent: '' },
    '[data-suite-description]': { textContent: '' }, '[data-action="suite-select"]': { value: '' },
    '[data-action="coverage"]': { hidden: false }, '[data-action="history"]': { hidden: false },
    '[data-latest-label]': { textContent: '' }, '[data-status-summary]': statusSummary,
    '[data-run-metrics]': { textContent: '' },
    '[data-read-notice]': read, '[data-read-heading]': readHeading, '[data-read-guidance]': readGuidance,
    '[data-read-announcement]': readAnnouncement, '[data-read-details]': readDetails,
    '[data-action="copy-read-issue"]': readCopy, '[data-read-copy-status]': { textContent: '' },
  };
  let resolvePoll: ((value: unknown) => void) | undefined;
  const copied: string[] = [];
  const context = {
    document, URLSearchParams, Date, one: (selector: string) => nodes[selector],
    navigator: { clipboard: { async writeText(value: string) { copied.push(value); } } },
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
    repairMarkup: () => '<button data-action="analyze-failure">Analyze failure</button>',
    selectedFailure: null,
    safeReference: (value: unknown) => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value),
    matchMedia: () => ({ matches: false }),
    sheetSlot, openSheet: () => { sheetOpen = true; }, closeSheet: () => { sheetOpen = false; sheetCloses++; api.closeCaseDetail(); },
    json: async (url: string) => url.includes('/status?')
      ? new Promise(resolve => { resolvePoll = resolve; }) : new Promise(() => undefined),
    setTimeout: () => 0,
  };
  const api = vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_RESULTS_CLIENT + ';({ renderWorkspace, renderHistory, renderCoverage, selectHistoryRun, pollRun, loadHistory, inspectCase, closeCaseDetail, runOutcomeCopy, state:()=>({run,history,selectedRunId,readNotices}) })', context) as {
    renderWorkspace(): void; renderHistory(): void; renderCoverage(): void; selectHistoryRun(runId: string): Promise<void>;
    pollRun(): Promise<void>; loadHistory(): Promise<void>; inspectCase(caseId: string, attempt: number): Promise<void>;
    closeCaseDetail(): void;
    runOutcomeCopy(summary: unknown): string; state(): { run: unknown; history: unknown[]; selectedRunId: string; readNotices: Record<string, unknown> };
  };
  function edit(value: string, start: number, end = start) {
    input.value = value; input.selectionStart = start; input.selectionEnd = end;
    listeners.get('input')?.({ target: input });
  }
  return { api, context, document, input, section, count, list, empty, results, side, copied,
    sheet: { isOpen: () => sheetOpen, closes: () => sheetCloses },
    panelFocus: () => panelFocus,
    read, readHeading, readGuidance, readAnnouncement, readDetails, readCopy,
    replacements: () => replacements, edit, resolvePoll: () => resolvePoll,
    click(action: string) { listeners.get('click')?.({ target: { closest: () => ({ dataset: { action } }) } as unknown as SearchInput }); },
  };
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
test('poll rejects a mismatched run snapshot without replacing selected results', async () => {
  const page = browser(); page.context.run = saved; page.context.selectedRunId = 'run';
  const poll = page.api.pollRun(); page.resolvePoll()?.({ status: 'ok', value: { summary: { ...saved, runId: 'other' } } }); await poll;
  assert.equal(page.api.state().run, saved); assert.equal(page.api.state().selectedRunId, 'run');
  assert.match(page.readHeading.textContent, /Run status/);
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
test('selected-run browser summary uses selected scope, not filtered rows or recorded-case count', () => {
  const page = browser();
  page.context.run = { ...saved, state: 'running', caseIds: ['alpha', 'beta'], finishedAt: undefined,
    cases: [{ caseId: 'alpha', state: 'completed', attempts: [{ outcome: 'failed' }, { outcome: 'passed' }] }] } as never;
  page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.api.renderWorkspace();
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /1 failed · 1 not finished · 1 excluded/);
  assert.match(page.list.innerHTML, /Attempts: <\/span>2 · 1 failed/);
  assert.match(page.list.innerHTML, /Result: <\/span>failed/);
  assert.match(page.list.innerHTML, /excluded/);
  assert.equal((page.context.one('[data-run-metrics]') as { textContent: string }).textContent, '');
  page.edit('Gamma', 3);
  assert.equal(page.count.textContent, '1');
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /1 failed · 1 not finished/);
  page.context.latestKnownRunId = 'newer'; page.api.renderWorkspace();
  assert.match((page.context.one('[data-latest-label]') as { textContent: string }).textContent, /Past run/);
});
test('browser keeps not-run, running, incomplete, failed, and passed distinct without private summary data', () => {
  const page = browser();
  const summary = page.context.one('[data-status-summary]') as { textContent: string };
  const metrics = page.context.one('[data-run-metrics]') as { textContent: string };
  page.context.run = { ...saved, state: 'running', diagnostics: ['private output'], caseIds: ['alpha', 'beta', 'gamma'],
    finishedAt: undefined, cases: [
      { caseId: 'alpha', state: 'incomplete', attempts: [{ outcome: 'incomplete' }] },
      { caseId: 'beta', state: 'not-run', attempts: [] },
      { caseId: 'gamma', state: 'completed', attempts: [{ outcome: 'passed' }] },
    ] } as never;
  page.api.renderWorkspace();
  assert.match(page.list.innerHTML, /running/);
  assert.match(page.list.innerHTML, /not run/);
  assert.match(page.list.innerHTML, /passed/);
  assert.doesNotMatch(summary.textContent + page.list.innerHTML + metrics.textContent, /private output/);
  page.context.run = { ...saved, state: 'interrupted', finishedAt: undefined, caseIds: ['alpha', 'beta', 'gamma'],
    cases: [{ caseId: 'alpha', state: 'incomplete', attempts: [{ outcome: 'incomplete' }] }] } as never;
  page.api.renderWorkspace();
  assert.match(page.list.innerHTML, /incomplete/);
  assert.doesNotMatch(page.list.innerHTML, /running/);
  assert.equal(metrics.textContent, '');
});
test('filtered rows preserve saved outcomes and close inspectable detail without unearned assistance', async () => {
  const page = browser();
  page.context.run = { ...saved, testedModel: 'chosen-model', caseIds: ['alpha', 'beta'], cases: [
    { caseId: 'alpha', state: 'completed', attempts: [{ number: 1, outcome: 'failed' }] },
  ] } as never;
  page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  const evidence = { outcome: 'failed', output: 'private raw', assertions: [], turns: [], tools: [], diagnostics: [] };
  page.context.json = async () => ({ status: 'ok', value: { evidenceStatus: 'available', evidence } });
  page.api.renderWorkspace();
  assert.match(page.list.innerHTML, /data-case-id="alpha"/);
  assert.match(page.list.innerHTML, /data-case-id="beta" disabled/);
  assert.match(page.list.innerHTML, /Result: <\/span>failed/);
  assert.match(page.list.innerHTML, /Result: <\/span>not run/);
  assert.doesNotMatch(page.list.innerHTML, /private raw/);
  assert.match((page.context.one('[data-run-metrics]') as { textContent: string }).textContent, /Model: chosen-model/);
  page.edit('beta', 4);
  assert.equal(page.count.textContent, '1');
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /1 failed · 1 not finished/);
  page.edit('', 0);
  await page.api.inspectCase('alpha', 1);
  const detail = page.context.one('[data-detail]') as { innerHTML: string; hidden: boolean };
  assert.equal(detail.hidden, false);
  assert.match(detail.innerHTML, /All checks \(0\)/);
  assert.doesNotMatch(detail.innerHTML, /data-repair-host|Analyze failure/);
  page.context.matchMedia = () => ({ matches: true });
  await page.api.inspectCase('alpha', 1); assert.equal(page.sheet.isOpen(), true);
  page.edit('beta', 4);
  assert.equal(page.sheet.isOpen(), false); assert.equal(page.sheet.closes(), 1);
  assert.equal(detail.hidden, true); assert.doesNotMatch(detail.innerHTML, /Analyze failure/);
  assert.match(page.list.innerHTML, /Beta case/); assert.doesNotMatch(page.list.innerHTML, /Alpha case/);
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

const reference = '123e4567-e89b-42d3-a456-426614174001';
const saved = { runId: 'run', state: 'completed', outcome: 'failed', diagnostics: ['assertion-failed'],
  caseIds: ['alpha'], createdAt: 1, finishedAt: 2, cost: null,
  cases: [{ caseId: 'alpha', state: 'completed', attempts: [{ outcome: 'failed' }] }] };

test('History labels latest and past, preserves selection on failed read, and returns to latest', async () => {
  const page = browser();
  const past = { ...saved, runId: 'past-run' };
  page.context.run = saved; page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.context.history = [
    { runId: 'run', createdAt: 2, testedModel: 'model', scope: 'all', repeats: 1, state: 'completed', outcome: 'failed', cost: null },
    { runId: 'past-run', createdAt: 1, testedModel: 'model', scope: 'all', repeats: 1, state: 'completed', outcome: 'failed', cost: null },
  ] as never[];
  page.api.renderWorkspace();
  const selected = page.api.state().selectedRunId;
  page.api.renderHistory();
  assert.match(page.side.innerHTML, /Latest run.*Past run/s);
  assert.match(page.side.innerHTML, /aria-current="true"/);
  page.context.json = async () => ({ status: 'blocked', reason: 'corrupt', issue: {
    stage: 'status', outcome: 'blocked', category: 'corrupt', reference } });
  await page.api.selectHistoryRun('past-run');
  assert.equal(page.api.state().selectedRunId, selected);
  assert.equal(page.api.state().run, saved);
  assert.equal(page.side.hidden, false);
  page.context.json = async url => ({ status: 'ok', value: { summary: url.includes('past-run') ? past : saved } });
  await page.api.selectHistoryRun('past-run');
  assert.equal(page.api.state().selectedRunId, 'past-run');
  assert.match((page.context.one('[data-latest-label]') as { textContent: string }).textContent, /^Past run/);
  assert.equal(page.side.hidden, true);
  page.api.renderCoverage();
  assert.equal(page.panelFocus(), 'heading');
  assert.equal(page.api.state().selectedRunId, 'past-run');
  await page.api.selectHistoryRun('run');
  assert.equal(page.api.state().selectedRunId, 'run');
  assert.equal(page.api.state().run, saved);
  assert.match((page.context.one('[data-latest-label]') as { textContent: string }).textContent, /^Latest run/);
});

test('late History selection response cannot replace the current suite or run', async () => {
  const page = browser();
  page.context.run = saved; page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.context.history = [{ runId: 'run' }, { runId: 'past-run' }] as never[];
  let release!: (value: unknown) => void;
  page.context.json = async () => new Promise(resolve => { release = resolve; });
  const pending = page.api.selectHistoryRun('past-run');
  await new Promise(resolve => setImmediate(resolve));
  page.context.suite = { ...page.context.suite, id: 'other' };
  release({ status: 'ok', value: { summary: { ...saved, runId: 'past-run' } } });
  await pending;
  assert.equal(page.api.state().run, saved);
  assert.equal(page.api.state().selectedRunId, 'run');
});

test('failed status polls retain terminal failed checks, list, selection and detail; recovery clears only status notice', async () => {
  const page = browser();
  page.context.run = saved; page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.context.history = [{ runId: 'run' }] as never[];
  const detail = page.context.one('[data-detail]') as { innerHTML: string };
  detail.innerHTML = '<section class="detail-section">Saved evidence</section>';
  page.api.renderWorkspace(); page.input.focus();
  const priorRows = page.list.innerHTML;
  const blocked = { status: 'blocked', reason: 'corrupt', issue: { stage: 'status', outcome: 'blocked', category: 'corrupt', reference } };
  const first = page.api.pollRun(); page.resolvePoll()?.(blocked); await first;
  assert.equal(page.api.state().run, saved);
  assert.equal(page.list.innerHTML, priorRows);
  assert.equal(detail.innerHTML, '<section class="detail-section">Saved evidence</section>');
  assert.equal(page.api.state().selectedRunId, 'run');
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /failed checks/);
  assert.match(page.readGuidance.textContent, /readable|unreadable/);
  assert.doesNotMatch(page.readGuidance.textContent, /assertion failure|secret-token/);
  assert.match(page.readDetails.textContent, /Stage: status\nOutcome: blocked\nCategory: corrupt\nReference:/);
  assert.equal(page.document.activeElement, page.input);
  const announcement = page.readAnnouncement.textContent;
  const second = page.api.pollRun(); page.resolvePoll()?.(blocked); await second;
  assert.equal(page.readAnnouncement.textContent, announcement);
  const recovered = page.api.pollRun(); page.resolvePoll()?.({ status: 'ok', value: { summary: saved } }); await recovered;
  assert.equal(page.read.hidden, true);
  assert.equal(page.api.state().run, saved);
  assert.equal(page.document.activeElement, page.input);
});

test('terminal outcomes and legacy input-unsafe are conservative and distinct from read faults', () => {
  const page = browser();
  for (const [state, expected] of [['completed', 'Completed with failed checks'], ['blocked', 'blocked'],
    ['partial', 'partially'], ['interrupted', 'interrupted'], ['error', 'could not complete']] as const) {
    assert.match(page.api.runOutcomeCopy({ ...saved, state }), new RegExp(expected, 'i'));
  }
  assert.match(page.api.runOutcomeCopy({ ...saved, state: 'error', diagnostics: ['runner-timeout'] }), /did not answer in time/);
  assert.match(page.api.runOutcomeCopy({ ...saved, state: 'error', diagnostics: ['runner-protocol-invalid'] }), /protocol|compatibility/i);
  const legacy = page.api.runOutcomeCopy({ ...saved, version: 1, state: 'blocked', diagnostics: ['input-unsafe'] });
  assert.match(legacy, /without a precise cause.*runner setup and request size/i);
  assert.doesNotMatch(legacy, /credential|provider|setting failure|secret-token/i);
});

test('History fault and network catch preserve saved rows; confirmed recovery clears only History notice', async () => {
  const page = browser();
  page.context.run = saved; page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.context.history = [{ runId: 'run', createdAt: 1, testedModel: 'model', scope: 'all', repeats: 1,
    state: 'completed', outcome: 'failed', finishedAt: 2, cost: null }] as never[];
  const previous = page.context.history;
  page.context.json = async () => ({ status: 'blocked', reason: 'unavailable', issue: {
    stage: 'history', outcome: 'blocked', category: 'unavailable', reference } });
  await page.api.loadHistory();
  assert.equal(page.api.state().history, previous);
  assert.match(page.readHeading.textContent, /History/);
  assert.match(page.readDetails.textContent, /Stage: history/);
  page.context.json = async () => { throw new Error('secret-token'); };
  await page.api.loadHistory();
  assert.equal(page.api.state().history, previous);
  assert.match(page.readGuidance.textContent, /matching terminal event may not exist/);
  assert.equal(page.readDetails.textContent, '');
  assert.doesNotMatch(page.readGuidance.textContent, /secret-token/);
  page.context.json = async () => ({ status: 'ok', value: previous });
  await page.api.loadHistory();
  assert.equal(page.read.hidden, true);
  assert.equal(page.api.state().run, saved);
});

test('version-1 input-unsafe issue is explicitly unclassified in guidance and copied-safe fields', async () => {
  const page = browser(); page.context.run = saved;
  page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  const poll = page.api.pollRun();
  page.resolvePoll()?.({ status: 'blocked', reason: 'input-unsafe', version: 1,
    issue: { stage: 'status', outcome: 'blocked', category: 'input-unsafe', reference,
      private: 'secret-token', message: 'provider credential failure' } });
  await poll;
  assert.match(page.readGuidance.textContent, /without a precise cause/);
  assert.match(page.readDetails.textContent, /Category: unclassified/);
  assert.doesNotMatch(page.readGuidance.textContent + page.readDetails.textContent, /credential|provider|secret-token/i);
  assert.doesNotMatch(page.readAnnouncement.textContent, /credential|provider|secret-token/i);
  page.click('copy-read-issue');
  await Promise.resolve();
  assert.equal(page.copied.length, 1);
  assert.equal(page.copied[0], page.readDetails.textContent);
  assert.doesNotMatch(page.copied[0]!, /credential|provider|secret-token/i);
  assert.equal(page.api.state().run, saved);
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
  assert.match(page.side.innerHTML, /Recheck History/);
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
