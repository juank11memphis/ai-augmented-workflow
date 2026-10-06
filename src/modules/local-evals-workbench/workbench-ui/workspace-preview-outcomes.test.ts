import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { renderWorkspaceShell } from './workspace-layout.js';
import { startCopy } from '../start-local-evals-workbench/public-issue.js';

const reference = '123e4567-e89b-42d3-a456-426614174000';
const secret = 'sk-SYNTHETIC-SECRET-MARKER';
const suite = { id: 'suite', name: 'Suite', testCases: [{ id: 'case', name: 'Case' }] };

function harness(preview: () => Promise<unknown>) {
  const listeners = new Map<string, (event: { target: unknown }) => void>();
  const nodes = new Map<string, { textContent: string; hidden: boolean; focus: () => void }>();
  let focused = '';
  for (const key of ['[data-preview-heading]', '[data-preview-guidance]', '[data-preview-details]',
    '[data-action="copy-preview-issue"]', '[data-preview-copy-status]']) {
    nodes.set(key, { textContent: '', hidden: false, focus: () => { focused = key; } });
  }
  const notice = { hidden: true, querySelector: (key: string) => nodes.get(key) };
  const status = { textContent: '' };
  const reviewAction = { disabled: false, focus() { focused = 'review'; } };
  const controls = { scope: 'all', caseId: 'case', model: 'model', judge: '' };
  const region = { isConnected: true, hidden: false, querySelector(key: string) {
    if (key === '[data-action="review"]') return reviewAction;
    if (key === 'input[name="scope"]:checked') return { value: controls.scope };
    if (key === '[data-field="case"]') return { value: controls.caseId };
    if (key === '[data-field="model"]') return { value: controls.model };
    if (key === '[data-field="judge"]') return null;
    return null;
  } };
  const sheet = { innerHTML: '', textContent: '', querySelector: (key: string) => key === 'button' ? { focus() { focused = 'sheet'; } } :
    key === '[data-action="start"]' ? { disabled: false } : key === '[data-review-status]' ? { textContent: '' } : null };
  const progress = { textContent: '' };
  const document = { activeElement: null, getElementById: () => ({ textContent: JSON.stringify({ suites: [suite] }) }),
    querySelector(key: string): unknown { return nodes.get(key) ?? ({ '[data-workspace]': {}, '[data-sheet-slot]': sheet,
      '[data-run-setup]': region, '[data-preview-notice]': notice, '[data-setup-status]': status,
      '[data-progress]': progress })[key]; },
    addEventListener: (name: string, listener: (event: { target: unknown }) => void) => listeners.set(name, listener) };
  let starts = 0;
  const copied: string[] = [];
  const context = { document, crypto: { randomUUID: () => reference }, navigator: { clipboard: { writeText: async (value: string) => { copied.push(value); } } },
    fetch: async (url: string) => {
      if (url === '/api/eval-runs/start') { starts++; return { json: async () => ({ status: 'blocked' }) }; }
      if (url === '/api/eval-runs/preview') return { json: preview };
      throw new Error('Unexpected request');
    } };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; runtime={models:["model"],judgeModels:[],rubricCaseIds:[]}; setup.model="model"; return {showReview,readSetup,startRun};})()', context) as {
    showReview(): Promise<void>; readSetup(): void; startRun(): Promise<void>;
  };
  const click = (action: string) => listeners.get('click')?.({ target: { closest: () => ({ dataset: { action } }) } });
  return { api, click, controls, notice, nodes, status, sheet, copied, get starts() { return starts; }, get focused() { return focused; },
    setClipboard(value: unknown) { (context.navigator as { clipboard: unknown }).clipboard = value; } };
}

test('served preview shows known block beside Review and copies only safe issue fields', async () => {
  const browser = harness(async () => ({ status: 'blocked', stage: 'estimation', reason: 'runner-request-too-large',
    issue: { stage: 'preview', observedStage: 'estimation', outcome: 'blocked', category: 'runner-request-too-large', reference,
      title: secret, explanation: secret, nextStep: secret, extra: secret } }));
  await browser.api.showReview();
  assert.equal(browser.notice.hidden, false);
  assert.equal(browser.nodes.get('[data-preview-heading]')?.textContent, 'Preview blocked');
  assert.match(browser.nodes.get('[data-preview-guidance]')?.textContent ?? '', /estimation.*Copy issue details and report/);
  assert.equal(browser.focused, '[data-preview-heading]');
  assert.equal(browser.status.textContent, 'Preview blocked');
  assert.equal(browser.sheet.innerHTML, '');
  assert.equal(browser.starts, 0);
  browser.click('copy-preview-issue');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(browser.copied[0], 'Stage: preview\nOutcome: blocked\nCategory: runner-request-too-large\nReference: ' + reference);
  assert.doesNotMatch(JSON.stringify([...browser.nodes.values(), ...browser.copied]), /sk-SYNTHETIC-SECRET-MARKER/);
  assert.equal(browser.nodes.get('[data-preview-copy-status]')?.textContent, 'Issue details copied.');
  browser.setClipboard(null);
  browser.click('copy-preview-issue');
  assert.match(browser.nodes.get('[data-preview-copy-status]')?.textContent ?? '', /Select the issue details above/);
  assert.equal(browser.nodes.get('[data-preview-details]')?.hidden, false);
});

