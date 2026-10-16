import assert from 'node:assert/strict';
import test from 'node:test';
import { browser, saved } from './workspace-results-client-harness.js';
import { completedCaseResults } from './workspace-result-data.js';

const completedRun = { ...saved, caseIds: ['alpha', 'beta', 'gamma'], testedModel: 'legacy-model', judgeModel: null,
  cases: ['alpha', 'beta', 'gamma'].map((caseId, index) => ({ caseId, state: 'completed',
    testedModel: index === 1 ? 'actual-beta' : 'actual-model', judgeModel: index === 1 ? 'actual-judge' : null,
    attempts: [{ number: 1, outcome: 'passed' }] })) };

test('suite switching moves accessible rail selection and keeps the mobile picker in sync', () => {
  const page = browser();
  const picker = page.context.one('[data-action="suite-select"]') as { value: string };
  page.api.renderWorkspace();
  assert.equal(page.railButtons[0]!.getAttribute('aria-current'), 'page');
  assert.equal(page.railButtons[1]!.getAttribute('aria-current'), undefined);
  assert.equal(picker.value, 'suite');

  page.api.selectSuite('second');
  assert.equal(page.railButtons[0]!.getAttribute('aria-current'), undefined);
  assert.equal(page.railButtons[1]!.getAttribute('aria-current'), 'page');
  assert.equal(picker.value, 'second');
  assert.equal((page.context.one('[data-suite-title]') as { textContent: string }).textContent, 'Second');

  page.context.startPending = true;
  picker.value = 'suite';
  page.api.selectSuite('suite');
  assert.equal(picker.value, 'second');
  assert.equal(page.railButtons[1]!.getAttribute('aria-current'), 'page');
});

