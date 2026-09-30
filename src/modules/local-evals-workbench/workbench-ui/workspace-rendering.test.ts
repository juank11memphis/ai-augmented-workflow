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
