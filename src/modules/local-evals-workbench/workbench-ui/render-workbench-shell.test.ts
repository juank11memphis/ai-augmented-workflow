import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import { createWorkbenchViewModel } from './view-model.js';
import { renderWorkbenchShell } from './render-workbench-shell.js';

describe('renderWorkbenchShell', () => {
  it('renders accessible suite controls, labels, summary, and progress', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery() }), '');

    assert.match(html, /<label class="field">Eval Suite/);
    assert.match(html, /<legend>Run scope<\/legend>/);
    assert.match(html, /All test cases/);
    assert.match(html, /<button[^>]*>Run all 2 test cases<\/button>/);
    assert.match(html, /<label class="field">Model/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /<progress[^>]+aria-label="Eval run progress"/);
    assert.match(html, /Pass rate/);
    assert.match(html, /Avg latency/);
    assert.match(html, /Cost/);
  });

  it('renders one-test-case run button label', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), runScope: { type: 'test_case', testCaseId: 'one' } }), '');

    assert.match(html, /Run 1 test case/);
  });

  it('disables controls while running or blocked', () => {
    const running = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), isRunning: true }), '');
    const blocked = renderWorkbenchShell(createWorkbenchViewModel({ discovery: blockedDiscovery() }), '');

    assert.match(running, /data-control="run" disabled aria-disabled="true"/);
    assert.match(running, /name="suiteId"[^>]*disabled aria-disabled="true"/);
    assert.match(blocked, /data-control="run" disabled aria-disabled="true"/);
  });

  it('keeps compact hierarchy and excludes result matrix and drawer surfaces', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery() }), '');

    assert.ok(html.indexOf('Eval Suite') < html.indexOf('Run scope'));
    assert.ok(html.indexOf('Run scope') < html.indexOf('Model'));
    assert.match(html, /workbench--compact/);
    assert.doesNotMatch(html, /Failure Workbench|Eval results|matrix|drawer/i);
  });

  it('escapes HTML and bootstrapped JSON safely', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: unsafeDiscovery() }), '');

    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<img|<script>alert|OPENAI_API_KEY|\/repo/);
    assert.match(html, /\\u003cscript/);
  });
});

function readyDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [{ id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] }], diagnostics: [] };
}

function blockedDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'blocked', reason: 'missing-evals-folder', message: 'No conventional evals folder was found.', guidance: [], suites: [], diagnostics: [] };
}

function unsafeDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [{ id: '<script>alert(1)</script>', name: '<img src=x onerror=alert(1)>', description: 'safe <script>alert(1)</script>', readyTestCaseCount: 1, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT <script>' }] }], diagnostics: [] };
}