test('end and middle edits, deletion, caret and selection retain one input while rows and count filter', () => {
  const page = browser();
  page.context.run = completedRun as never;
  page.api.renderWorkspace();
  assert.equal(page.count.textContent, '3');
  assert.match(page.list.innerHTML, /Alpha case/);
  assert.match(page.list.innerHTML, /Beta case/);
  assert.match(page.list.innerHTML, /Gamma case/);
  assert.match(page.list.innerHTML, /Model: <\/span>actual-beta/);
  assert.match(page.list.innerHTML, /Judge model: <\/span>actual-judge/);
  assert.doesNotMatch(page.list.innerHTML, /legacy-model/);
  const projected = completedCaseResults(completedRun as never, page.context.suite as never);
  assert.deepEqual(projected.map(item => [item.name, item.model, item.judgeModel]), [
    ['Alpha case', 'actual-model', null], ['Beta case', 'actual-beta', 'actual-judge'], ['Gamma case', 'actual-model', null],
  ]);
  page.input.focus();
  const input = page.input, section = page.section;
  page.edit('Al', 2);
  assert.equal(page.input.value, 'Al');
  assert.equal(page.count.textContent, '1');
  assert.match(page.list.innerHTML, /Alpha case/);
  assert.doesNotMatch(page.list.innerHTML, /Beta case|Gamma case/);
  page.edit('Alha', 2);
  assert.equal(page.count.textContent, '0');
  page.edit('Alpha', 3);
  assert.equal(page.input.value, 'Alpha');
  assert.equal(page.count.textContent, '1');
  page.edit('Alha', 2, 3);
  assert.equal(page.input.selectionStart, 2);
  assert.equal(page.input.selectionEnd, 3);
  page.edit('Alpha', 3);
  assert.equal(page.input.value, 'Alpha');
  page.edit('Alpha ', 6);
  assert.equal(page.count.textContent, '1');
  assert.equal(page.input, input);
  assert.equal(page.results.querySelector('.results'), section);
  assert.equal(page.document.activeElement, input);
  assert.equal(page.input.selectionStart, 6);
  assert.equal(page.input.selectionEnd, 6);
  assert.equal(page.replacements(), 0);
});
test('poll rejects a mismatched run snapshot without replacing selected results', async () => {
  const page = browser(); page.context.run = saved; page.context.selectedRunId = 'run';
  const poll = page.api.pollRun(); page.resolvePoll()?.({ status: 'ok', value: { summary: { ...saved, runId: 'other' } } }); await poll;
  assert.equal(page.api.state().run, saved); assert.equal(page.api.state().selectedRunId, 'run');
  assert.match(page.readHeading.textContent, /Run status/);
});
test('no-match copy retains an editable query and clearing restores all rows and count', () => {
  const page = browser();
  page.context.run = completedRun as never;
  page.api.renderWorkspace();
  page.input.focus();
  page.edit('nothing', 4, 7);
  assert.equal(page.count.textContent, '0');
  assert.equal(page.list.innerHTML, '');
  assert.equal(page.empty.hidden, false);
  assert.equal(page.empty.textContent, 'No completed results match this search.');
  assert.equal(page.input.value, 'nothing');
  assert.equal(page.document.activeElement, page.input);
  page.edit('', 0);
  assert.equal(page.count.textContent, '3');
  assert.equal(page.empty.hidden, true);
  for (const name of ['Alpha case', 'Beta case', 'Gamma case']) assert.match(page.list.innerHTML, new RegExp(name));
  assert.equal(page.replacements(), 0);
});
test('selected-run browser summary uses selected scope, not filtered rows or recorded-case count', () => {
  const page = browser();
  page.context.run = { ...saved, state: 'running', caseIds: ['alpha', 'beta'], finishedAt: undefined,
    cases: [{ caseId: 'alpha', state: 'completed', attempts: [{ outcome: 'failed' }, { outcome: 'passed' }] }] } as never;
  page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  page.api.renderWorkspace();
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /1 failed · 1 not finished · 1 excluded/);
  assert.equal(page.count.textContent, '1');
  assert.match(page.list.innerHTML, /Alpha case/);
  assert.doesNotMatch(page.list.innerHTML, /Beta case|Gamma case|excluded/);
  assert.equal((page.context.one('[data-run-metrics]') as { textContent: string }).textContent, '');
  page.edit('Gamma', 3);
  assert.equal(page.count.textContent, '0');
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /1 failed · 1 not finished/);
  page.context.latestKnownRunId = 'newer'; page.api.renderWorkspace();
  assert.match((page.context.one('[data-latest-label]') as { textContent: string }).textContent, /Past run/);
});
test('browser keeps not-run, running, incomplete, failed, and passed distinct without private summary data', () => {
  const page = browser();
  const summary = page.context.one('[data-status-summary]') as { textContent: string };
  const metrics = page.context.one('[data-run-metrics]') as { textContent: string };
  page.context.run = { ...saved, state: 'running', diagnostics: ['private output'], caseIds: ['alpha', 'beta', 'gamma'],
    finishedAt: undefined, cases: [
      { caseId: 'alpha', state: 'incomplete', attempts: [{ outcome: 'incomplete' }] },
      { caseId: 'beta', state: 'not-run', attempts: [] },
      { caseId: 'gamma', state: 'completed', attempts: [{ outcome: 'passed' }] },
    ] } as never;
  page.api.renderWorkspace();
  assert.match(summary.textContent, /1 passed · 0 failed · 2 not finished/);
  assert.match(page.list.innerHTML, /Gamma case/);
  assert.doesNotMatch(page.list.innerHTML, /Alpha case|Beta case/);
  assert.doesNotMatch(summary.textContent + page.list.innerHTML + metrics.textContent, /private output/);
  page.context.run = { ...saved, state: 'interrupted', finishedAt: undefined, caseIds: ['alpha', 'beta', 'gamma'],
    cases: [{ caseId: 'alpha', state: 'incomplete', attempts: [{ outcome: 'incomplete' }] }] } as never;
  page.api.renderWorkspace();
  assert.match(summary.textContent, /3 not finished/);
  assert.equal(page.list.innerHTML, '');
  assert.match(page.empty.textContent, /3 not finished/);
  assert.equal(metrics.textContent, '');
});
test('filtered rows preserve saved outcomes and close inspectable detail without unearned assistance', async () => {
  const page = browser();
  page.context.run = { ...saved, testedModel: 'legacy-model', judgeModel: null, caseIds: ['alpha', 'beta'], cases: [
    { caseId: 'alpha', state: 'completed', testedModel: 'chosen-model', judgeModel: 'chosen-judge', attempts: [{ number: 1, outcome: 'failed' }] },
  ] } as never;
  page.context.selectedRunId = 'run'; page.context.latestKnownRunId = 'run';
  const evidence = { outcome: 'failed', output: 'private raw', assertions: [], turns: [], tools: [], diagnostics: [] };
  page.context.json = async () => ({ status: 'ok', value: { evidenceStatus: 'available', evidence } });
  page.api.renderWorkspace();
  assert.match(page.list.innerHTML, /data-case-id="alpha"/);
  assert.doesNotMatch(page.list.innerHTML, /data-case-id="beta"/);
  assert.match(page.list.innerHTML, /Status: <\/span>Fail/);
  assert.match(page.list.innerHTML, /Model: <\/span>chosen-model/);
  assert.match(page.list.innerHTML, /Judge model: <\/span>chosen-judge/);
  assert.doesNotMatch(page.list.innerHTML, /private raw/);
  assert.doesNotMatch((page.context.one('[data-run-metrics]') as { textContent: string }).textContent, /Model:/);
  page.edit('beta', 4);
  assert.equal(page.count.textContent, '0');
  assert.match((page.context.one('[data-status-summary]') as { textContent: string }).textContent, /1 failed · 1 not finished/);
  page.edit('', 0);
  await page.api.inspectCase('alpha', 1);
  const detail = page.context.one('[data-detail]') as { innerHTML: string; hidden: boolean };
  assert.equal(detail.hidden, false);
  assert.match(detail.innerHTML, /Review handoff unavailable for this older run/);
  assert.doesNotMatch(detail.innerHTML, /All checks|Bounded raw response|private raw/);
  assert.doesNotMatch(detail.innerHTML, /data-repair-host|Analyze failure/);
  page.context.matchMedia = () => ({ matches: true });
  await page.api.inspectCase('alpha', 1); assert.equal(page.sheet.isOpen(), true);
  page.edit('beta', 4);
  assert.equal(page.sheet.isOpen(), false); assert.equal(page.sheet.closes(), 1);
  assert.equal(detail.hidden, true); assert.doesNotMatch(detail.innerHTML, /Analyze failure/);
  assert.equal(page.list.innerHTML, ''); assert.doesNotMatch(page.list.innerHTML, /Alpha case/);
});

