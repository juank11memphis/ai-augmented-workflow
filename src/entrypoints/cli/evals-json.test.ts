import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { handleEvalsJsonCommand } from './evals-json.js';

type Dependencies = NonNullable<Parameters<typeof handleEvalsJsonCommand>[1]>;
type Command = Parameters<typeof handleEvalsJsonCommand>[0];

async function invoke(command: Command, result: unknown) {
  const lines: string[] = [];
  const calls: { operation: string; command?: unknown }[] = [];
  let exitCode = 0;
  const workbench = {
    discover: () => { calls.push({ operation: 'suites' }); return result; },
    describe: async (input: unknown) => { calls.push({ operation: 'describe', command: input }); return result; },
    run: async (input: unknown) => { calls.push({ operation: 'run', command: input }); return result; },
    changeChoice: async (input: unknown) => { calls.push({ operation: 'choice', command: input }); return result; },
    result: async (input: unknown) => { calls.push({ operation: 'result', command: input }); return result; },
  } as Awaited<ReturnType<Dependencies['create']>>;
  await handleEvalsJsonCommand(command, {
    root: '/fixture', create: async (root) => { assert.equal(root, '/fixture'); return workbench; },
    output: { write: (line) => lines.push(line), setExitCode: (code) => { exitCode = code; } },
  });
  assert.equal(lines.length, 1);
  return { json: JSON.parse(lines[0]!) as Record<string, unknown>, calls, exitCode };
}

