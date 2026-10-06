import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';
import { WORKSPACE_STYLES } from './workspace-styles.js';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!);

test('selected failure renders evidence first, escapes text, and never shows another assertion trace', async () => {
  const detail = { innerHTML: '', querySelector: () => null };
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const document = { addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, [...listeners.get(name) ?? [], listener]) };
  const all = { outcome: 'failed', assertions: [
    { id: 'a', outcome: 'failed', actual: '<selected actual>', expected: 'EXPECTED', diagnostics: ['failed diagnostic'] },
    { id: 'b', outcome: 'failed', actual: 'B ACTUAL', expected: 'B EXPECTED', diagnostics: [] },
    { id: 'grader', outcome: 'passed', score: 0.9, threshold: 0.8, actual: 'GRADER RESULT', expected: 'rubric', diagnostics: ['grader diagnostic'] },
    { id: 'pending', outcome: 'incomplete', actual: '', expected: 'later', diagnostics: [] },
  ], turns: [], tools: [], diagnostics: ['ATTEMPT DIAGNOSTIC'], output: '<RAW RESPONSE OPENAI_API_KEY=synthetic>' };
  const selected = (id: string) => ({ outcome: 'failed', assertions: all.assertions.map(check => check.id === id
    ? { ...check, actual: id === 'a' ? '<selected actual>' : 'B ACTUAL', expected: 'EXPECTED',
      score: 0.2, threshold: 0.8, diagnostics: ['selected diagnostic'] } : check),
  turns: [{ id: 'linked', role: 'assistant', content: 'SELECTED TURN' }],
  tools: [{ id: 'tool', name: 'verify', outcome: 'result', arguments: 'SELECTED TOOL', result: 'ok' }],
  diagnostics: all.diagnostics, output: all.output });
  const context = { document, URL, URLSearchParams, matchMedia: () => ({ matches: false }), esc: escape,
    one: (selector: string) => ({ '[data-results-container]': { innerHTML: '' }, '[data-detail]': detail, '[data-side-panel]': { hidden: true } })[selector],
    suite: { id: 'suite', testCases: [{ id: 'case', name: 'Case' }] }, run: { runId: 'run', testedModel: 'model', scope: 'all',
      cases: [{ caseId: 'case', attempts: [{ number: 2, outcome: 'failed' }] }] },
    selectedRunId: 'run', latestKnownRunId: 'run', detailGeneration: 0, historyGeneration: 0, activePanel: null, setup: { caseId: '' },
    resetRepair() {}, repairMarkup: () => '<button>Analyze failure</button>', loadDiscovery() {}, loadRuntime: async () => undefined,
    json: async (url: string) => url.includes('history') ? new Promise(() => undefined) : ({ status: 'ok', value: { evidenceStatus: 'available', evidence: url.includes('assertionId=')
      ? selected(new URL('http://localhost/?' + url.split('?')[1]).searchParams.get('assertionId') || 'a') : all } }),
  };
  const api = vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_RESULTS_CLIENT + ';({inspectCase})', context) as { inspectCase(caseId: string, attempt: number, assertionId?: string): Promise<void> };
  await api.inspectCase('case', 2);
  assert.match(detail.innerHTML, /Failed check 1 of 2/);
  assert.match(detail.innerHTML, /&lt;selected actual&gt;/);
  assert.doesNotMatch(detail.innerHTML, /<selected actual>|<RAW RESPONSE/);
  assert.match(detail.innerHTML, /All checks \(4\).*grader.*passed.*Score 0.9.*Threshold 0.8.*GRADER RESULT.*grader diagnostic.*pending.*incomplete/s);
  assert.match(detail.innerHTML, /Attempt diagnostics.*ATTEMPT DIAGNOSTIC/s);
  assert.match(detail.innerHTML, /Conversation turns and tool trace.*SELECTED TURN.*SELECTED TOOL/s);
  assert.match(detail.innerHTML, /Bounded raw response.*&lt;RAW RESPONSE OPENAI_API_KEY=synthetic&gt;/);
  assert.doesNotMatch(detail.innerHTML, /No raw response was retained/);
  const actual = detail.innerHTML.indexOf('<h3>What happened</h3>');
  const expected = detail.innerHTML.indexOf('<h3>Expected</h3>');
  const trace = detail.innerHTML.indexOf('<summary>Diagnostics and trace</summary>');
  const action = detail.innerHTML.indexOf('Analyze failure');
  assert.ok(actual < expected && expected < trace && trace < action);
  assert.match(detail.innerHTML, /Score 0.2 · Threshold 0.8|Score 0.2.*Threshold 0.8/);
  await api.inspectCase('case', 2, 'b');
  assert.match(detail.innerHTML, /Failed check 2 of 2|B ACTUAL/);
  assert.match(detail.innerHTML, /What happened<\/h3><p>B ACTUAL/);
  assert.match(detail.innerHTML, /&lt;RAW RESPONSE OPENAI_API_KEY=synthetic&gt;/);
  all.output = '';
  await api.inspectCase('case', 2, 'a');
  assert.match(detail.innerHTML, /No raw response was retained for this attempt/);
  assert.doesNotMatch(detail.innerHTML, /RAW RESPONSE OPENAI_API_KEY/);
});

