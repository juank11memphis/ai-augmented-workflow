import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOutputAssertions } from './output-assertions.js';
import type { DeterministicAssertion } from '../discover-conventional-eval-suites/index.js';
import type { AttemptSnapshot } from '../execute-eval-run/ports.js';

const snapshot: AttemptSnapshot = { output: 'verified', turns: [
  { id: 'turn-1', role: 'assistant', content: 'checking' }, { id: 'turn-2', role: 'assistant', content: 'verified' }],
  tools: [
    { id: 'tool-1', name: 'lookup', arguments: '{"id":1}', result: '{"found":true}', turnId: 'turn-1', position: 0, outcome: 'result' },
    { id: 'tool-2', name: 'verify', arguments: '{"id":1}', result: '{"ok":true}', turnId: 'turn-2', position: 1, outcome: 'result' },
  ] };
const checks: DeterministicAssertion[] = [
  { id: 'called', type: 'tool-called', tool: 'lookup' },
  { id: 'absent', type: 'tool-not-called', tool: 'delete' },
  { id: 'equal', type: 'tool-arguments-equal', tool: 'lookup', expected: { id: 1 } },
  { id: 'schema', type: 'tool-arguments-schema', tool: 'verify', schema: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } } },
  { id: 'order', type: 'tool-call-sequence', tools: ['lookup', 'verify'] },
  { id: 'turns', type: 'turn-count', expected: 2 },
  { id: 'turn-output', type: 'turn-output', turnIndex: 1, operator: 'contains', expected: 'verified' },
];

test('all standard tool and turn checks grade normalized evidence', () => {
  const result = evaluateOutputAssertions(checks, snapshot);
  assert.deepEqual(result.map(item => item.outcome), checks.map(() => 'passed'));
  assert.deepEqual(result.find(item => item.id === 'order')?.toolIds, ['tool-1', 'tool-2']);
  assert.deepEqual(result.find(item => item.id === 'turn-output')?.turnIds, ['turn-2']);
});

test('tool-order fault injection: swap, omission, duplication, insertion all fail', () => {
  const order = checks.filter(item => item.id === 'order');
  const variants = [
    [snapshot.tools[1]!, snapshot.tools[0]!],
    [snapshot.tools[0]!],
    [snapshot.tools[0]!, snapshot.tools[1]!, snapshot.tools[1]!],
    [snapshot.tools[0]!, { ...snapshot.tools[0]!, id: 'extra', name: 'unexpected' }, snapshot.tools[1]!],
  ];
  for (const tools of variants) assert.equal(evaluateOutputAssertions(order, { ...snapshot, tools })[0]?.outcome, 'failed');
});

test('missing, extra, duplicate, malformed, and unsupported evidence fails closed', () => {
  const missing = { ...snapshot, turns: [snapshot.turns[0]!] };
  assert.equal(evaluateOutputAssertions(checks.filter(item => item.id === 'turn-output'), missing)[0]?.outcome, 'failed');
  assert.equal(evaluateOutputAssertions([{ id: 'x', type: 'tool-not-called', tool: 'lookup' }], snapshot)[0]?.outcome, 'failed');
  assert.equal(evaluateOutputAssertions([{ id: 'x', type: 'tool-arguments-equal', tool: 'lookup', expected: { id: 1 } }],
    { ...snapshot, tools: [...snapshot.tools, { ...snapshot.tools[0]!, id: 'duplicate', arguments: '{"id":2}' }] })[0]?.outcome, 'failed');
  assert.equal(evaluateOutputAssertions([{ id: 'x', type: 'tool-arguments-equal', tool: 'lookup', expected: { id: 1 } }],
    { ...snapshot, tools: [{ ...snapshot.tools[0]!, arguments: '{invalid' }] })[0]?.outcome, 'failed');
  assert.deepEqual(evaluateOutputAssertions([{ id: 'x', type: 'tool-arguments-schema', tool: 'lookup', schema: { pattern: '.*' } }], snapshot)[0]?.diagnostics, ['unsupported-schema']);
});
