import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';

type BlockedResult = { status: 'blocked'; reason: string; issue?: unknown; missingEnvironmentName?: unknown; rejectedSettingName?: unknown; undeclaredEnvironmentName?: unknown; secretValue?: string; stderr?: string };
const reference = '123e4567-e89b-42d3-a456-426614174000';
function issue(reason: string) { return { stage: 'model-check', outcome: 'blocked', category: reason, reference, title: 'sk-secret', explanation: 'private runner error' }; }

function blockedBrowser(result: BlockedResult, clipboard?: { writeText(text: string): Promise<void> }, lostResponse = false) {
  const listeners = new Map<string, (event: { target: { closest(selector: string): unknown } }) => void>();
  const fields = { innerHTML: '', querySelector: () => null };
  const review = { disabled: false };
  const announcement = { textContent: '' };
  const feedback = { textContent: '' };
  const results = { hidden: false, textContent: 'Previous results' };
  const history = { hidden: false, textContent: 'History' };
  const region = { querySelector: (selector: string) => ({
    '[data-setup-fields]': fields, '[data-action="review"]': review, '[data-model-copy-status]': feedback,
    '[data-model-notice-heading]': { focus() {} },
  })[selector as '[data-setup-fields]'] };
  const document = {
    activeElement: null as unknown,
    getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
    querySelector: (selector: string) => ({
      '[data-workspace]': {}, '[data-sheet-slot]': {}, '[data-run-setup]': region,
      '[data-setup-status]': announcement, '[data-results-container]': results,
      '[data-action="history"]': history,
    })[selector as '[data-workspace]'],
    addEventListener: (name: string, listener: (event: { target: { closest(selector: string): unknown } }) => void) => listeners.set(name, listener),
  };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return {loadRuntime, refreshSetupControls};})()', {
    document, navigator: clipboard ? { clipboard } : {}, fetch: async () => {
      if (lostResponse) throw new Error('sk-secret private provider stderr');
      return { json: async () => result };
    },
  }) as { loadRuntime(): Promise<void>; refreshSetupControls(): void };
  const click = (action: string) => listeners.get('click')?.({ target: { closest: () => ({ dataset: { action } }) } });
  return { api, fields, review, announcement, feedback, results, history, document, click };
}

