import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { EvalCell, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createWorkbenchViewModel } from './view-model.js';
import { renderWorkbenchShell } from './render-workbench-shell.js';
import { renderWorkspaceShell } from './workspace-layout.js';
import { WORKSPACE_STYLES } from './workspace-styles.js';
import { WORKBENCH_CLIENT_SCRIPT } from './workbench-client.js';

describe('WORKBENCH_CLIENT_SCRIPT', () => {
  it('contains drawer focus trap, Escape close, overlay close, focus restoration, and retry hooks', () => {
    assert.match(WORKBENCH_CLIENT_SCRIPT, /function trapDrawerFocus/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /event.key === 'Escape'/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-cell-overlay/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /restoreFocus/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-control=\"retry-cell\"/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-control=\"rerun-recommendation\"/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-control=\"suite-option\"/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /function selectSuite/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /function rerunRecommended/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /\/api\/eval-runs/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /\/api\/failure-analysis/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-control=\"analyze-failure\"/);
    assert.doesNotThrow(() => new Function(WORKBENCH_CLIENT_SCRIPT));
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-control=\"select-assertion\"/);
    const switchStart = WORKBENCH_CLIENT_SCRIPT.indexOf(`event.target.closest('[data-control=\"select-assertion\"]')`);
    const switchEnd = WORKBENCH_CLIENT_SCRIPT.indexOf(`event.target.matches('[data-control=\"close-cell\"]')`);
    const switchBranch = WORKBENCH_CLIENT_SCRIPT.slice(switchStart, switchEnd);
    assert.match(switchBranch, /renderSelectedCell\(\)/);
    assert.doesNotMatch(switchBranch, /fetch|api\/eval-runs|api\/repair-proposals|mutation/i);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /\/api\/repair-proposals/);
    assert.match(WORKBENCH_CLIENT_SCRIPT, /data-control=\"draft-proposal\"/);
    assert.doesNotMatch(WORKBENCH_CLIENT_SCRIPT, /automated repair|apply mutation|Ask about this failure/i);
  });
});

it('keeps the read notice in existing context across phone, tablet, and desktop DOM layouts', () => {
  const html = renderWorkspaceShell(readyDiscovery());
  const markup = html.slice(html.indexOf('<main class="workspace"'));
  const context = markup.indexOf('<section class="context" aria-labelledby="suite-title">');
  const notice = markup.indexOf('data-read-notice');
  const setup = markup.indexOf('data-run-setup');
  const results = markup.indexOf('data-results-container');
  assert.ok(context < notice && notice < setup && setup < results);
  assert.match(html, /data-read-notice hidden/);
  assert.match(html, /data-read-announcement/);
  assert.match(html, /data-action="recheck-read"/);
  assert.match(html, /data-action="copy-read-issue" hidden/);
  assert.doesNotMatch(html, /data-diagnostic-panel/);
  assert.match(WORKSPACE_STYLES, /@media\(max-width:699px\)/);
  assert.match(WORKSPACE_STYLES, /@media\(min-width:700px\) and \(max-width:1099px\)/);
  assert.match(WORKSPACE_STYLES, /@media\(min-width:1100px\)/);
});

describe('renderWorkbenchShell', () => {
  it('renders accessible suite controls, labels, summary, filters, and progress', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery() }), '');

    assert.match(html, /<label class="field suite-picker">Eval Suite/);
    assert.match(html, /<aside class="suite-nav" aria-label="Eval suites">/);
    assert.match(html, /data-control="suite-option"/);
    assert.match(html, /suite-nav__item--selected/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /<legend>Run scope<\/legend>/);
    assert.match(html, /class="field test-case-picker" hidden>Test case/);
    assert.match(html, /<option value="names-artifact" >Names artifact<\/option>/);
    assert.match(html, /<button[^>]*>Review run<\/button>/);
    assert.match(html, /<label class="field">Model/);
    assert.match(html, /<optgroup label="GPT-4 family">/);
    assert.match(html, /GPT-4o mini · ~\$0\.15 in \/ \$0\.60 out per 1M/);
    assert.match(html, /<optgroup label="GPT-5 family">/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /<progress[^>]+aria-label="Eval run progress"/);
    assert.match(html, /Failures only/);
    assert.match(html, /Search test cases/);
    assert.match(html, /aria-label="Visible models"/);
  });


  it('shows the selected test case picker when test-case scope is active', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), runScope: { type: 'test_case', testCaseId: 'missing-skill-boundary' } }), '');

    assert.match(html, /class="field test-case-picker" >Test case/);
    assert.match(html, /<option value="missing-skill-boundary" selected>Missing skill boundary<\/option>/);
    assert.match(html, /Review run/);
  });

  it('renders phone cards and desktop matrix with color-independent status cues', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun() }), '');

    assert.match(html, /class="phone-cards"/);
    assert.match(html, /class="matrix-wrap"/);
    assert.match(html, /<caption>Eval result matrix<\/caption>/);
    assert.match(html, /Missing skill boundary/);
    assert.match(html, /!<\/span> Failed/);
    assert.match(html, /2 failed \/ 3/);
    assert.match(html, /100 ms · 1,200 tokens · \$0\.0100/);
    assert.match(html, /Output says &lt;stop&gt; must happen/);
    assert.match(html, /Assertion failed: must stop/);
  });

  it('renders accessible cell button labels and failure workbench queue/evidence', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun(), selectedCell: { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' } }), '');

    assert.match(html, /aria-label="Open GPT-5 mini Failed result for test case missing-skill-boundary"/);
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
    assert.match(html, /aria-describedby="cell-dialog-description"/);
    assert.match(html, /aria-label="Close result detail"/);
    assert.match(html, /Failure Workbench/);
    assert.match(html, /Failed assertions/);
    assert.match(html, /data-control="select-assertion"/);
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /data-conversation-scope-key="skill-authoring:missing-skill-boundary:gpt-5-mini:a1"/);
    assert.match(html, /Active failure/);
    assert.match(html, /Actual output/);
    assert.match(html, /Expected/);
    assert.match(html, /Raw artifacts/);
    assert.match(html, /Want me to analyze this failed assertion\?/);
    assert.match(html, /data-control="analyze-failure"/);
    assert.match(html, /Proposal/);
    assert.match(html, /Repair direction/);
    assert.match(html, /data-control="draft-proposal"/);
    assert.doesNotMatch(html, /Approve change|Reject|mutation/i);
  });

  it('renders switched active assertion evidence and escapes failure labels', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun(), selectedCell: { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini', activeAssertionId: 'a3' } }), '');

    assert.match(html, /data-conversation-scope-key="skill-authoring:missing-skill-boundary:gpt-5-mini:a3"/);
    assert.match(html, /Must cite artifact/);
    assert.match(html, /expected artifact/);
    assert.match(html, /actual second/);
    assert.match(html, /&lt;assertion&gt;/);
  });



  it('renders passed, blocked, error, running, and not-run drawer states without repair controls', () => {
    for (const status of ['passed', 'blocked', 'error', 'running', 'not-run'] as const) {
      const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: runWithUiCell(status), selectedCell: { testCaseId: `${status}-case`, modelId: 'gpt-5-mini' } }), '');

      assert.match(html, /role="dialog"/);
      assert.match(html, /aria-modal="true"/);
      assert.match(html, new RegExp(status === 'error' ? 'Try again' : status === 'blocked' ? 'Add local config, then run the eval again.' : status === 'running' ? 'Running local evals' : status === 'not-run' ? 'Output will appear after running the eval.' : 'Passed: Must pass'));
      assert.doesNotMatch(html, /Approve change|automated repair|Reject|mutation/i);
    }
  });

  it('renders run-level blocked and error panels with diagnostics and retry copy', () => {
    const blockedHtml = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: blockedRun() }), '');
    const errorHtml = renderWorkbenchShell(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: errorRun() }), '');

    assert.match(blockedHtml, /class="state-panel state-panel--blocked" role="status"/);
    assert.match(blockedHtml, /Runner config missing/);
    assert.match(blockedHtml, /Add local config, then run the eval again./);
    assert.match(errorHtml, /class="state-panel state-panel--error" role="status"/);
    assert.match(errorHtml, /Could not run/);
    assert.match(errorHtml, /Try again/);
    assert.match(errorHtml, /Artifact store failed/);
  });

  it('keeps blocked state behavior and disabled controls intact', () => {
    const html = renderWorkbenchShell(createWorkbenchViewModel({ discovery: blockedDiscovery() }), '');

    assert.match(html, /data-control="run" disabled aria-disabled="true"/);
    assert.match(html, /<section class="state-panel state-panel--blocked" role="status"/);
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
  return {
    status: 'ready',
    suites: [
      { id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, testCases: [{ id: 'names-artifact', name: 'Names artifact' }, { id: 'missing-skill-boundary', name: 'Missing skill boundary' }], modelOptions: [{ id: 'gpt-4o-mini', label: 'GPT-4o mini', family: 'GPT-4 family', priceEstimate: '~$0.15 in / $0.60 out per 1M' }, { id: 'gpt-5-mini', label: 'GPT-5 mini', family: 'GPT-5 family', priceEstimate: '~$0.25 in / $2.00 out per 1M' }] },
      { id: 'repair-proposal-prompt', name: 'Repair proposal prompt checks', description: 'Checks repair proposals.', readyTestCaseCount: 1, testCases: [{ id: 'single-case', name: 'Single case' }], modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
    ],
    diagnostics: [],
  };
}

function blockedDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'blocked', reason: 'missing-evals-folder', message: 'No conventional evals folder was found.', guidance: [], suites: [], diagnostics: [] };
}

function unsafeDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [{ id: '<script>alert(1)</script>', name: '<img src=x onerror=alert(1)>', description: 'safe <script>alert(1)</script>', readyTestCaseCount: 1, testCases: [{ id: 'single-case', name: 'Single case' }], modelOptions: [{ id: 'gpt-5-mini', label: 'GPT <script>' }] }], diagnostics: [] };
}

function runWithUiCell(status: 'passed' | 'blocked' | 'error' | 'running' | 'not-run'): RunLocalEvalSuiteResult {
  const evalCell = { ...cell(`${status}-case`, 'gpt-5-mini', 'GPT-5 mini'), status, outputPreview: status === 'passed' ? 'Everything passed' : null, assertions: status === 'passed' ? [{ id: 'a1', label: 'Must pass', kind: 'assertion', status: 'passed', message: 'Passed.', metrics: [], diagnostics: [], artifacts: [] }] : [], diagnostics: [{ code: `${status}-diag`, severity: status === 'error' ? 'error' : 'warning', message: `${status} diagnostic` }] } as unknown as EvalCell;
  return { status: 'completed', scope: 'all', matrix: { suiteId: 'skill-authoring', suiteName: 'Skill authoring checks', status: status === 'running' || status === 'not-run' ? 'blocked' : status, aggregates: { total: 1, passed: status === 'passed' ? 1 : 0, failed: 0, blocked: status === 'blocked' ? 1 : 0, error: status === 'error' ? 1 : 0 }, diagnostics: [], rows: [{ testCaseId: `${status}-case`, name: `${status} case`, status: evalCell.status, cells: [evalCell] }] } } as unknown as RunLocalEvalSuiteResult;
}

