import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';

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
  const selected = (id: string) => ({ outcome: 'failed', assertions: [{ id, outcome: 'failed', actual: id === 'a' ? '<selected actual>' : 'B ACTUAL',
    expected: 'EXPECTED', score: 0.2, threshold: 0.8, diagnostics: ['selected diagnostic'] }],
  turns: [{ id: 'linked', role: 'assistant', content: 'SELECTED TURN' }],
  tools: [{ id: 'tool', name: 'verify', outcome: 'result', arguments: 'SELECTED TOOL', result: 'ok' }], diagnostics: [], output: '' });
  const context = { document, URL, URLSearchParams, matchMedia: () => ({ matches: false }), esc: escape,
    one: (selector: string) => ({ '[data-results-container]': { innerHTML: '' }, '[data-detail]': detail, '[data-side-panel]': { hidden: true } })[selector],
    suite: { id: 'suite', testCases: [{ id: 'case', name: 'Case' }] }, run: { runId: 'run', testedModel: 'model', scope: 'all',
      cases: [{ caseId: 'case', attempts: [{ number: 2, outcome: 'failed' }] }] },
    selectedRunId: 'run', latestKnownRunId: 'run', detailGeneration: 0, historyGeneration: 0, activePanel: null, setup: { caseId: '' },
    resetRepair() {}, repairMarkup: () => '<button>Analyze failure</button>', loadDiscovery() {}, loadRuntime: async () => undefined,
    json: async (url: string) => url.includes('history') ? new Promise(() => undefined) : ({ status: 'ok', value: { evidenceStatus: 'available', evidence: url.includes('assertionId=')
      ? selected(new URL('http://localhost/?' + url.split('?')[1]).searchParams.get('assertionId') || 'a') : all } }),
  };
  const api = vm.runInNewContext(WORKSPACE_RESULTS_CLIENT + ';({inspectCase})', context) as { inspectCase(caseId: string, attempt: number, assertionId?: string): Promise<void> };
  await api.inspectCase('case', 2);
  assert.match(detail.innerHTML, /Failed check 1 of 2/);
  assert.match(detail.innerHTML, /&lt;selected actual&gt;/);
  assert.doesNotMatch(detail.innerHTML, /<selected actual>|<RAW RESPONSE/);
  assert.match(detail.innerHTML, /All checks \(4\).*grader.*passed.*Score 0.9.*Threshold 0.8.*GRADER RESULT.*grader diagnostic.*pending.*incomplete/s);
  assert.match(detail.innerHTML, /Attempt diagnostics.*ATTEMPT DIAGNOSTIC/s);
  assert.match(detail.innerHTML, /Bounded raw response.*&lt;RAW RESPONSE OPENAI_API_KEY=synthetic&gt;/);
  assert.doesNotMatch(detail.innerHTML, /No raw response was retained/);
  const actual = detail.innerHTML.indexOf('<h3>What happened</h3>');
  const expected = detail.innerHTML.indexOf('<h3>Expected</h3>');
  const trace = detail.innerHTML.indexOf('<summary>Conversation turns and tool trace</summary>');
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