test('model-check categories render contextual safe copy with read-only recovery', async () => {
  const cases = [
    ['environment-missing', /needs a required setting/], ['required-setting-rejected', /You do not need to set it/],
    ['runner-request-too-large', /too large/], ['runner-absent', /not found/], ['runner-start-failed', /could not start/],
    ['runner-exited', /stopped before/], ['runner-protocol-invalid', /could not understand/], ['runner-invalid', /could not use/],
    ['runner-timeout', /too long to respond/], ['capability-unsupported', /does not support/],
    ['model-unavailable', /no models available/], ['judge-unavailable', /no judge model available/],
    ['input-unsafe', /could not safely check/], ['unknown', /could not check models/],
  ] as const;
  for (const [reason, expected] of cases) {
    const browser = blockedBrowser({ status: 'blocked', reason, issue: issue(reason), secretValue: 'sk-secret', stderr: 'private runner error' });
    await browser.api.loadRuntime();
    assert.match(browser.fields.innerHTML, expected);
    assert.match(browser.fields.innerHTML, /Model being tested.*model-notice.*Can't check models.*Try again.*Copy issue details/s);
    assert.doesNotMatch(browser.fields.innerHTML, /data-field="model"|sk-secret|private runner error/);
    assert.equal(browser.review.disabled, true);
    assert.equal(browser.results.textContent, 'Previous results');
    assert.equal(browser.history.textContent, 'History');
    assert.match(browser.announcement.textContent, expected);
  }
});

test('safe setting names, unchecked names, and malformed issue fields remain private', async () => {
  for (const [reason, name, expected] of [
    ['environment-missing', 'OPENAI_API_KEY', /needs OPENAI_API_KEY.*project-root \.env/],
    ['required-setting-rejected', 'SIBU_EVAL_MODE', /sets SIBU_EVAL_MODE automatically.*You do not need to set it.*person who set up the suite/],
    ['required-setting-rejected', 'NODE_OPTIONS', /requests NODE_OPTIONS.*You do not need to set it/],
    ['required-setting-rejected', 'bad-name<script>', /requests a setting/],
    ['environment-undeclared', 'MODEL_API_KEY', /needs MODEL_API_KEY.*setup does not list it/],
    ['environment-undeclared', 'bad-name<script>', /needs a setting that its setup does not list/],
  ] as const) {
    const browser = blockedBrowser({ status: 'blocked', reason, issue: issue(reason),
      missingEnvironmentName: name, rejectedSettingName: name, undeclaredEnvironmentName: name });
    await browser.api.loadRuntime();
    assert.match(browser.fields.innerHTML, expected);
    assert.doesNotMatch(browser.fields.innerHTML, /bad-name|<script>/);
  }
  const browser = blockedBrowser({ status: 'blocked', reason: 'runner-timeout', issue: { ...issue('runner-timeout'), reference: 'sk-secret' } });
  await browser.api.loadRuntime();
  assert.doesNotMatch(browser.fields.innerHTML, /Copy issue details|sk-secret|Reference:/);
});

test('Copy issue details copies only safe fields, confirms without clearing notice or moving focus', async () => {
  let copied = '';
  const browser = blockedBrowser({ status: 'blocked', reason: 'runner-timeout', issue: issue('runner-timeout') },
    { writeText: async text => { copied = text; } });
  await browser.api.loadRuntime();
  const focus = { id: 'copy-button' };
  browser.document.activeElement = focus;
  browser.click('copy-model-issue');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, `Stage: model-check\nOutcome: blocked\nCategory: runner-timeout\nReference: ${reference}`);
  assert.equal(browser.feedback.textContent, 'Issue details copied.');
  assert.match(browser.fields.innerHTML, /Can\'t check models/);
  assert.equal(browser.document.activeElement, focus);
});

test('clipboard absence or rejection retains selectable details and notice', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw Error('denied'); } }]) {
    const browser = blockedBrowser({ status: 'blocked', reason: 'runner-timeout', issue: issue('runner-timeout') }, clipboard);
    await browser.api.loadRuntime();
    const visible = browser.fields.innerHTML;
    browser.click('copy-model-issue');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(browser.fields.innerHTML, visible);
    assert.match(browser.feedback.textContent, /Select the issue details above instead/);
    assert.equal(browser.review.disabled, true);
  }
});

test('lost model-check response offers connection retry without a fabricated reference', async () => {
  const browser = blockedBrowser({ status: 'blocked', reason: 'unknown' }, undefined, true);
  await browser.api.loadRuntime();
  assert.match(browser.fields.innerHTML, /received no response.*matching terminal event may not exist/s);
  assert.match(browser.fields.innerHTML, /Try again/);
  assert.doesNotMatch(browser.fields.innerHTML, /sk-secret|private provider stderr|Reference:|Copy issue details/);
  assert.equal(browser.review.disabled, true);
  assert.equal(browser.results.textContent, 'Previous results');
});

