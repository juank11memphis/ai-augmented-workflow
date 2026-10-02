import assert from 'node:assert/strict';
import { it } from 'node:test';
import { renderWorkspaceShell } from './workspace-layout.js';
import { WORKSPACE_CLIENT_SCRIPT } from './workspace-client.js';

it('ships syntactically valid progressive-enhancement JavaScript', () => {
  assert.doesNotThrow(() => new Function(WORKSPACE_CLIENT_SCRIPT));
});

it('renders a copyable no-suite next step without run controls', () => {
  const html = renderWorkspaceShell({ status: 'blocked', reason: 'missing-evals-folder', message: 'Missing', guidance: [], suites: [], diagnostics: [] });
  assert.match(html, /Create production-ready Sibu evals for this project/);
  assert.match(html, /Copy prompt/);
  assert.match(html, /data-run-setup hidden/);
});

it('renders responsive one-model list, coverage and history actions, and escapes suite content', () => {
  const html = renderWorkspaceShell({ status: 'ready', diagnostics: [], suites: [{
    id: 'suite', name: '<script>alert(1)</script>', description: 'Safe', readyTestCaseCount: 1,
    testCases: [{ id: 'case', name: 'One case' }], modelOptions: [],
    coverage: { categories: [{ id: 'safety', status: 'covered' }], gaps: [] },
  }] });
  assert.match(html, /data-action="coverage"/);
  assert.match(html, /data-action="history"/);
  assert.match(html, /data-run-setup/);
  assert.match(html, /data-setup-fields/);
  assert.match(html, /data-action="review"/);
  assert.doesNotMatch(html, /data-action="new-run"/);
  assert.match(html, /data-results-container/);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /<summary>Model support<\/summary>/);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /Sibu\\'s built-in analysis and repair help currently uses OpenAI/);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /More providers are planned/);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /Model being tested.*model-notice.*retry-model/s);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /copy-model-issue/);
  assert.match(html, /\.model-notice\{border:1px/);
  assert.match(html, /data-detail/);
  assert.match(html, /min-width:700px/);
  assert.match(html, /min-width:1100px/);
  assert.match(html, /grid-template-columns:minmax\(16rem,2fr\) minmax\(18rem,3fr\)/);
  assert.match(html, /\[data-run-setup\] \[data-setup-fields\]\{display:grid/);
  assert.match(html, /\.sheet-overlay\{position:fixed;inset:0/);
  assert.match(html, /\.workspace:has\(\[data-run-setup\]\[hidden\]\) \[data-results-container\]/);
  assert.doesNotMatch(html, /Eval result matrix|variant-filter|coverage percentage/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

it('renders contextual discovery recovery without embedding unsafe diagnostics', () => {
  for (const [reason, title] of [['no-eval-suites', 'No eval suites found'], ['unreadable-eval-suites', "Sibu couldn't read the eval suites"]] as const) {
    const html = renderWorkspaceShell({ status: 'blocked', reason, message: 'sk-secret', guidance: ['private content'], suites: [],
      diagnostics: [{ code: 'suite-file-read-failed', severity: 'error', location: '/private/project', message: 'sk-secret' }] });
    assert.match(html, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /data-discovery-notice/);
    assert.match(html, /data-issue-details hidden/);
    assert.match(html, /data-action="copy-issue" hidden/);
    assert.doesNotMatch(html, /sk-secret|private content|\/private\/project/);
    assert.match(html, /data-results-container/);
    assert.match(html, /data-run-setup hidden/);
  }
});

it('keeps entry recovery in the suite context before setup and Results at phone, tablet, and desktop widths', () => {
  const html = renderWorkspaceShell({ status: 'blocked', reason: 'unreadable-eval-suites', message: 'Unsafe detail', guidance: [], suites: [], diagnostics: [] });
  const bodyMarkup = html.split('<body>')[1]?.split('<script')[0];
  assert.ok(bodyMarkup, 'Expected body markup before workspace scripts');
  const positions = ['class="app-header"', 'class="suite-rail"', 'id="suite-title"', 'data-discovery-notice', 'data-run-setup', 'data-results-container', 'data-detail']
    .map(marker => bodyMarkup.indexOf(marker));
  assert.ok(positions.every(position => position >= 0));
  assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]!));
  assert.match(html, /data-discovery-announcement role="status"/);
  assert.match(html, /data-issue-copy-status role="status"/);
  assert.match(html, /@media\(max-width:699px\)/);
  assert.match(html, /@media\(min-width:700px\)/);
  assert.match(html, /@media\(min-width:1100px\)/);
  assert.match(html, /\.suite-rail\{display:block/);
  assert.doesNotMatch(html, /diagnostic-rail|diagnostic-history/);
});

it('keeps failure analysis notice in existing result detail instead of adding a diagnostic panel', () => {
  const html = renderWorkspaceShell({ status: 'ready', diagnostics: [], suites: [] });
  assert.match(WORKSPACE_CLIENT_SCRIPT, /<section data-repair-host aria-label="Guided repair">.*repairMarkup\(\)/s);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /data-analysis-notice/);
  assert.match(WORKSPACE_CLIENT_SCRIPT, /data-analysis-issue-details/);
  assert.match(html, /data-results-container.*data-detail.*data-side-panel hidden/s);
  assert.doesNotMatch(html, /diagnostic-rail|diagnostic-history|data-analysis-panel/);
});
