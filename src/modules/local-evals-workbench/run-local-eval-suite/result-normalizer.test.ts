import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeEvalRunOutcome } from './result-normalizer.js';

const suite = {
  id: 'skill-authoring',
  name: 'Skill authoring checks',
  modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
  testCases: [{ id: 'case-1', name: 'Case 1' }, { id: 'case-2', name: 'Case 2' }, { id: 'case-3', name: 'Case 3' }, { id: 'case-4', name: 'Case 4' }],
};
const model = suite.modelOptions[0]!;

describe('normalizeEvalRunOutcome', () => {
  it('normalizes passed, failed, blocked, and error cells with aggregate counts', () => {
    const matrix = normalizeEvalRunOutcome({
      suite,
      evalRunModel: model,
      scope: { type: 'all' },
      selectedTestCases: suite.testCases,
      outcome: { status: 'completed', cells: [
        { testCaseId: 'case-1', status: 'passed', assertions: [{ id: 'a1', label: 'A1', status: 'passed' }], output: 'pass output' },
        { testCaseId: 'case-2', status: 'failed', assertions: [{ id: 'a2', label: 'A2', status: 'failed', actual: 'actual raw value', expected: 'expected value' }] },
        { testCaseId: 'case-3', status: 'blocked', diagnostics: [{ code: 'blocked', severity: 'warning', message: 'Missing config' }] },
        { testCaseId: 'case-4', status: 'error', diagnostics: [{ code: 'error', severity: 'error', message: 'Boom' }] },
      ] },
    });

    assert.equal(matrix.status, 'error');
    assert.deepEqual(matrix.aggregates, { total: 4, passed: 1, failed: 1, blocked: 1, error: 1 });
    assert.equal(matrix.rows[1]?.cells[0]?.assertions[0]?.actualPreview, 'actual raw value');
    assert.equal(matrix.rows[2]?.cells[0]?.diagnostics[0]?.code, 'blocked');
  });

  it('returns one merge-ready row for test-case scope', () => {
    const matrix = normalizeEvalRunOutcome({
      suite,
      evalRunModel: model,
      scope: { type: 'test_case', testCaseId: 'case-2' },
      selectedTestCases: [suite.testCases[1]!],
      outcome: { status: 'completed', cells: [{ testCaseId: 'case-2', status: 'passed' }] },
    });

    assert.equal(matrix.rows.length, 1);
    assert.equal(matrix.rows[0]?.testCaseId, 'case-2');
    assert.equal(matrix.aggregates.total, 1);
  });

  it('preserves diagnostics, metrics, artifacts, and bounded previews without optional-field crashes', () => {
    const rawOutput = 'x'.repeat(400);
    const matrix = normalizeEvalRunOutcome({
      suite,
      evalRunModel: model,
      scope: { type: 'test_case', testCaseId: 'case-1' },
      selectedTestCases: [suite.testCases[0]!],
      outcome: { status: 'completed', diagnostics: [{ code: 'suite-note', severity: 'info', message: 'Note' }], cells: [{
        testCaseId: 'case-1',
        status: 'passed',
        output: rawOutput,
        metrics: [{ name: 'latency', value: 10, unit: 'ms' }],
        artifacts: [{ id: 'artifact-1', label: 'Trace', kind: 'trace', preview: rawOutput, reference: 'artifact://trace' }],
      }] },
    });

    const cell = matrix.rows[0]!.cells[0]!;
    assert.equal(matrix.diagnostics[0]?.code, 'suite-note');
    assert.equal(cell.metrics[0]?.name, 'latency');
    assert.equal(cell.artifacts[0]?.reference, 'artifact://trace');
    assert.equal((cell.outputPreview ?? '').length <= 240, true);
    assert.equal((cell.artifacts[0]?.preview ?? '').length <= 160, true);
  });
});
