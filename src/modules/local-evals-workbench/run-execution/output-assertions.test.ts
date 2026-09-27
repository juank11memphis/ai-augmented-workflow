import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOutputAssertions } from './output-assertions.js';

const snapshot = (output: string, turnId = 't') => ({ output, turns: [{ id: turnId, role: 'assistant' as const, content: output }], tools: [] });

test('output checks use complete unmodified output before shortening previews', () => {
  const output = 'A'.repeat(600) + '✓';
  const results = evaluateOutputAssertions([
    { id: 'equal', type: 'output-equals', expected: { type: 'inline', text: output } },
    { id: 'contains', type: 'output-contains', expected: '✓' },
    { id: 'case', type: 'output-contains', expected: 'a' },
  ], snapshot(output, 'turn-1'));
  assert.deepEqual(results.map(item => item.outcome), ['passed', 'passed', 'failed']);
  assert.match(results[0]!.actual, /preview shortened/);
  assert.deepEqual(results[0]!.turnIds, ['turn-1']);
});

test('JSON Schema checks distinguish malformed output and invalid schemas', () => {
  const schema = { type: 'object', required: ['nested'], properties: { nested: { type: 'integer' } } } as const;
  const assertion = [{ id: 'json', type: 'json-schema' as const, schema }];
  assert.equal(evaluateOutputAssertions(assertion, snapshot('{"nested":2}'))[0]!.outcome, 'passed');
  assert.equal(evaluateOutputAssertions(assertion, snapshot('{"nested":"2"}'))[0]!.outcome, 'failed');
  assert.deepEqual(evaluateOutputAssertions(assertion, snapshot('broken'))[0]!.diagnostics, ['output-not-json']);
  assert.deepEqual(evaluateOutputAssertions([{ id: 'external', type: 'json-schema', schema: { $ref: 'https://example.com/schema' } }], snapshot('{}'))[0]!.diagnostics, ['unsupported-schema']);
});
test('unresolved expected content cannot pass an empty output', () => {
  const result = evaluateOutputAssertions([{ id: 'reference', type: 'output-equals', expected: { type: 'file', path: 'evals/reference.txt' } }], snapshot('', 'turn-1'));
  assert.equal(result[0]?.outcome, 'failed');
  assert.deepEqual(result[0]?.diagnostics, ['unresolved-reference']);
});
