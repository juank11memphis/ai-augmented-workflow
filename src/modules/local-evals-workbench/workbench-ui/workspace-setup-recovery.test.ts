import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';

type BlockedResult = { status: 'blocked'; reason: string; missingEnvironmentName?: unknown; secretValue?: string; stderr?: string };

function blockedBrowser(result: BlockedResult, clipboard?: { writeText(text: string): Promise<void> }) {
  const listeners = new Map<string, (event: { target: { closest(selector: string): unknown } }) => void>();
  const fields = { innerHTML: '', querySelector: () => null };
  const review = { disabled: false };
  const announcement = { textContent: '' };
  const copyStatus = { textContent: '' };
  const results = { hidden: false, textContent: 'Previous results' };
  const region = { querySelector: (selector: string) => ({
    '[data-setup-fields]': fields, '[data-action="review"]': review,
  })[selector as '[data-setup-fields]' | '[data-action="review"]'] };
  const document = {
    activeElement: null as unknown,
    getElementById: () => ({ textContent: JSON.stringify({ suites: [{ id: 'suite', testCases: [] }] }) }),
    querySelector: (selector: string) => ({
      '[data-workspace]': {}, '[data-sheet-slot]': {}, '[data-run-setup]': region,
      '[data-setup-status]': announcement, '[data-copy-status]': copyStatus,
      '[data-results-container]': results,
    })[selector as '[data-workspace]'],
    addEventListener: (name: string, listener: (event: { target: { closest(selector: string): unknown } }) => void) => listeners.set(name, listener),
  };
  const api = vm.runInNewContext('(() => {' + WORKSPACE_SETUP_CLIENT + '; return {loadRuntime, refreshSetupControls};})()', {
    document, navigator: clipboard ? { clipboard } : {}, fetch: async () => ({ json: async () => result }),
  }) as { loadRuntime(): Promise<void>; refreshSetupControls(): void };
  const clickCopy = () => listeners.get('click')?.({ target: { closest: () => ({ dataset: { action: 'copy-steps' } }) } });
  return { api, fields, review, announcement, copyStatus, results, document, clickCopy };
}

test('known blocked reasons show distinct safe guidance instead of an empty model picker', async () => {
  const cases = [
    { reason: 'environment-missing', missingEnvironmentName: 'OPENAI_API_KEY', expected: /needs OPENAI_API_KEY.*project-root \.env, or to \.env\.local if \.env is missing or has no key.*restart Sibu Evals/ },
    { reason: 'environment-missing', missingEnvironmentName: 'TEST_KEY', expected: /needs TEST_KEY.*Set its value in the terminal that starts Sibu Evals.*restart Sibu Evals/ },
    { reason: 'environment-missing', expected: /needs server-side setup.*Check the suite requirements/ },
    { reason: 'model-unavailable', expected: /listed no models.*Update its supported models/ },
    { reason: 'runner-unavailable', expected: /eval runner could not start.*Check the suite setup/ },
    { reason: 'runner-invalid', expected: /runner returned an invalid description.*Check the suite setup/ },
    { reason: 'capability-unsupported', expected: /runner capabilities that are not available.*Check its runner setup/ },
    { reason: 'judge-unavailable', expected: /no compatible Judge models.*Check its Judge model setup/ },
    { reason: 'unknown', expected: /Compatible models could not be checked.*Check the suite setup/ },
  ];
  for (const item of cases) {
    const browser = blockedBrowser({ status: 'blocked', ...item, secretValue: 'do-not-show', stderr: 'private runner error' });
    await browser.api.loadRuntime();
    assert.match(browser.fields.innerHTML, item.expected);
    assert.match(browser.fields.innerHTML, /Model being tested.*data-model-readiness.*Copy steps/s);
    assert.doesNotMatch(browser.fields.innerHTML, /data-field="model"|type="password"|do-not-show|private runner error/);
    assert.equal(browser.review.disabled, true);
    assert.match(browser.announcement.textContent, item.expected);
    assert.equal(browser.results.hidden, false);
    assert.equal(browser.results.textContent, 'Previous results');
  }
});

test('unchecked names and unknown causes never leak into visible or copied steps', async () => {
  for (const missingEnvironmentName of ['bad-name<script>', 'KEY=value', 'secret-value', 123]) {
    const browser = blockedBrowser({ status: 'blocked', reason: 'environment-missing', missingEnvironmentName });
    await browser.api.loadRuntime();
    assert.match(browser.fields.innerHTML, /Check the suite requirements/);
    assert.doesNotMatch(browser.fields.innerHTML, /bad-name|KEY=value|secret-value|123/);
  }
  const browser = blockedBrowser({ status: 'blocked', reason: 'unrecognized', missingEnvironmentName: 'SECRET_KEY' });
  await browser.api.loadRuntime();
  assert.match(browser.fields.innerHTML, /Compatible models could not be checked/);
  assert.doesNotMatch(browser.fields.innerHTML, /SECRET_KEY/);
});

test('Copy steps copies exactly the visible guidance and reports success without moving focus', async () => {
  let copied = '';
  const browser = blockedBrowser({ status: 'blocked', reason: 'environment-missing', missingEnvironmentName: 'TEST_KEY' },
    { writeText: async text => { copied = text; } });
  await browser.api.loadRuntime();
  const focus = { id: 'copy-button' };
  browser.document.activeElement = focus;
  browser.clickCopy();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, browser.announcement.textContent);
  assert.equal(browser.copyStatus.textContent, 'Steps copied.');
  assert.equal(browser.document.activeElement, focus);
});

test('Clipboard absence or rejection leaves readable steps and a manual-select fallback', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw Error('denied'); } }]) {
    const browser = blockedBrowser({ status: 'blocked', reason: 'runner-unavailable' }, clipboard);
    await browser.api.loadRuntime();
    const visible = browser.fields.innerHTML;
    browser.clickCopy();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(browser.fields.innerHTML, visible);
    assert.match(browser.copyStatus.textContent, /Select the steps above instead/);
    assert.equal(browser.review.disabled, true);
  }
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