describe('evals JSON CLI adapter', () => {
  it('maps all four operations to the public workbench and emits one parseable result', async () => {
    const suites = await invoke({ type: 'evals:suites' }, { status: 'ready', suites: [], diagnostics: [] });
    assert.deepEqual(suites.calls, [{ operation: 'suites' }]);
    assert.equal(suites.json.schemaVersion, 1);
    assert.equal(suites.json.operation, 'suites');
    assert.equal(suites.exitCode, 0);

    const described = await invoke({ type: 'evals:describe', suiteId: 'suite-1', caseId: 'case-1' }, { status: 'ready', suiteId: 'suite-1', models: ['m'], judgeModels: [], rubricRequired: false, rubricCaseIds: [] });
    assert.deepEqual(described.calls, [{ operation: 'describe', command: { suiteId: 'suite-1', caseId: 'case-1' } }]);
    assert.equal(described.json.status, 'ready');

    const run = await invoke({ type: 'evals:run', suiteId: 'suite-1', scope: { type: 'test_case', testCaseId: 'case-1' }, model: 'm', judgeModel: 'j' }, { status: 'completed', runId: 'run-1', outcome: 'passed', cases: [] });
    assert.deepEqual(run.calls, [{ operation: 'run', command: { suiteId: 'suite-1', scope: { type: 'test_case', testCaseId: 'case-1' }, model: 'm', judgeModel: 'j' } }]);
    assert.equal(run.json.runId, 'run-1');
    assert.equal(run.exitCode, 0);

    const evidence = { status: 'ready', summary: { suiteId: 'suite-1', runId: 'run-1', state: 'completed', outcome: 'failed' }, failure: { caseId: 'case-1', attempt: 1, assertionId: 'a-1', actual: 'bounded', expected: 'x', truncated: false } };
    const selected = await invoke({ type: 'evals:result', suiteId: 'suite-1', runId: 'run-1', caseId: 'case-1', assertionId: 'a-1' }, evidence);
    assert.deepEqual(selected.calls, [{ operation: 'result', command: { suiteId: 'suite-1', runId: 'run-1', selection: { caseId: 'case-1', attempt: 1, assertionId: 'a-1' } } }]);
    assert.deepEqual(selected.json.failure, evidence.failure);
    assert.equal(selected.exitCode, 0);
  });

  it('blocks malformed IDs, incomplete selection, and missing evaluation model before composition', async () => {
    const commands: Command[] = [
      { type: 'evals:describe', suiteId: '../bad' },
      { type: 'evals:describe', suiteId: 'suite', caseId: '../bad' },
      { type: 'evals:choice', suiteId: 'suite', caseId: '../bad', role: 'tested', action: 'reset', expectedToken: 'a'.repeat(64) },
      { type: 'evals:run', suiteId: 'suite', scope: { type: 'all' }, model: '' },
      { type: 'evals:run', suiteId: 'suite', scope: { type: 'test_case', testCaseId: '../bad' }, model: 'm' },
      { type: 'evals:result', suiteId: 'suite', runId: '../bad' },
      { type: 'evals:result', suiteId: 'suite', runId: 'run', caseId: 'case' },
    ];
    for (const command of commands) {
      const response = await invoke(command, { status: 'ready' });
      assert.equal(response.json.status, 'blocked');
      assert.equal(response.calls.length, 0);
      assert.equal(response.exitCode, 1);
    }
  });

  it('omits run-wide model for saved defaults and preserves typed recovery blocks', async () => {
    const run = await invoke({ type: 'evals:run', suiteId: 'suite', scope: { type: 'all' } },
      { status: 'blocked', reason: 'missing-suite-default', caseId: 'case', role: 'tested' });
    assert.deepEqual(run.calls, [{ operation: 'run', command: { suiteId: 'suite', scope: { type: 'all' } } }]);
    assert.equal(run.json.caseId, 'case'); assert.equal(run.json.role, 'tested');
    assert.match(String(run.json.nextAction), /Set the suite tested default/);
    const unavailable = await invoke({ type: 'evals:run', suiteId: 'suite', scope: { type: 'all' } },
      { status: 'blocked', reason: 'saved-model-unavailable', caseId: 'case', role: 'judge', source: 'case-override' });
    assert.equal(unavailable.json.source, 'case-override');
    assert.match(String(unavailable.json.nextAction), /Case case, judge: Replace.*--case case --set, or Inherit.*--case case --reset/);
    assert.equal(unavailable.calls.some(call => call.operation === 'choice'), false);
    const temporary = await invoke({ type: 'evals:run', suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' }, model: 'temporary' },
      { status: 'completed', outcome: 'passed', runId: 'run', cases: [] });
    assert.equal(temporary.exitCode, 0);
    assert.deepEqual(temporary.calls[0]?.command, { suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' }, model: 'temporary' });
    assert.equal(temporary.calls.some(call => call.operation === 'choice'), false);
    const rejected = await invoke({ type: 'evals:run', suiteId: 'suite', scope: { type: 'all' }, model: 'temporary' },
      { status: 'blocked', reason: 'run-only-scope-unsupported' });
    assert.match(String(rejected.json.nextAction), /Remove the run-only model flags/);
  });

  it('sends explicit saved set and reset only through the choice operation', async () => {
    const expectedToken = 'a'.repeat(64);
    const set = await invoke({ type: 'evals:choice', suiteId: 'suite', role: 'tested', action: 'set', modelId: 'model', expectedToken },
      { status: 'saved', suiteId: 'suite', role: 'tested', modelId: 'model', token: 'b'.repeat(64) });
    assert.equal(set.exitCode, 0);
    assert.deepEqual(set.calls, [{ operation: 'choice', command: { suiteId: 'suite', role: 'tested', action: 'set', modelId: 'model', expectedToken } }]);
    const reset = await invoke({ type: 'evals:choice', suiteId: 'suite', role: 'judge', action: 'reset', expectedToken },
      { status: 'saved', suiteId: 'suite', role: 'judge', modelId: null, token: 'b'.repeat(64) });
    assert.deepEqual(reset.calls[0]?.command, { suiteId: 'suite', role: 'judge', action: 'reset', expectedToken });
    const caseSet = await invoke({ type: 'evals:choice', suiteId: 'suite', caseId: 'one', role: 'tested', action: 'set', modelId: 'model', expectedToken },
      { status: 'saved', suiteId: 'suite', caseId: 'one', role: 'tested', modelId: 'model', token: 'b'.repeat(64) });
    assert.deepEqual(caseSet.calls[0]?.command, { suiteId: 'suite', caseId: 'one', role: 'tested', action: 'set', modelId: 'model', expectedToken });
    const caseReset = await invoke({ type: 'evals:choice', suiteId: 'suite', caseId: 'one', role: 'tested', action: 'reset', expectedToken },
      { status: 'saved', suiteId: 'suite', caseId: 'one', role: 'tested', modelId: null, token: 'b'.repeat(64) });
    assert.deepEqual(caseReset.calls[0]?.command, { suiteId: 'suite', caseId: 'one', role: 'tested', action: 'reset', expectedToken });
    const conflict = await invoke({ type: 'evals:choice', suiteId: 'suite', role: 'tested', action: 'set', modelId: 'model', expectedToken },
      { status: 'conflict', reason: 'suite-changed' });
    assert.equal(conflict.exitCode, 1); assert.match(String(conflict.json.nextAction), /Describe the suite again/);
  });

  it('preserves semantic judge blocks and terminal, partial, interrupted, and error outcomes', async () => {
    const run: Command = { type: 'evals:run', suiteId: 'suite', scope: { type: 'all' }, model: 'm' };
    for (const result of [
      { status: 'blocked', reason: 'judge-unavailable' },
      { status: 'completed', outcome: 'failed', runId: 'run' },
      { status: 'partial', outcome: 'incomplete', runId: 'run' },
      { status: 'interrupted', runId: 'run' },
      { status: 'error', reason: 'runner-exited', runId: 'run' },
      { status: 'running', runId: 'run' },
    ]) {
      const response = await invoke(run, result);
      assert.equal(response.json.status, result.status);
      assert.equal(response.exitCode, 1);
    }
  });

  it('passes ordered failed-assertion locators through run and unselected result JSON', async () => {
    const attempts = [{ number: 1, outcome: 'failed', failedAssertionIds: ['first', 'second'], locatorStatus: 'available' }];
    const cases = [{ caseId: 'case', state: 'completed', testedModel: 'model-x', judgeModel: null, attempts }];
    const run = await invoke({ type: 'evals:run', suiteId: 'suite', scope: { type: 'all' }, model: 'm' },
      { status: 'completed', runId: 'run', outcome: 'failed', cases });
    const result = await invoke({ type: 'evals:result', suiteId: 'suite', runId: 'run' },
      { status: 'ready', summary: { suiteId: 'suite', runId: 'run', state: 'completed', cases } });
    assert.deepEqual(run.json.cases, cases);
    assert.deepEqual((result.json.summary as { cases: unknown }).cases, cases);
    assert.equal((run.json.cases as typeof cases)[0]?.testedModel, 'model-x');
    assert.doesNotMatch(JSON.stringify(run.json) + JSON.stringify(result.json), /actual|expected|output|turns|tools/);
  });

  it('prints only one JSON result from the compiled headless command without launching the browser server', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-evals-json-'));
    try {
      const run = spawnSync(process.execPath, [path.resolve('bin/sibu.js'), 'evals', 'suites'], { cwd: root, encoding: 'utf8' });
      assert.equal(run.status, 1);
      const lines = run.stdout.trim().split('\n');
      assert.equal(lines.length, 1);
      const result = JSON.parse(lines[0]!) as Record<string, unknown>;
      assert.equal(result.operation, 'suites');
      assert.equal(result.status, 'blocked');
      assert.doesNotMatch(run.stdout + run.stderr, /URL: http|workbench is running/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
