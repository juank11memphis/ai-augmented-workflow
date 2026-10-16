import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';
import { WORKSPACE_CASE_MODELS_CLIENT } from './workspace-case-models-client.js';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const evidence = (caseId: string) => ({ status: 'ok', value: {
  evidenceStatus: 'available', reviewArtifactPath: `evals/artifacts/suite/run/cases/${caseId}/1.json`,
  evidence: { suiteId: 'suite', runId: 'run', caseId, number: 1, outcome: 'failed',
    assertions: [{ id: 'failed', outcome: 'failed', actual: `${caseId}-actual`, expected: 'expected', diagnostics: [] }],
    turns: [], tools: [], diagnostics: [], output: 'PRIVATE RAW', truncated: false,
    review: { suitePath: 'evals/suite.json' } } } });

function harness(read: (url: string) => Promise<unknown>, phone = false) {
  const listeners = new Map<string, ((event: any) => void)[]>();
  const document = { activeElement: null as unknown, querySelectorAll: () => [],
    addEventListener(type: string, listener: (event: any) => void) { listeners.set(type, [...listeners.get(type) || [], listener]); } };
  const heading = { focus() { document.activeElement = heading; } };
  const caseButton = { dataset: { caseId: 'a' }, focus() { document.activeElement = caseButton; } };
  const list = { scrollTop: 41, contains: () => false, innerHTML: '', querySelectorAll: () => [caseButton] };
  const results = { innerHTML: '', hidden: false, querySelector: (key: string) => key === '[data-result-list]' ? list : null,
    querySelectorAll: () => [caseButton] };
  const detail = { innerHTML: '', hidden: true, querySelector: () => heading };
  const sheet = { open: false, html: '', querySelector(key: string) {
    if (key === '[role="dialog"]' || key === '[data-action="close-detail"]') return this.open ? {} : null;
    if (key === '.sheet .section-heading + h2') return heading;
    return null;
  } };
  const nodes: Record<string, any> = { '[data-results-container]': results, '[data-detail]': detail,
    '[data-side-panel]': { hidden: true, innerHTML: '', setAttribute() {}, removeAttribute() {} },
    '[data-workspace]': { dataset: {} }, '[data-suite-title]': { textContent: '' },
    '[data-suite-description]': { textContent: '' }, '[data-action="suite-select"]': { value: '' },
    '[data-latest-label]': { textContent: '' }, '[data-status-summary]': { textContent: '' },
    '[data-run-metrics]': { textContent: '' }, '[data-read-notice]': { hidden: true },
    '[data-read-heading]': { textContent: '' }, '[data-read-guidance]': { textContent: '' },
    '[data-read-details]': { textContent: '', hidden: true }, '[data-read-announcement]': { textContent: '' },
    '[data-action="copy-read-issue"]': { hidden: true } };
  const context = { document, URLSearchParams, one: (key: string) => nodes[key], esc: escape,
    suite: { id: 'suite', name: 'Suite', testCases: [{ id: 'a', name: 'Case A' }, { id: 'b', name: 'Case B' }] },
    suites: [], run: { runId: 'run', suiteId: 'suite', state: 'completed', scope: 'all', testedModel: 'model',
      caseIds: ['a', 'b'], cases: [
        { caseId: 'a', state: 'completed', attempts: [{ number: 1, outcome: 'failed' }] },
        { caseId: 'b', state: 'completed', attempts: [{ number: 1, outcome: 'failed' }] }] },
    selectedRunId: 'run', latestKnownRunId: 'run', acceptedRunId: null, history: [],
    detailGeneration: 0, runGeneration: 0, historyGeneration: 0, setup: { model: 'model' }, runtime: {},
    startPending: false, startUncertain: false, activePanel: null, setupRegion: { hidden: true, querySelector: () => null },
    isActive: () => false, needsJudge: () => false, refreshSetupControls() {}, status() {},
    loadDiscovery() {}, loadRuntime() {}, loadHistory() {}, setRuntimeState() {},
    matchMedia: () => ({ matches: phone }), sheetSlot: sheet,
    openSheet: (_title: string, html: string) => { sheet.open = true; sheet.html = html; heading.focus(); },
    closeSheet: () => { sheet.open = false; api.closeCaseDetail(); },
    json: (url: string) => url.includes('/history?') ? new Promise(() => undefined) : read(url),
    post: async () => { throw new Error('In-app analysis/repair must not be called'); },
    setTimeout: () => 0, safeReference: () => false,
  };
  const api = vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_RESULTS_CLIENT
    + ';({ inspectCase, closeCaseDetail })', context) as {
      inspectCase(caseId: string, attempt: number): Promise<void>; closeCaseDetail(): void };
  function click(action: string, data: Record<string, string> = {}) {
    for (const listener of listeners.get('click') || []) listener({ target: { closest: () => ({ dataset: { action, ...data } }) } });
  }
  return { api, detail, document, heading, caseButton, list, sheet, click };
}