test('unknown cause and lost response do not invent a terminal reference or start', async () => {
  const unknown = harness(async () => ({ status: 'error', stage: 'resolved-inputs', reason: 'unknown-cause',
    issue: { stage: 'preview', observedStage: 'resolved-inputs', outcome: 'failed', category: 'unknown', reference,
      explanation: secret } }));
  await unknown.api.showReview();
  assert.match(unknown.nodes.get('[data-preview-guidance]')?.textContent ?? '', /Cause unknown during suite inputs/);
  assert.equal(unknown.starts, 0);
  assert.doesNotMatch(JSON.stringify([...unknown.nodes.values()]), /sk-SYNTHETIC-SECRET-MARKER/);
  const lost = harness(async () => { throw new Error(secret); });
  await lost.api.showReview();
  assert.equal(lost.nodes.get('[data-preview-heading]')?.textContent, 'Preview not confirmed');
  assert.match(lost.nodes.get('[data-preview-guidance]')?.textContent ?? '', /matching terminal event may not exist/);
  assert.equal(lost.nodes.get('[data-preview-details]')?.hidden, true);
  assert.equal(lost.nodes.get('[data-action="copy-preview-issue"]')?.hidden, true);
  assert.equal(lost.starts, 0);
  assert.doesNotMatch(JSON.stringify([...lost.nodes.values()]), /sk-SYNTHETIC-SECRET-MARKER/);
});

test('unavailable cost remains reviewable but only explicit Start submits a run', async () => {
  const browser = harness(async () => ({ status: 'ready', selectedCaseIds: ['case'], model: 'model', judgeModel: null,
    targetCalls: 1, judgeCalls: 0, totalCalls: 1, cost: { status: 'unavailable', reason: secret } }));
  await browser.api.showReview();
  assert.match(browser.sheet.innerHTML, /Review run|Estimated cost/);
  assert.match(browser.sheet.innerHTML, /Unavailable \(estimate not confirmed\)/);
  assert.doesNotMatch(browser.sheet.innerHTML, /sk-SYNTHETIC-SECRET-MARKER|Cost unavailable: sk-/);
  assert.equal(browser.starts, 0);
  await browser.api.startRun();
  assert.equal(browser.starts, 1);
});

test('changed selection invalidates an in-flight preview and clears an earlier notice', async () => {
  let finish!: (value: unknown) => void;
  const browser = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = browser.api.showReview();
  await new Promise(resolve => setImmediate(resolve));
  browser.controls.model = 'another-model';
  browser.api.readSetup();
  finish({ status: 'blocked', stage: 'selection', reason: 'case-unavailable', issue: {
    stage: 'preview', observedStage: 'selection', outcome: 'blocked', category: 'case-unavailable', reference } });
  await pending;
  assert.equal(browser.notice.hidden, true);
  assert.equal(browser.sheet.innerHTML, '');
  assert.equal(browser.starts, 0);
});

test('served shell keeps preview notice inside New run at all responsive breakpoints', () => {
  const html = renderWorkspaceShell({ status: 'ready', diagnostics: [], suites: [{ ...suite, description: '',
    readyTestCaseCount: 1, modelOptions: [], coverage: { categories: [], gaps: [] } }] });
  const body = html.split('<body>')[1]?.split('<script')[0] ?? '';
  const positions = ['data-run-setup', 'data-action="review"', 'data-preview-notice', 'data-setup-status', 'data-results-container', 'data-detail']
    .map(marker => body.indexOf(marker));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1]!)));
  assert.match(html, /data-action="history"/);
  assert.match(html, /@media\(max-width:699px\)/);
  assert.match(html, /@media\(min-width:700px\)/);
  assert.match(html, /@media\(min-width:1100px\)/);
  assert.doesNotMatch(html, /diagnostic-rail|preview-dashboard/);
});