test('blocked preview preserves previous results, names preview stage, and never starts', async () => {
  const nodes = new Map<string, { textContent: string; hidden: boolean; focus(): void }>();
  let focused = false, starts = 0;
  for (const key of ['[data-preview-heading]', '[data-preview-guidance]', '[data-preview-details]',
    '[data-action="copy-preview-issue"]', '[data-preview-copy-status]']) {
    nodes.set(key, { textContent: '', hidden: false, focus() { focused = true; } });
  }
  const notice = { hidden: true, querySelector: (key: string) => nodes.get(key) };
  const results = { textContent: 'Previous results' };
  const region = { isConnected: true, querySelector(key: string) {
    return ({ 'input[name="scope"]:checked': { value: 'all' }, '[data-field="case"]': { value: 'case' },
      '[data-field="model"]': { value: 'model' },
      '[data-action="review"]': { disabled: false } })[key as '[data-field="model"]'];
  } };
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', name: 'Suite', testCases: [{ id: 'case', name: 'Case' }] }] }) }),
    querySelector: (key: string) => ({ '[data-workspace]': {}, '[data-run-setup]': region,
      '[data-preview-notice]': notice, '[data-setup-status]': { textContent: '' },
      '[data-results-container]': results })[key as '[data-workspace]'], addEventListener() {} };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; runtime={models:["model"],judgeModels:[],rubricCaseIds:[]}; setup.model="model"; return {showReview};})()', {
    document, fetch: async (url: string) => { if (url.includes('/start')) starts++; return { json: async () => ({
      status: 'blocked', stage: 'estimation', reason: 'runner-request-too-large',
      issue: { stage: 'preview', observedStage: 'estimation', outcome: 'blocked', category: 'runner-request-too-large', reference,
        explanation: 'sk-secret' },
    }) }; },
  }) as { showReview(): Promise<void> };
  await api.showReview();
  assert.equal(notice.hidden, false);
  assert.equal(nodes.get('[data-preview-heading]')?.textContent, 'Preview blocked');
  assert.match(nodes.get('[data-preview-guidance]')?.textContent ?? '', /estimation.*runner request was too large/i);
  assert.equal(results.textContent, 'Previous results');
  assert.equal(starts, 0);
  assert.equal(focused, true);
  assert.doesNotMatch(JSON.stringify([...nodes.values()]), /sk-secret/);
});

test('Try again only describes, focuses a failed notice, and ignores an older blocked response', async () => {
  const requests: { url: string; resolve(value: unknown): void }[] = [];
  let focused = 0;
  const heading = { focus: () => { focused++; } };
  const fields = { innerHTML: '', querySelector: () => heading };
  const review = { disabled: false };
  const region = { querySelector: (selector: string) => ({ '[data-setup-fields]': fields, '[data-action="review"]': review,
    '[data-model-notice-heading]': heading })[selector as '[data-setup-fields]'] };
  const listeners = new Map<string, (event: { target: { closest(): unknown } }) => void>();
  const document = { getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
    querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-sheet-slot]': {}, '[data-run-setup]': region,
      '[data-setup-status]': { textContent: '' } })[selector as '[data-workspace]'],
    addEventListener: (name: string, listener: (event: { target: { closest(): unknown } }) => void) => listeners.set(name, listener) };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return {loadRuntime};})()', {
    document, fetch: async (url: string) => ({ json: () => new Promise(resolve => requests.push({ url, resolve })) }),
  }) as { loadRuntime(): Promise<void> };
  const first = api.loadRuntime();
  await new Promise(resolve => setImmediate(resolve));
  listeners.get('click')?.({ target: { closest: () => ({ dataset: { action: 'retry-model' } }) } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.url === '/api/eval-suites/describe'));
  requests[1]!.resolve({ status: 'blocked', reason: 'runner-timeout', issue: issue('runner-timeout') });
  await new Promise(resolve => setImmediate(resolve));
  requests[0]!.resolve({ status: 'blocked', reason: 'runner-absent', issue: issue('runner-absent') });
  await first;
  assert.match(fields.innerHTML, /too long to respond/);
  assert.doesNotMatch(fields.innerHTML, /was not found/);
  assert.equal(focused, 1);
  assert.equal(review.disabled, true);
});

test('discovery responses preserve prior Results and copy only a validated server issue', async () => {
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  let copied = '';
  const browser = discoveryBrowser(async () => ({ json: async () => ({
    status: 'blocked', reason: 'unreadable-eval-suites', suites: [], message: 'sk-secret',
    issue: { stage: 'discovery', outcome: 'blocked', category: 'unreadable-eval-suites', reference,
      explanation: 'private content', nextStep: 'sk-secret' },
  }) }), { writeText: async text => { copied = text; } });
  await browser.loadDiscovery();
  assert.match(browser.host.nodes.heading.textContent, /couldn't read the eval suites/);
  assert.match(browser.host.nodes.guidance.textContent, /Check the local eval workspace/);
  assert.equal(browser.host.nodes.copy.hidden, false);
  assert.equal(browser.results.textContent, 'Previous results');
  browser.copy();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, `Stage: discovery\nOutcome: blocked\nCategory: unreadable-eval-suites\nReference: ${reference}`);
  assert.equal(browser.host.nodes.feedback.textContent, 'Issue details copied.');
  assert.doesNotMatch(JSON.stringify(browser.host.nodes) + copied, /sk-secret|private content/);
});