test('each case shows its own saved review path without in-app analysis or repair', async () => {
  const app = harness(async url => evidence(url.includes('caseId=b') ? 'b' : 'a'));
  await app.api.inspectCase('a', 1);
  assert.match(app.detail.innerHTML, /cases\/a\/1.json/);
  assert.doesNotMatch(app.detail.innerHTML, /Analyze failure|Draft repair|Approve and apply/);
  await app.api.inspectCase('b', 1);
  assert.match(app.detail.innerHTML, /cases\/b\/1.json/);
  assert.doesNotMatch(app.detail.innerHTML, /cases\/a\/1.json/);
});

test('a late evidence read cannot restore a stale case review path', async () => {
  let release!: (value: unknown) => void;
  const app = harness(url => url.includes('caseId=b') ? Promise.resolve(evidence('b'))
    : new Promise(resolve => { release = resolve; }));
  const first = app.api.inspectCase('a', 1);
  await app.api.inspectCase('b', 1);
  release(evidence('a'));
  await first;
  assert.match(app.detail.innerHTML, /cases\/b\/1.json/);
  assert.doesNotMatch(app.detail.innerHTML, /cases\/a\/1.json/);
});

test('compact detail closes back to invoking row and list position', async () => {
  const app = harness(async () => evidence('a'), true);
  app.click('case', { caseId: 'a' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.document.activeElement, app.heading);
  assert.match(app.sheet.html, /Case A/);
  app.list.scrollTop = 0;
  app.click('close-detail');
  assert.equal(app.document.activeElement, app.caseButton);
  assert.equal(app.list.scrollTop, 41);
  assert.equal(app.detail.hidden, true);
});

test('selected-case models save and reset roles independently; cancel and conflict never start a run', async () => {
  const listeners = new Map<string, ((event: any) => void)[]>();
  const nodes = new Map<string, { textContent: string; disabled: boolean; focus(): void }>();
  let focused = '', dialog = '', closes = 0, refreshes = 0, previews = 0;
  const writes: Record<string, unknown>[] = [];
  let conflict = false;
  const one = (key: string) => {
    if (!nodes.has(key)) nodes.set(key, { textContent: '', disabled: false, focus() { focused = key; } });
    return nodes.get(key)!;
  };
  const script = `let suite = {id:'suite',testCases:[{id:'a',name:'Case A'},{id:'b',name:'Case B'}]};
    let setup = {scope:'one',caseId:'b'}, runtimeState = 'ready', sheetReturn = null, savedSuiteGeneration = 0;
    let runtime = {models:['X','Y'],judgeModels:['J','K'],rubricCaseIds:['b']};
    let savedSuiteModels = {token:'${'a'.repeat(64)}',defaultTestedModel:'X',defaultJudgeModel:'J',cases:[
      {caseId:'a',testedModel:null,judgeModel:null},{caseId:'b',testedModel:'Y',judgeModel:null}]};
    const one=globalThis.one,esc=value=>String(value??''),post=globalThis.post,
      openSheet=globalThis.openSheet,closeSheet=globalThis.closeSheet,
      refreshSetupControls=globalThis.refreshSetupControls,previewRun=globalThis.previewRun;
    ${WORKSPACE_CASE_MODELS_CLIENT}
    return {caseModelSummary,openCaseModels,saveCaseModels,draft:()=>caseModelsDraft,
      saved:()=>savedSuiteModels,setDraft:value=>{caseModelsDraft=value}};`;
  const api = vm.runInNewContext('(()=>{' + script + '})()', {
    one, document: { addEventListener(type: string, listener: (event: any) => void) {
      listeners.set(type, [...listeners.get(type) || [], listener]); } },
    post: async (_url: string, body: Record<string, unknown>) => { writes.push(body);
      return conflict ? { status: 'conflict' } : { status: 'saved', token: String(writes.length).repeat(64), modelId: body.modelId || null }; },
    openSheet: (_title: string, content: string) => { dialog = content; },
    closeSheet: () => { closes++; }, refreshSetupControls: () => { refreshes++; }, previewRun: () => { previews++; },
  }) as { caseModelSummary(): string; openCaseModels(role?: string, caseId?: string): Promise<void>; saveCaseModels(): Promise<void>;
    draft(): { tested: string; judge: string; caseId: string } | null; saved(): { cases: { testedModel: string | null; judgeModel: string | null }[] };
    setDraft(value: { tested: string; judge: string; caseId: string }): void };
  assert.match(api.caseModelSummary(), /Case B.*Y.*Override.*J.*Inherited from suite.*data-action="case-models"/s);
  assert.doesNotMatch(api.caseModelSummary(), /Case A/);
  await api.openCaseModels();
  assert.match(dialog, /Inherit X.*Override.*Reset override.*Inherit J.*Override/s);
  assert.equal(focused, 'input[name="case-tested-choice"]:checked');
  listeners.get('click')!.at(-1)!({ target: { closest: () => ({ dataset: { action: 'cancel-case-models' } }) } });
  assert.equal(writes.length, 0); assert.equal(closes, 1);
  await api.openCaseModels();
  listeners.get('click')!.at(-1)!({ target: { closest: () => ({ dataset: { action: 'reset-case-tested' } }) } });
  assert.equal(api.draft()?.tested, '');
  assert.equal(api.draft()?.judge, '');
  assert.equal(writes.length, 0, 'Reset remains draft-only');
  api.setDraft({ tested: '', judge: 'K', caseId: 'b' });
  await api.saveCaseModels();
  assert.deepEqual(writes.map(item => JSON.parse(JSON.stringify(item))), [
    { suiteId: 'suite', caseId: 'b', role: 'tested', action: 'reset', expectedToken: 'a'.repeat(64) },
    { suiteId: 'suite', caseId: 'b', role: 'judge', action: 'set', modelId: 'K', expectedToken: '1'.repeat(64) },
  ]);
  assert.equal(api.saved().cases[1]?.testedModel, null);
  assert.equal(api.saved().cases[1]?.judgeModel, 'K');
  assert.match(api.caseModelSummary(), /X.*Inherited from suite.*K.*Override/s);
  assert.equal(focused, '[data-action="case-models"]');
  assert.equal(refreshes, 1); assert.equal(previews, 1);
  await api.openCaseModels(); conflict = true;
  api.setDraft({ tested: 'Y', judge: 'K', caseId: 'b' });
  await api.saveCaseModels();
  assert.match(one('[data-case-dialog-status]').textContent, /changed elsewhere/);
  assert.ok(api.draft(), 'conflict keeps dialog open');
  assert.equal(closes, 2); assert.equal(previews, 1);
  listeners.get('click')!.at(-1)!({ target: { closest: () => ({ dataset: { action: 'close-sheet' } }) } });
  assert.equal(api.draft(), null, 'Close discards the conflicting draft');
});
