import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';

export function browser() {
  const listeners = new Map<string, (event: { target: SearchInput }) => void>();
  const railButtons = ['suite', 'second'].map(suiteId => {
    const attributes = new Map<string, string>();
    return { dataset: { suiteId }, setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name), getAttribute: (name: string) => attributes.get(name) };
  });
  const document = { activeElement: null as SearchInput | null,
    querySelectorAll: (selector: string) => selector === '[data-action="suite"]' ? railButtons : [],
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
    ] }, suites: [{ id: 'suite', name: 'Suite', description: '', testCases: [
      { id: 'alpha', name: 'Alpha case' }, { id: 'beta', name: 'Beta case' }, { id: 'gamma', name: 'Gamma case' },
    ] }, { id: 'second', name: 'Second', description: '', testCases: [{ id: 'delta', name: 'Delta case' }] }], run: null as null | { runId: string; state: string; caseIds: string[];
      cases: { caseId: string; state: string; attempts: { outcome: string }[] }[];
      createdAt: number; finishedAt?: number; cost: null },
    history: [], selectedRunId: null as string | null, latestKnownRunId: null as string | null,
    acceptedRunId: null as string | null, setup: { model: 'model' }, runtime: {},
    runGeneration: 0, historyGeneration: 0, detailGeneration: 0,
    startPending: false, startUncertain: false, activePanel: null,
    setupRegion: { hidden: false, querySelector: () => ({ disabled: false }) },
    isActive: () => context.run?.state === 'running', needsJudge: () => false,
    refreshSetupControls() {}, status() {}, loadDiscovery() {}, loadRuntime() {}, setRuntimeState() {}, resetRepair() {},
    repairMarkup: () => '<button data-action="analyze-failure">Analyze failure</button>',
    selectedFailure: null,
    safeReference: (value: unknown) => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value),
    matchMedia: () => ({ matches: false }),
    sheetSlot, openSheet: () => { sheetOpen = true; }, closeSheet: () => { sheetOpen = false; sheetCloses++; api.closeCaseDetail(); },
    json: async (url: string) => url.includes('/status?')
      ? new Promise(resolve => { resolvePoll = resolve; }) : new Promise(() => undefined),
    setTimeout: () => 0,
  };
  const api = vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_RESULTS_CLIENT + ';({ renderWorkspace, renderHistory, renderCoverage, selectSuite, selectHistoryRun, pollRun, loadHistory, inspectCase, closeCaseDetail, runOutcomeCopy, state:()=>({run,history,selectedRunId,readNotices}) })', context) as {
    renderWorkspace(): void; renderHistory(): void; renderCoverage(): void; selectHistoryRun(runId: string): Promise<void>;
    selectSuite(id: string): void;
    pollRun(): Promise<void>; loadHistory(): Promise<void>; inspectCase(caseId: string, attempt: number): Promise<void>;
    closeCaseDetail(): void;
    runOutcomeCopy(summary: unknown): string; state(): { run: unknown; history: unknown[]; selectedRunId: string; readNotices: Record<string, unknown> };
  };
  function edit(value: string, start: number, end = start) {
    input.value = value; input.selectionStart = start; input.selectionEnd = end;
    listeners.get('input')?.({ target: input });
  }
  return { api, context, document, railButtons, input, section, count, list, empty, results, side, copied,
    sheet: { isOpen: () => sheetOpen, closes: () => sheetCloses },
    panelFocus: () => panelFocus,
    read, readHeading, readGuidance, readAnnouncement, readDetails, readCopy,
    replacements: () => replacements, edit, resolvePoll: () => resolvePoll,
    click(action: string) { listeners.get('click')?.({ target: { closest: () => ({ dataset: { action } }) } as unknown as SearchInput }); },
    filterFailures(checked: boolean) { failureFilter.checked = checked;
      listeners.get('change')?.({ target: { matches: (selector: string) => selector === '[data-action="failures-only"]', checked } as unknown as SearchInput }); },
  };
}

type SearchInput = { value: string; selectionStart: number; selectionEnd: number;
  matches(selector: string): boolean; focus(): void };

export const reference = '123e4567-e89b-42d3-a456-426614174001';
export const saved = { runId: 'run', state: 'completed', outcome: 'failed', diagnostics: ['assertion-failed'],
  caseIds: ['alpha'], createdAt: 1, finishedAt: 2, cost: null,
  cases: [{ caseId: 'alpha', state: 'completed', attempts: [{ outcome: 'failed' }] }] };

