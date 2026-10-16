import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { browser, reference, saved } from './workspace-results-client-harness.js';

test('History labels latest and past, preserves selection on failed read, and returns to latest', async () => {
  const page = browser();
  const past = { ...saved, runId: 'past-run' };
  page.context.run = saved; page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.context.history = [
    { runId: 'run', createdAt: 2, testedModel: 'model', scope: 'all', state: 'completed', outcome: 'failed', cost: null },
    { runId: 'past-run', createdAt: 1, testedModel: 'model', scope: 'all', state: 'completed', outcome: 'failed', cost: null },
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
  page.context.history = [{ runId: 'run', createdAt: 1, testedModel: 'model', scope: 'all',
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
