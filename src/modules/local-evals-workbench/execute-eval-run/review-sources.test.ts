import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewSources } from './review-sources.js';
import type { ExecuteEvalRunCommand } from './command.js';

test('review sources point a repo-aware LLM to the suite, target, runner, and declared case inputs', () => {
  const command: ExecuteEvalRunCommand = { runId: 'run', model: 'model', suitePath: 'evals/suite.json',
    suite: { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Suite',
      target: { id: 'target', kind: 'integration', path: 'src/target.ts' },
      coverage: { categories: [], gaps: [] }, runner: { command: ['node', './evals/runner.mjs'], requiredEnvironment: [] },
      testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'file', path: 'inputs/question.md' } }],
        fixture: { type: 'file', path: 'evals/fixtures/context.json' }, reference: { type: 'file', path: 'refs/expected.md' },
        toolMocks: [], assertions: [{ id: 'match', type: 'output-equals', expected: { type: 'file', path: 'refs/expected.md' } }],
        graders: [{ id: 'quality', type: 'rubric', rubric: { type: 'file', path: 'rubrics/quality.md' }, threshold: 0.7 }] }] },
    cases: [] };
  assert.deepEqual(reviewSources(command, 'case'), { runPath: 'evals/artifacts/suite/run/run.json', suitePath: 'evals/suite.json', targetPath: 'src/target.ts',
    runnerPath: 'evals/runner.mjs', inputPaths: ['evals/inputs/question.md', 'evals/fixtures/context.json',
      'evals/refs/expected.md', 'evals/rubrics/quality.md'], omittedInputPathCount: 0, context: 'current-repo-files' });
});