test('lost and invalid discovery responses show communication guidance without a fabricated reference', async () => {
  for (const [fetcher, expected] of [
    [async () => { throw new Error('sk-secret'); }, /received no response/],
    [async () => ({ json: async () => { throw new Error('sk-secret'); } }), /could not be read/],
    [async () => ({ json: async () => ({ status: 'blocked', reason: 'no-eval-suites', suites: null }) }), /could not be read/],
  ] as const) {
    const browser = discoveryBrowser(fetcher);
    await browser.loadDiscovery();
    assert.match(browser.host.nodes.guidance.textContent, expected);
    assert.match(browser.host.nodes.guidance.textContent, /matching terminal event may not exist/);
    assert.equal(browser.host.nodes.copy.hidden, true);
    assert.equal(browser.results.textContent, 'Previous results');
    assert.doesNotMatch(JSON.stringify(browser.host.nodes), /sk-secret|Reference:/);
  }
});

test('clipboard rejection retains selectable safe details and does not move focus', async () => {
  const browser = discoveryBrowser(async () => ({ json: async () => ({ status: 'blocked', reason: 'no-eval-suites', suites: [],
    issue: { stage: 'discovery', outcome: 'blocked', category: 'no-eval-suites', reference: '123e4567-e89b-42d3-a456-426614174000' } }) }),
  { writeText: async () => { throw new Error('denied'); } });
  await browser.loadDiscovery();
  const focused = { id: 'copy' };
  browser.document.activeElement = focused;
  browser.copy();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(browser.host.nodes.details.textContent, /Reference:/);
  assert.match(browser.host.nodes.feedback.textContent, /Select the issue details above instead/);
  assert.equal(browser.document.activeElement, focused);
});

function discoveryBrowser(fetcher: () => Promise<unknown>, clipboard?: { writeText(text: string): Promise<void> }) {
  const listeners = new Map<string, (event: { target: { closest(selector: string): unknown } }) => void>();
  const node = () => ({ textContent: '', hidden: false });
  const nodes = { heading: node(), guidance: node(), announcement: node(), details: node(), copy: node(), feedback: node() };
  const bySelector: Record<string, (typeof nodes)[keyof typeof nodes]> = {
    h3: nodes.heading, '[data-discovery-guidance]': nodes.guidance, '[data-discovery-announcement]': nodes.announcement, '[data-issue-details]': nodes.details,
    '[data-action="copy-issue"]': nodes.copy, '[data-issue-copy-status]': nodes.feedback,
  };
  const host = { nodes, hidden: false, innerHTML: '', querySelector: (selector: string) => bySelector[selector], setAttribute: () => undefined };
  const results = { textContent: 'Previous results' };
  const document = {
    activeElement: null as unknown,
    getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
    querySelector: (selector: string) => ({ '[data-workspace]': {}, '[data-sheet-slot]': {}, '[data-run-setup]': {},
      '[data-discovery-notice]': host, '[data-results-container]': results, '[data-issue-copy-status]': nodes.feedback })[selector as '[data-workspace]'],
    addEventListener: (name: string, listener: (event: { target: { closest(selector: string): unknown } }) => void) => listeners.set(name, listener),
  };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return {loadDiscovery};})()', {
    document, navigator: clipboard ? { clipboard } : {}, fetch: fetcher,
  }) as { loadDiscovery(): Promise<void> };
  return { ...api, host, results, document,
    copy: () => listeners.get('click')?.({ target: { closest: () => ({ dataset: { action: 'copy-issue' } }) } }) };
}