test('legacy run-wide model labels remain readable for completed historical cases', () => {
  const page = browser();
  page.context.run = { ...saved, testedModel: 'legacy-tested', judgeModel: 'legacy-judge' } as never;
  page.api.renderWorkspace();
  assert.match(page.list.innerHTML, /Model: <\/span>legacy-tested/);
  assert.match(page.list.innerHTML, /Judge model: <\/span>legacy-judge/);
});

test('failures-only filter keeps the completed-case list and restores inspectable rows', () => {
  const page = browser();
  page.context.run = { ...completedRun, cases: completedRun.cases.map(item => item.caseId === 'beta'
    ? { ...item, attempts: [{ number: 1, outcome: 'failed' }] } : item) } as never;
  page.api.renderWorkspace();
  page.filterFailures(true);
  assert.equal(page.count.textContent, '1');
  assert.match(page.list.innerHTML, /data-action="case" data-case-id="beta"/);
  assert.doesNotMatch(page.list.innerHTML, /Alpha case|Gamma case/);
  page.filterFailures(false);
  assert.equal(page.count.textContent, '3');
  assert.match(page.list.innerHTML, /Alpha case|Gamma case/);
});

test('polling refresh preserves the exact focused input, query and selection', async () => {
  const page = browser();
  page.api.renderWorkspace();
  page.input.focus();
  page.edit('BeTa', 1, 3);
  page.context.selectedRunId = 'run';
  page.context.latestKnownRunId = 'run';
  const input = page.input, section = page.section;
  const poll = page.api.pollRun();
  page.resolvePoll()?.({ status: 'ok', value: { summary: {
    runId: 'run', state: 'completed', caseIds: ['beta'], createdAt: 1, finishedAt: 2, cost: null,
    cases: [{ caseId: 'beta', state: 'completed', attempts: [{ outcome: 'passed' }] }],
  } } });
  await poll;
  assert.equal(page.input, input);
  assert.equal(page.results.querySelector('.results'), section);
  assert.equal(page.document.activeElement, input);
  assert.equal(page.input.value, 'BeTa');
  assert.equal(page.input.selectionStart, 1);
  assert.equal(page.input.selectionEnd, 3);
  assert.equal(page.count.textContent, '1');
  assert.match(page.list.innerHTML, /Beta case/);
  assert.doesNotMatch(page.list.innerHTML, /Alpha case|Gamma case/);
  assert.equal(page.replacements(), 0);
});
