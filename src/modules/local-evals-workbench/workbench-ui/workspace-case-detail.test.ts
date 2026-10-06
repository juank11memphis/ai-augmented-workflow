import assert from 'node:assert/strict';
import { it } from 'node:test';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';
import { escapeHtml } from './render-workbench-shell.js';

type Check = { id: string; outcome: string; score: number | null; threshold: number | null;
  actual: string; expected: string; diagnostics: string[] };
type Evidence = { outcome: string; assertions: Check[]; output: string; truncated: boolean;
  diagnostics: string[]; turns: { role: string; content: string }[];
  tools: { name: string; outcome: string; arguments: string; result: string }[] };
type Detail = { suiteName: string; runId: string; caseId: string; caseName: string; attempt: number;
  attempts: { number: number; outcome: string }[]; evidence: Evidence; selectedCheck: Check | null; latest: boolean; reviewArtifactPath?: string };

const render = new Function('esc', `${WORKSPACE_CASE_DETAIL_CLIENT}\nreturn renderCaseDetail;`)(
  (value: unknown) => escapeHtml(String(value ?? '')),
) as (detail: Detail) => string;

const failedCheck: Check = { id: 'policy-match', outcome: 'failed', score: 0.2, threshold: 0.8,
  actual: '<private-actual>', expected: '<private-expected>', diagnostics: ['<private-check-diagnostic>'] };
const base: Detail = {
  suiteName: 'Support checks', runId: 'run-7', caseId: 'refund', caseName: 'Refund question',
  attempt: 1, attempts: [{ number: 1, outcome: 'failed' }, { number: 2, outcome: 'passed' }],
  evidence: { outcome: 'failed', assertions: [failedCheck], output: '<private-raw>', truncated: false,
    diagnostics: ['<private-attempt-diagnostic>'], turns: [{ role: 'assistant', content: '<private-turn>' }],
    tools: [{ name: 'lookup', outcome: 'result', arguments: '<private-args>', result: '<private-result>' }] },
  selectedCheck: failedCheck, latest: true, reviewArtifactPath: 'evals/artifacts/support/run-7/cases/refund/1.json',
};

it('renders run and case identity, labeled attempt and failed-check controls, selected status, and available metrics', () => {
  const html = render(base);
  assert.match(html, /Refund question · failed/);
  assert.match(html, /Run run-7 · Case refund/);
  assert.match(html, /Attempt<select data-action="attempt-select"/);
  assert.match(html, /Failed check 1 of 1<select data-action="assertion-select"/);
  assert.match(html, /Selected check: policy-match · failed/);
  assert.match(html, /What happened.*Expected/s);
  assert.match(html, /Score 0.2 · Threshold 0.8/);
  assert.match(html, /Review with your LLM.*evals\/artifacts\/support\/run-7\/cases\/refund\/1.json/s);
  assert.doesNotMatch(html, /Analyze failure|Draft repair|Approve and apply/);
});

it('escapes private evidence only in intentional detail and discloses all checks, diagnostics, trace, and raw response', () => {
  const html = render({ ...base, suiteName: '<private-suite>', caseName: '<private-case>' });
  for (const value of ['<private-actual>', '<private-expected>', '<private-raw>', '<private-turn>',
    '<private-check-diagnostic>', '<private-attempt-diagnostic>', '<private-args>', '<private-result>',
    '<private-suite>', '<private-case>']) {
    assert.doesNotMatch(html, new RegExp(value));
    assert.ok(html.includes(escapeHtml(value)));
  }
  assert.match(html, /<details[^>]*><summary>All checks \(1\)<\/summary>/);
  assert.match(html, /<details[^>]*><summary>Diagnostics and trace<\/summary>/);
  assert.match(html, /<details[^>]*><summary>Bounded raw response<\/summary>/);
  assert.doesNotMatch(html, /aria-live|role="status"|data-read-notice|data-results-container/);
});

it('keeps a passed attempt without failed assertions inspectable, without failed selection or analysis', () => {
  const html = render({ ...base, attempt: 2, selectedCheck: null,
    evidence: { ...base.evidence, outcome: 'passed', assertions: [{ ...failedCheck, outcome: 'passed',
      actual: 'A passed check', expected: 'Expected pass' }], output: 'Passed attempt output' } });
  assert.match(html, /No failed check in this attempt/);
  assert.match(html, /What happened.*Passed attempt output.*Expected.*No expected behavior reported/s);
  assert.match(html, /All checks \(1\).*A passed check/s);
  assert.doesNotMatch(html, /data-action="assertion-select"|data-action="analyze-failure"|data-repair-host/);
});

it('states missing optional evidence honestly and gates assistance for historical runs', () => {
  const html = render({ ...base, latest: false, selectedCheck: { ...failedCheck, actual: '', expected: '', score: null, threshold: null },
    evidence: { ...base.evidence, output: '', assertions: [{ ...failedCheck, actual: '', expected: '', score: null, threshold: null }],
      diagnostics: [], turns: [], tools: [] } });
  assert.match(html, /Historical run · read-only/);
  assert.match(html, /No actual behavior reported/);
  assert.match(html, /No expected behavior reported/);
  assert.match(html, /No attempt diagnostics/);
  assert.match(html, /No trace reported/);
  assert.match(html, /No raw response was retained/);
  assert.doesNotMatch(html, /class="detail-score"|data-repair-host|data-action="analyze-failure"/);
});
