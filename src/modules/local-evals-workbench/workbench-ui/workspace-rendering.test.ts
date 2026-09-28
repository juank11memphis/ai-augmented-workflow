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
  assert.doesNotMatch(html, /data-action="new-run" [^>]*disabled/);
});

it('renders responsive one-model list, coverage and history actions, and escapes suite content', () => {
  const html = renderWorkspaceShell({ status: 'ready', diagnostics: [], suites: [{
    id: 'suite', name: '<script>alert(1)</script>', description: 'Safe', readyTestCaseCount: 1,
    testCases: [{ id: 'case', name: 'One case' }], modelOptions: [],
    coverage: { categories: [{ id: 'safety', status: 'covered' }], gaps: [] },
  }] });
  assert.match(html, /data-action="coverage"/);
  assert.match(html, /data-action="history"/);
  assert.match(html, /data-action="new-run"/);
  assert.match(html, /data-results-container/);
  assert.match(html, /data-detail/);
  assert.match(html, /min-width:700px/);
  assert.match(html, /min-width:1100px/);
  assert.doesNotMatch(html, /Eval result matrix|variant-filter|coverage percentage/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});
