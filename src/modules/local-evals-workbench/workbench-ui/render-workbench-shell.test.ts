import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { EvalCell, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createWorkbenchViewModel } from './view-model.js';
import { renderWorkbenchShell } from './render-workbench-shell.js';

describe('renderWorkbenchShell', () => {
  it('renders accessible suite controls, labels, summary, filters, and progress', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery() }), '');

    assert.match(html, /<label class="field">Eval Suite/);
    assert.match(html, /<legend>Run scope<\/legend>/);
    assert.match(html, /<button[^>]*>Run all 2 test cases<\/button>/);
    assert.match(html, /<label class="field">Model/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /<progress[^>]+aria-label="Eval run progress"/);
    assert.match(html, /Failures only/);
    assert.match(html, /Search test cases/);
    assert.match(html, /aria-label="Visible models"/);
  });

  it('renders phone cards and desktop matrix with color-independent status cues', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun() }), '');

    assert.match(html, /class="phone-cards"/);
    assert.match(html, /class="matrix-wrap"/);
    assert.match(html, /<caption>Eval result matrix<\/caption>/);
    assert.match(html, /Missing skill boundary/);
    assert.match(html, /!<\/span> Failed/);
    assert.match(html, /1 failed \/ 2/);
    assert.match(html, /100 ms · 1,200 tokens · \$0\.0100/);
    assert.match(html, /Output says &lt;stop&gt; must happen/);
    assert.match(html, /Assertion failed: must stop/);
  });

  it('renders accessible cell button labels and selected-cell scaffolding', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun(), selectedCell: { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' } }), '');

    assert.match(html, /aria-label="Open GPT-5 mini Failed result for test case missing-skill-boundary"/);
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
    assert.match(html, /data-control="close-cell"/);
  });

  it('keeps blocked state behavior and disabled controls intact', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: blockedDiscovery() }), '');

    assert.match(html, /data-control="run" disabled aria-disabled="true"/);
    assert.match(html, /<section class="blocked" role="status">/);
    assert.match(html, /No conventional evals folder was found/);
  });

  it('escapes suite, row, output, diagnostic, assertion, and model text safely', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: unsafeDiscovery(), latestRun: unsafeRun() }), '');

    assert.match(html, /&lt;img/);
    assert.match(html, /&lt;row&gt;/);
    assert.match(html, /&lt;stop&gt;/);
    assert.match(html, /&lt;diagnostic&gt;/);
    assert.match(html, /GPT &lt;script&gt;/);
    assert.doesNotMatch(html, /<img|<script>alert|OPENAI_API_KEY|\/repo/);
    assert.match(html, /\\u003cscript/);
  });
});

function readyDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [{ id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }, { id: 'gpt-5', label: 'GPT-5' }] }], diagnostics: [] };
}

function blockedDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'blocked', reason: 'missing-evals-folder', message: 'No conventional evals folder was found.', guidance: [], suites: [], diagnostics: [] };
}

function unsafeDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [{ id: '<script>alert(1)</script>', name: '<img src=x onerror=alert(1)>', description: 'safe <script>alert(1)</script>', readyTestCaseCount: 1, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT <script>' }] }], diagnostics: [] };
}

function completedRun(): RunLocalEvalSuiteResult {
  return { status: 'completed', scope: 'all', matrix: { suiteId: 'skill-authoring', suiteName: 'Skill authoring checks', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status: 'failed', cells: [cell('missing-skill-boundary', 'gpt-5-mini', 'GPT-5 mini')] }] } };
}

function unsafeRun(): RunLocalEvalSuiteResult {
  return { status: 'completed', scope: 'all', matrix: { suiteId: '<script>alert(1)</script>', suiteName: '<suite>', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: '<row>', name: '<row>', status: 'failed', cells: [cell('<row>', 'gpt-5-mini', 'GPT <script>')] }] } };
}

function cell(testCaseId: string, modelId: string, modelLabel: string): EvalCell {
  return { testCaseId, modelId, modelLabel, status: 'failed', outputPreview: 'Output says <stop> must happen', assertions: [{ id: 'a1', label: '<assertion>', kind: 'assertion', status: 'failed', metrics: [], diagnostics: [], artifacts: [] }, { id: 'a2', label: 'Passes', kind: 'assertion', status: 'passed', metrics: [], diagnostics: [], artifacts: [] }], diagnostics: [{ code: 'failed', severity: 'error', message: 'Assertion failed: must stop <diagnostic>' }], metrics: [{ name: 'total_tokens', value: 1200 }, { name: 'total_cost', value: 0.01, unit: 'usd' }], artifacts: [], durationMs: 100 };
}