function blockedRun(): RunLocalEvalSuiteResult {
  return { status: 'blocked', reason: 'runner-blocked', message: 'Runner blocked.', diagnostics: [{ code: 'blocked', severity: 'error', message: 'Runner config missing' }], matrix: completedRun().matrix };
}

function errorRun(): RunLocalEvalSuiteResult {
  return { status: 'error', reason: 'artifact-store-error', message: 'Could not run.', diagnostics: [{ code: 'artifact-store', severity: 'error', message: 'Artifact store failed' }], matrix: completedRun().matrix };
}

function completedRun(): RunLocalEvalSuiteResult {
  return { status: 'completed', scope: 'all', matrix: { suiteId: 'skill-authoring', suiteName: 'Skill authoring checks', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status: 'failed', cells: [cell('missing-skill-boundary', 'gpt-5-mini', 'GPT-5 mini')] }] } };
}

function unsafeRun(): RunLocalEvalSuiteResult {
  return { status: 'completed', scope: 'all', matrix: { suiteId: '<script>alert(1)</script>', suiteName: '<suite>', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: '<row>', name: '<row>', status: 'failed', cells: [cell('<row>', 'gpt-5-mini', 'GPT <script>')] }] } };
}

function cell(testCaseId: string, modelId: string, modelLabel: string): EvalCell {
  return { testCaseId, modelId, modelLabel, status: 'failed', outputPreview: 'Output says <stop> must happen', assertions: [{ id: 'a1', label: '<assertion>', kind: 'assertion', status: 'failed', expectedPreview: 'expected <stop>', actualPreview: 'actual <stop>', metrics: [], diagnostics: [], artifacts: [] }, { id: 'a2', label: 'Passes', kind: 'assertion', status: 'passed', metrics: [], diagnostics: [], artifacts: [] }, { id: 'a3', label: 'Must cite artifact', kind: 'grader', status: 'failed', expectedPreview: 'expected artifact', actualPreview: 'actual second', metrics: [], diagnostics: [], artifacts: [] }], diagnostics: [{ code: 'failed', severity: 'error', message: 'Assertion failed: must stop <diagnostic>' }], metrics: [{ name: 'total_tokens', value: 1200 }, { name: 'total_cost', value: 0.01, unit: 'usd' }], artifacts: [], durationMs: 100 };
}