test('proposal notice remains in existing result detail across phone, tablet, and desktop regions', () => {
  assert.match(WORKSPACE_CASE_DETAIL_CLIENT, /<section data-repair-host aria-label="Guided repair">.*repairMarkup\(\)/s);
  assert.match(WORKSPACE_CASE_DETAIL_CLIENT, /latest && selectedCheck \? '<section data-repair-host/);
  assert.match(WORKSPACE_REPAIR_CLIENT, /<section class="model-notice detail-section" data-proposal-notice aria-label="Repair Proposal">/);
  assert.match(WORKSPACE_STYLES, /\.detail\{display:none\}.*\.sheet-overlay\{position:fixed/s);
  assert.match(WORKSPACE_STYLES, /@media\(max-width:699px\).*\.sheet:has\(\[data-action="close-detail"\]\)\{height:100dvh/s);
  assert.match(WORKSPACE_STYLES, /@media\(min-width:700px\) and \(max-width:1099px\).*\.detail:not\(\[hidden\]\)\{display:block;grid-column:2\}/s);
  assert.match(WORKSPACE_STYLES, /@media\(min-width:1100px\)\{.*?\.suite-rail\{display:block;grid-column:1;grid-row:1\/4\}.*?\[data-results-container\]\{grid-column:2\/4\}\.workspace:has\(\[data-detail\]:not\(\[hidden\]\)\) \[data-results-container\]\{grid-column:2\}\.detail:not\(\[hidden\]\)\{display:block;grid-column:3\}/s);
});

test('deferred selected evidence cannot resurrect old case detail or assistance after case, run, or suite selection', async () => {
  for (const change of ['case', 'run', 'suite'] as const) {
    const detail = { innerHTML: '', hidden: true, querySelector: () => ({ focus() {} }) };
    const document = { addEventListener() {} };
    let release!: (value: unknown) => void;
    const evidence = (actual: string) => ({ status: 'ok', value: { evidenceStatus: 'available', evidence: {
      outcome: 'failed', assertions: [{ id: 'failed', outcome: 'failed', actual, expected: 'expected', diagnostics: [] }],
      turns: [], tools: [], diagnostics: [], output: '' } } });
    const context = { document, URLSearchParams, matchMedia: () => ({ matches: false }), esc: escape,
      one: (selector: string) => ({ '[data-results-container]': {}, '[data-detail]': detail, '[data-side-panel]': { hidden: true } })[selector],
      suite: { id: 'suite', testCases: [{ id: 'old', name: 'Old' }, { id: 'new', name: 'New' }] },
      run: { runId: 'run', testedModel: 'model', scope: 'all', cases: [
        { caseId: 'old', attempts: [{ number: 1, outcome: 'failed' }] }, { caseId: 'new', attempts: [{ number: 1, outcome: 'failed' }] }] },
      selectedRunId: 'run', latestKnownRunId: 'run', detailGeneration: 0, historyGeneration: 0, activePanel: null, setup: { caseId: '' },
      resetRepair() {}, repairMarkup: () => '<button>Analyze failure</button>', loadDiscovery() {}, loadRuntime() {},
      json: async (url: string) => url.includes('/history?') ? new Promise(() => undefined)
        : url.includes('caseId=old') && url.includes('assertionId=')
        ? new Promise(resolve => { release = resolve; }) : evidence(url.includes('caseId=new') ? 'CURRENT' : 'OLD'),
    };
    const api = vm.runInNewContext(WORKSPACE_CASE_DETAIL_CLIENT + WORKSPACE_RESULTS_CLIENT + ';({ inspectCase })', context) as { inspectCase(id: string, attempt: number): Promise<void> };
    const pending = api.inspectCase('old', 1);
    await new Promise(resolve => setImmediate(resolve));
    if (change === 'case') await api.inspectCase('new', 1);
    else {
      context[change === 'run' ? 'run' : 'suite'] = change === 'run'
        ? { ...context.run, runId: 'different-run' } as never : { ...context.suite, id: 'different-suite' } as never;
      detail.innerHTML = 'CURRENT';
    }
    release(evidence('STALE PRIVATE EVIDENCE'));
    await pending;
    assert.doesNotMatch(detail.innerHTML, /STALE PRIVATE EVIDENCE|Old.*Analyze failure/s, change);
    assert.match(detail.innerHTML, /CURRENT/, change);
  }
});