function startHarness(response: () => Promise<{ status: number; json(): Promise<unknown> }>) {
  const listeners = new Map<string, (event: { target: { closest(): { dataset: { action: string } } } }) => void>();
  const nodes = new Map<string, { textContent: string; hidden: boolean; focus(): void }>();
  let focus = '';
  for (const key of ['[data-start-heading]', '[data-start-guidance]', '[data-start-details]', '[data-start-announcement]',
    '[data-action="copy-start-issue"]', '[data-action="review-start-again"]', '[data-action="open-history"]', '[data-start-copy-status]']) {
    nodes.set(key, { textContent: '', hidden: false, focus() { focus = key; } });
  }
  const notice = { hidden: true, querySelector: (key: string) => nodes.get(key) };
  const form = { hidden: false };
  const region = { hidden: false };
  const startButton = { disabled: false };
  const sheet = { textContent: '', querySelector: (key: string) => key === '[data-action="start"]' ? startButton : null };
  const progress = { textContent: '' };
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [suite] }) }),
    querySelector: (key: string): unknown => ({ '[data-workspace]': {}, '[data-sheet-slot]': sheet,
      '[data-run-setup]': region, '[data-start-form]': form, '[data-start-notice]': notice,
      '[data-progress]': progress })[key],
    addEventListener: (name: string, listener: (event: { target: { closest(): { dataset: { action: string } } } }) => void) => listeners.set(name, listener) };
  const copied: string[] = [];
  const requests: { url: string; options: { method: string; headers: Record<string, string>; body: string } }[] = [];
  const context = { document, crypto: { randomUUID: () => reference },
    navigator: { clipboard: { writeText: async (value: string) => { copied.push(value); } } },
    fetch: async (url: string, options: { method: string; headers: Record<string, string>; body: string }) => {
      requests.push({ url, options }); return response();
    } };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + ';'
    + 'closeSheet=()=>{}; clearSelectedDetail=()=>{}; renderWorkspace=()=>{}; pollRun=()=>{}; loadHistory=()=>{}; renderHistory=()=>{}; focusPanel=()=>{};'
    + 'review={request:{suiteId:"suite",model:"' + secret + '"},result:{selectedCaseIds:["case"],targetCalls:1,judgeCalls:0,totalCalls:1,cost:{status:"unavailable"}}};'
    + 'return {startRun,state:()=>({startUncertain,acceptedRunId,startReference})};})()', context) as {
      startRun(): Promise<void>; state(): { startUncertain: boolean; acceptedRunId: string | null; startReference: string | null };
    };
  const click = (action: string) => listeners.get('click')?.({ target: { closest: () => ({ dataset: { action } }) } });
  return { api, click, nodes, notice, form, region, sheet, progress, startButton, copied, requests, get focus() { return focus; } };
}

test('every known run-start block uses allowlisted title, explanation, next step and permitted action', async () => {
  assert.equal(Object.keys(startCopy).length, 38);
  for (const [reason, copy] of Object.entries(startCopy)) {
    const browser = startHarness(async () => ({ status: 422, json: async () => ({ status: 'blocked', reason, reference,
      issue: { stage: 'run-start', outcome: 'blocked', category: reason, reference,
        recoveryAction: copy.recoveryAction, title: secret, explanation: secret, nextStep: secret, extra: secret } }) }));
    await browser.api.startRun();
    assert.equal(browser.nodes.get('[data-start-heading]')?.textContent, copy.title, reason);
    assert.equal(browser.nodes.get('[data-start-guidance]')?.textContent, copy.explanation + ' ' + copy.nextStep, reason);
    assert.equal(browser.nodes.get('[data-action="review-start-again"]')?.hidden, copy.recoveryAction !== 'retry', reason);
    assert.equal(browser.nodes.get('[data-action="open-history"]')?.hidden, true, reason);
    assert.equal(browser.notice.hidden, false, reason);
    assert.equal(browser.region.hidden, false, reason);
    assert.equal(browser.focus, '[data-start-heading]', reason);
    assert.equal(browser.nodes.get('[data-start-announcement]')?.textContent, copy.title, reason);
    assert.equal(browser.api.state().startUncertain, false, reason);
    assert.equal(browser.requests.length, 1, reason);
    assert.equal(browser.requests[0]?.options.headers['x-sibu-request-reference'], reference, reason);
    browser.click('copy-start-issue');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(browser.copied[0], 'Stage: run-start\nOutcome: blocked\nCategory: ' + reason + '\nReference: ' + reference, reason);
    assert.doesNotMatch(JSON.stringify([...browser.nodes.values(), browser.copied, browser.sheet, browser.progress]), /sk-SYNTHETIC-SECRET-MARKER/, reason);
    await browser.api.startRun();
    assert.equal(browser.requests.length, 1, reason);
  }
});

test('malformed and unknown start issues never display untrusted copy or assert a failed run', async () => {
  for (const issue of [
    { stage: 'run-start', outcome: 'blocked', category: 'runner-timeout', reference, recoveryAction: 'report' },
    { stage: 'run-start', outcome: 'blocked', category: 'new-unknown-reason', reference, recoveryAction: 'retry' },
  ]) {
    const browser = startHarness(async () => ({ status: 422, json: async () => ({ status: 'blocked', reason: issue.category, reference,
      issue: { ...issue, title: secret, explanation: secret, nextStep: secret } }) }));
    await browser.api.startRun();
    assert.equal(browser.nodes.get('[data-start-heading]')?.textContent, 'Run start not confirmed');
    assert.equal(browser.api.state().startUncertain, true);
    assert.equal(browser.form.hidden, true);
    assert.equal(browser.nodes.get('[data-action="open-history"]')?.hidden, false);
    assert.equal(browser.nodes.get('[data-action="copy-start-issue"]')?.hidden, true);
    assert.doesNotMatch(JSON.stringify([...browser.nodes.values(), browser.copied]), /sk-SYNTHETIC-SECRET-MARKER|failed run/);
    await browser.api.startRun();
    assert.equal(browser.requests.length, 1);
  }
});

test('202 confirms one queued run; thrown fetch and body failure leave a visible History-first lock', async () => {
  const queued = startHarness(async () => ({ status: 202, json: async () => ({ status: 'queued', suiteId: 'suite', runId: 'run-1', reference }) }));
  await queued.api.startRun();
  assert.equal(queued.api.state().acceptedRunId, 'run-1');
  assert.equal(queued.api.state().startUncertain, false);
  assert.equal(queued.notice.hidden, true);
  assert.equal(queued.requests.length, 1);
  for (const response of [
    async () => { throw new Error(secret); },
    async () => ({ status: 202, json: async () => { throw new Error(secret); } }),
  ]) {
    const lost = startHarness(response);
    await lost.api.startRun();
    assert.equal(lost.nodes.get('[data-start-heading]')?.textContent, 'Run start not confirmed');
    assert.match(lost.nodes.get('[data-start-guidance]')?.textContent ?? '', /connection ended.*run may already exist.*History.*matching terminal event may not exist/i);
    assert.equal(lost.notice.hidden, false);
    assert.equal(lost.form.hidden, true);
    assert.equal(lost.nodes.get('[data-action="open-history"]')?.hidden, false);
    assert.equal(lost.nodes.get('[data-action="copy-start-issue"]')?.hidden, true);
    assert.equal(lost.api.state().startReference, reference);
    assert.equal(lost.focus, '[data-start-heading]');
    assert.equal(lost.nodes.get('[data-start-announcement]')?.textContent, 'Run start not confirmed');
    lost.progress.textContent = 'Unrelated status update';
    assert.equal(lost.nodes.get('[data-start-announcement]')?.textContent, 'Run start not confirmed');
    lost.click('open-history');
    assert.equal(lost.nodes.get('[data-action="open-history"]')?.hidden, false);
    assert.doesNotMatch(JSON.stringify([...lost.nodes.values(), lost.copied]), /sk-SYNTHETIC-SECRET-MARKER|failed run/);
    await lost.api.startRun();
    assert.equal(lost.requests.length, 1);
  }
});

test('New run start notice precedes Results in the existing phone, tablet and desktop layout', () => {
  const html = renderWorkspaceShell({ status: 'ready', diagnostics: [], suites: [{ ...suite, description: '',
    readyTestCaseCount: 1, modelOptions: [], coverage: { categories: [], gaps: [] } }] });
  const body = html.split('<body>')[1]?.split('<script')[0] ?? '';
  const positions = ['data-run-setup', 'data-start-form', 'data-start-notice', 'data-results-container', 'data-detail']
    .map(marker => body.indexOf(marker));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1]!)));
  assert.match(body, /data-start-notice hidden>[\s\S]*data-action="open-history" hidden>Open History/);
  assert.match(html, /@media\(max-width:699px\)/);
  assert.match(html, /@media\(min-width:700px\)/);
  assert.match(html, /@media\(min-width:1100px\)/);
  assert.doesNotMatch(body, /diagnostic-rail|progress-feed|data-action="start-again"/);
});
